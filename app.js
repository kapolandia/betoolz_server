const express = require("express");
const stripe = require("stripe")(
  "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"
  );
const cors = require("cors");
  const allowedOrigins = [
    // "https://freelance-app-nu.vercel.app",
    "https://betoolz.vercel.app",
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
        "pk_live_51O4vmXDDGGxf05cwbUVbshzCcKVFJtXV8aFLATmwyyZX5FTAU82h3cnu5yX2uxRWkZjaPwgfPnBRenZ5JEN1rPHl00xH02Q0rd"
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

app.get("/api/get-session/:customerId", async (req, res) => {
  try {
    // const sessionId = req.params.sessionId;
    const customerId = req.params.customerId;

    // Retrieve the session from Stripe
    // const session = await stripe.checkout.sessions.retrieve(sessionId);
    const customer = await stripe.customers.retrieve(customerId);
    // console.log(customer, "customer");
    stripe.subscriptions.list(
      { customer: customer.id },
      (err, subscriptions) => {
        if (err) {
          console.error(err);
        } else {
          // Handle the list of subscriptions
          // console.log(subscriptions, "subscriptions");
          res.json(subscriptions.data);
        }
      }
    );
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error retrieving session" });
  }
});

async function getCustomerByEmail(email) {
  const customers = await stripe.customers.list({
    email: email,
    limit: 1,
  });

  return customers.data.length > 0 ? customers.data[0] : null;
}

app.post("/api/create-checkout-session", async (req, res) => {
  try {
    const { price, baseUrl, userEmail } = req.body;
    const YOUR_DOMAIN =
    baseUrl == "https://betoolz.it"
      ? "https://betoolz.it"  // Use betoolz.it as the base URL
      : "https://betoolz.vercel.app";

    let customer = await getCustomerByEmail(userEmail);

    if (!customer) {
      // If customer doesn't exist, create a new customer
      customer = await stripe.customers.create({
        email: userEmail,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: price,
          quantity: 1,
        },
      ],
      mode: "subscription",
      customer: customer.id,
      success_url: `https://betoolz.it/landing.html`,
      cancel_url: `https://betoolz.it/freelanding.html`,
      allow_promotion_codes: true,

    });

    res.json({
      sessionId: session.id,
      success: true,
      customerId: customer.id,
    });
  } catch (error) {
    res.status(500).json({ error: "Error creating checkout session" });
  }
});

app.post("/api/cancel-subscription", async (req, res) => {
  try {
    const { subscriptionId, userId, deadline } = req.body;

    // Calculate the deadline (e.g., 3 days before the next billing cycle)
    // One month from now

    // Cancel the subscription at the end of the current period
    stripe.subscriptions.update(
      subscriptionId,
      {
        cancel_at_period_end: true,
      },
      (error, updatedSubscription) => {
        if (error) {
          console.error("Error canceling subscription:", error);
        } else {
          console.log(
            "Subscription canceled at period end:",
            updatedSubscription
          );
        }
      }
    );

    // You may want to update your database with the cancellation status and deadline
    // For example, save 'canceledSubscription.status' and 'canceledSubscription.cancel_at'

    res.json({ success: true, deadline });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error canceling subscription" });
  }
});

app.listen(5000, () => {
  console.log("Server is running on port 5000");
});
