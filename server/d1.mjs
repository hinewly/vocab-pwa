// D1 兼容层：基于 better-sqlite3，复刻 Cloudflare D1 API（prepare/bind/first/all/run/batch）
// 与 daobox-home/server/d1.mjs 同源（各项目自包含副本），额外加 busy_timeout 支持多进程共库
import Database from "better-sqlite3";

export class D1Compat {
  constructor(file) {
    this.db = new Database(file);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("busy_timeout = 5000");
    this.db.pragma("foreign_keys = ON");
  }

  prepare(sql) {
    return new D1Statement(this.db, sql);
  }

  async batch(statements) {
    const results = [];
    const run = this.db.transaction(() => {
      for (const stmt of statements) {
        const info = this.db.prepare(stmt.sql).run(...stmt.params);
        results.push({ success: true, meta: { changes: info.changes, last_row_id: Number(info.lastInsertRowid) } });
      }
    });
    run();
    return results;
  }

  async exec(sql) {
    this.db.exec(sql);
    return { success: true };
  }
}

class D1Statement {
  constructor(db, sql, params = []) {
    this.db = db;
    this.sql = sql;
    this.params = params;
  }

  bind(...params) {
    return new D1Statement(this.db, this.sql, params.flat());
  }

  async first() {
    const row = this.db.prepare(this.sql).get(...this.params);
    return row === undefined ? null : row;
  }

  async all() {
    const rows = this.db.prepare(this.sql).all(...this.params);
    return { results: rows };
  }

  async run() {
    const info = this.db.prepare(this.sql).run(...this.params);
    return { success: true, meta: { changes: info.changes, last_row_id: Number(info.lastInsertRowid) } };
  }
}
