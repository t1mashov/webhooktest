require("dotenv").config();

const express = require("express");
const admin = require("firebase-admin");
const db = require("./db");

const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
app.use(express.json());


/**
 * Сюда будет стучаться внешний сервис
 */
app.post("/webhooks/chat-message", (req, res) => {
  console.log("========== WEBHOOK ==========");
  console.log("TIME:", new Date().toISOString());
  console.log("BODY:", req.body);
  console.log("=============================");

  const { event, id_ticket } = req.body;

  if (event === "created") {
    return handleTicketCreated(req, res);
  }

  if (event === "response") {
    return handleTicketResponse(req, res);
  }

  res.json({
    ok: true,
    ignored: true,
    reason: "Unknown event",
    event,
  });
});


/**
 * Сюда из мобилки кидать данные chat_id и token
 */
app.post("/api/register-mobile", async (req, res) => {
  try {
    console.log("REGISTER MOBILE:", req.body);

    const result = await db.registerMobile(req.body);

    res.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error("REGISTER MOBILE ERROR:", error);

    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});



async function handleTicketCreated(req, res) {
  try {
    const { id_ticket, mobile_data } = req.body;

    const parsedMobileData =
      typeof mobile_data === "string"
        ? JSON.parse(mobile_data)
        : mobile_data;

    const id_chat = parsedMobileData.chat_id;

    console.log("CREATED EVENT:", {
      id_ticket,
      id_chat,
    });

    const result = await db.upsertTicketByChatId({
      id_chat,
      id_ticket,
    });

    res.json({
      ok: true,
      event: "created",
      ...result,
    });
  } catch (error) {
    console.error("CREATED EVENT ERROR:", error);

    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
}


async function handleTicketResponse(req, res) {
  try {
    const { id_ticket, answer_last } = req.body;

    console.log("RESPONSE EVENT:", {
      id_ticket,
      answer_last,
    });

    const user = await db.findUserByTicketId(id_ticket);

    if (!user) {
      return res.status(404).json({
        ok: false,
        error: "User not found by id_ticket",
        id_ticket,
      });
    }

    const message = {
      token: user.token,
      notification: {
        title: "Новый ответ",
        body: answer_last || "Вам пришёл новый ответ",
      },
      data: {
        id_ticket: String(id_ticket),
        id_chat: String(user.id_chat),
        answer_last: String(answer_last || ""),
      },
      android: {
        priority: "high",
      },
    };

    const response = await admin.messaging().send(message);

    console.log("FCM SENT:", response);

    res.json({
      ok: true,
      event: "response",
      fcmMessageId: response,
    });
  } catch (error) {
    console.error("RESPONSE EVENT ERROR:", error);

    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
}



app.get("/health", (req, res) => {
  res.json({ ok: true });
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});