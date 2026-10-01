-- 2026-10-01: 多项目统一管理平台（只执行一次）

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO projects (id, name, created_at) VALUES
  ('vocab_full', '背单词完整版', strftime('%s','now') * 1000),
  ('lottery_full', '彩票完整版', strftime('%s','now') * 1000);

ALTER TABLE codes ADD COLUMN project_id TEXT NOT NULL DEFAULT 'vocab_full';
ALTER TABLE bindings ADD COLUMN project_id TEXT NOT NULL DEFAULT 'vocab_full';
ALTER TABLE orders ADD COLUMN project_id TEXT NOT NULL DEFAULT 'vocab_full';

CREATE INDEX IF NOT EXISTS idx_codes_project_status ON codes(project_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_project_status ON orders(project_id, status, created_at);
