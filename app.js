const express = require("express");
const stripe = require("stripe")(
  "sk_test_51KaNE3D8BZHENOaQ9K7yla6kLMtPsXp2Sy2uaq0sG81cGHMQPa0M2xOIOUYCSqYLpr2cw7citBh0Cr5MkhGXzmmg00WXagaYT0"
);
const cors = require("cors");
const allowedOrigins = [
  // "https://freelance-app-nu.vercel.app",
  "https://be-tools.vercel.app",
  "http://127.0.0.1:5500",
];
const corsOptions = {
  credentials: true,
  origin: allowedOrigins,
  methods: "GET, POST, PUT, DELETE",
  allowedHeaders: "Content-Type, Authorization, Cookie",
};
const app = express();
app.use(express.static("public"));
app.use(cors(corsOptions));
app.use(express.json());

app.get("/api/success", (req, res) => {
  res.send("Payment successful!"); // You can customize the response as needed
});

app.get("/api/cancel", (req, res) => {
  res.send("Payment not proceed."); // You can customize the response as needed
});

app.post(
  "/api/stripe-webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const sig = req.headers["stripe-signature"];

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        "sk_test_51KaNE3D8BZHENOaQ9K7yla6kLMtPsXp2Sy2uaq0sG81cGHMQPa0M2xOIOUYCSqYLpr2cw7citBh0Cr5MkhGXzmmg00WXagaYT0"
      );
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const sessionId = event.data.object.id;
      // Save payment data to Firestore here
      console.log(`Payment completed for session: ${sessionId}`);
    }

    res.json({ received: true });
  }
);

app.get("/api/get-session/:sessionId", async (req, res) => {
  try {
    const sessionId = req.params.sessionId;

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    res.json(session);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error retrieving session" });
  }
});
app.post("/api/create-checkout-session", async (req, res) => {
  try {
    const { price, baseUrl } = req.body;
    const YOUR_DOMAIN =
      baseUrl == "http://127.0.0.1:5500"
        ? "http://127.0.0.1:5500/public"
        : "https://be-tools.vercel.app";

    console.log(YOUR_DOMAIN, "sss");
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Premium Subscription",
            },
            unit_amount: price * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${YOUR_DOMAIN}/landing.html`,
      cancel_url: `${YOUR_DOMAIN}/freelanding.html`,
    });

    console.log(session, session.payment_status, "session");
    res.json({ sessionId: session.id, success: true });
  } catch (error) {
    res.status(500).json({ error: "Error creating checkout session" });
  }
});

app.listen(5000, () => {
  console.log("Server is running on port 5000");
});
