require("dotenv").config();

const express = require("express");
const admin = require("firebase-admin");

const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
app.use(express.json());

// временное хранилище токенов
// в production заменить на БД
const userTokens = new Map();

/**
 * Android app вызывает это, чтобы сохранить FCM token
 */
app.post("/api/register-token", (req, res) => {
  const { userId, token } = req.body;

  if (!userId || !token) {
    return res.status(400).json({ error: "userId and token are required" });
  }

  userTokens.set(userId, token);

  res.json({
    ok: true,
    message: "FCM token saved",
  });
});

/**
 * Сюда будет стучаться внешний сервис
 */
app.post("/webhooks/chat-message", (req, res) => {
  console.log("========== WEBHOOK ==========");
  console.log("TIME:", new Date().toISOString());
  console.log("HEADERS:", req.headers);
  console.log("BODY:", req.body);
  console.log("=============================");

  res.json({
    ok: true,
    received: true,
  });
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running on http://localhost:${process.env.PORT}`);
});