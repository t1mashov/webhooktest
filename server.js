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
app.all("/webhooks/chat-message", async (req, res) => {
  try {
    console.log("HEADERS:", req.headers);
    console.log("QUERY:", req.query);
    console.log("BODY:", req.body);

    res.json({
      ok: true,
      received: true,
      query: req.query,
      body: req.body,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running on http://localhost:${process.env.PORT}`);
});