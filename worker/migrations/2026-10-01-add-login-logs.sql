-- 登录日志表（只读审计）
CREATE TABLE IF NOT EXISTS login_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  time INTEGER NOT NULL,
  ip TEXT NOT NULL,
  country TEXT,
  city TEXT,
  username TEXT NOT NULL,
  success INTEGER NOT NULL DEFAULT 0,
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_login_logs_time ON login_logs(time DESC);
