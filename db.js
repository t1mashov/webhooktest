const Database = require("better-sqlite3");

const db = new Database("./database.sqlite");

db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_chat TEXT UNIQUE,
    id_ticket TEXT,
    email TEXT,
    token TEXT
  );
`).run();

function registerMobile({ id_chat, email, token }) {
  const stmt = db.prepare(`
    INSERT INTO users (id_chat, email, token)
    VALUES (?, ?, ?)
    ON CONFLICT(id_chat)
    DO UPDATE SET
      email = COALESCE(excluded.email, users.email),
      token = COALESCE(excluded.token, users.token)
  `);

  const result = stmt.run(id_chat, email, token);

  return {
    id_chat,
    changes: result.changes,
  };
}

function upsertTicketByChatId({ id_chat, id_ticket }) {
  const stmt = db.prepare(`
    INSERT INTO users (id_chat, id_ticket)
    VALUES (?, ?)
    ON CONFLICT(id_chat)
    DO UPDATE SET
      id_ticket = COALESCE(excluded.id_ticket, users.id_ticket)
  `);

  const result = stmt.run(id_chat, id_ticket);

  return {
    id_chat,
    id_ticket,
    changes: result.changes,
  };
}

function findUserByTicketId(id_ticket) {
  return db
    .prepare(`SELECT * FROM users WHERE id_ticket = ?`)
    .get(id_ticket) || null;
}

function findUserByChatId(id_chat) {
  return db
    .prepare(`SELECT * FROM users WHERE id_chat = ?`)
    .get(id_chat) || null;
}

module.exports = {
  registerMobile,
  upsertTicketByChatId,
  findUserByTicketId,
  findUserByChatId,
};