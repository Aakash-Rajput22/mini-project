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

const prices = {
  Free: 0,
  Silver: 199,
  Gold: 499,
};

app.post("/create-order", async (req, res) => {
  const { plan } = req.body;
  const amount = prices[plan];

  if (amount === undefined) {
    return res.status(400).json({ error: "Invalid plan" });
  }

  if (amount === 0) {
    return res.json({ free: true });
  }

  try {
    const order = await razorpay.orders.create({
      amount: amount * 100,
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