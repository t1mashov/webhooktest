require("dotenv").config();

const express = require("express");
const admin = require("firebase-admin");

const serviceAccount = require("./serviceAccountKey.json");

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
app.post("/webhooks/chat-message", async (req, res) => {
  try {
    // const secret = req.headers["x-webhook-secret"];

    // if (secret !== process.env.WEBHOOK_SECRET) {
    //   return res.status(401).json({ error: "Invalid webhook secret" });
    // }

    const {
      userId,
      chatId,
      messageId,
      senderName,
      text,
    } = req.body;

    if (!userId || !chatId || !messageId) {
      return res.status(400).json({ error: "Invalid webhook payload" });
    }

    const token = userTokens.get(userId);

    if (!token) {
      return res.status(404).json({ error: "FCM token not found for user" });
    }

    const message = {
      token,
      notification: {
        title: senderName ? `Новое сообщение от ${senderName}` : "Новое сообщение",
        body: text || "Откройте чат, чтобы посмотреть сообщение",
      },
      data: {
        chatId: String(chatId),
        messageId: String(messageId),
        userId: String(userId),
      },
      android: {
        priority: "high",
      },
    };

    const response = await admin.messaging().send(message);

    res.json({
      ok: true,
      fcmMessageId: response,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running on http://localhost:${process.env.PORT}`);
});