const express = require("express");
const stripe = require("stripe")(
  "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"
);
const cors = require("cors");

const allowedOrigins = [
  // "https://freelance-app-nu.vercel.app",
  "https://be-tools.vercel.app",
  "http://127.0.0.1:5500",
  "https://betools-bbbcc.web.app",
  "https://betoolz.it",
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
  res.send("Payment successful!");
});

app.get("/api/cancel", (req, res) => {
  res.send("Payment not proceed.");
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
        "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"
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
      baseUrl == "https://betoolz.it"
        ? "https://betoolz.it"  // Use betoolz.it as the base URL
        : "https://betoolz.vercel.app";

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
            unit_amount: price * 10,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `https://betoolz.it/landing.html`,
      cancel_url: `https://betoolz.it/plan.html`,
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