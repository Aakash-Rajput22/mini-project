const express = require("express");
const Razorpay = require("razorpay");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Equipment catalog lives on the backend so prices/discounts are always
// calculated server-side — never trust an amount sent by the client.
const EQUIPMENT_PRICES = {
  bat: 1500,
  football: 800,
  racket: 1200,
  basketball: 900,
  volleyball: 700,
  tennis: 2000,
  jersey: 2500,
  kit: 600,
};

app.post("/create-order", async (req, res) => {
  const { plan, type, amount, itemId, discounted } = req.body;

  let orderAmount;

  if (type === "match_join") {
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }
    orderAmount = Math.round(amount * 100);
  } else if (type === "equipment") {
    const basePrice = EQUIPMENT_PRICES[itemId];
    if (basePrice === undefined) {
      return res.status(400).json({ error: "Invalid item" });
    }
    const finalPrice = discounted ? basePrice * 0.75 : basePrice;
    orderAmount = Math.round(finalPrice * 100);
  } else {
    const prices = { Free: 0, Silver: 199, Gold: 499 };
    orderAmount = prices[plan];
    if (orderAmount === undefined) {
      return res.status(400).json({ error: "Invalid plan" });
    }
    if (orderAmount === 0) {
      return res.json({ free: true });
    }
    orderAmount = orderAmount * 100;
  }

  try {
    const order = await razorpay.orders.create({
      amount: orderAmount,
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    });
    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/verify-payment", (req, res) => {
  const crypto = require("crypto");
  const { order_id, payment_id, signature } = req.body;
  const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(order_id + "|" + payment_id)
    .digest("hex");
  if (generatedSignature === signature) {
    res.json({ verified: true });
  } else {
    res.json({ verified: false });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});