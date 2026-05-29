const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./database.sqlite");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_chat TEXT UNIQUE,
      id_ticket TEXT,
      email TEXT,
      token TEXT
    );
  `);
});

function registerMobile({ id_chat, email, token }) {
  return new Promise((resolve, reject) => {
    db.run(
      `
        INSERT INTO users (id_chat, email, token)
        VALUES (?, ?, ?)
        ON CONFLICT(id_chat)
        DO UPDATE SET
          email = COALESCE(excluded.email, users.email),
          token = COALESCE(excluded.token, users.token)
      `,
      [id_chat, email, token],
      function (err) {
        if (err) return reject(err);

        resolve({
          id_chat,
          changes: this.changes,
        });
      }
    );
  });
}

function upsertTicketByChatId({ id_chat, id_ticket }) {
  return new Promise((resolve, reject) => {
    db.run(
      `
        INSERT INTO users (id_chat, id_ticket)
        VALUES (?, ?)
        ON CONFLICT(id_chat)
        DO UPDATE SET
          id_ticket = COALESCE(excluded.id_ticket, users.id_ticket)
      `,
      [id_chat, id_ticket],
      function (err) {
        if (err) return reject(err);

        resolve({
          id_chat,
          id_ticket,
          changes: this.changes,
        });
      }
    );
  });
}

function findUserByTicketId(id_ticket) {
  return new Promise((resolve, reject) => {
    db.get(
      `
        SELECT *
        FROM users
        WHERE id_ticket = ?
      `,
      [id_ticket],
      (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      }
    );
  });
}

function findUserByChatId(id_chat) {
  return new Promise((resolve, reject) => {
    db.get(
      `
        SELECT *
        FROM users
        WHERE id_chat = ?
      `,
      [id_chat],
      (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      }
    );
  });
}

module.exports = {
  registerMobile,
  upsertTicketByChatId,
  findUserByTicketId,
  findUserByChatId,
};