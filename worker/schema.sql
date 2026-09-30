-- 激活码表
CREATE TABLE IF NOT EXISTS codes (
  code        TEXT PRIMARY KEY,          -- 6位纯数字激活码
  claim_token TEXT UNIQUE NOT NULL,      -- 隐藏取码链接用的随机 token
  status      TEXT NOT NULL DEFAULT 'unused',  -- unused | used
  created_at  INTEGER NOT NULL,
  claimed_at  INTEGER
);

-- 绑定关系（软绑定：每码最多 3 台设备）
CREATE TABLE IF NOT EXISTS bindings (
  code      TEXT NOT NULL,
  device_id TEXT NOT NULL,
  bound_at  INTEGER NOT NULL,
  PRIMARY KEY (code, device_id)
);

-- 输错限速表（防机器穷举；真人输错等几分钟即可恢复）
CREATE TABLE IF NOT EXISTS attempts (
  key           TEXT PRIMARY KEY,        -- ip + deviceId 组合
  fails         INTEGER NOT NULL DEFAULT 0,
  blocked_until INTEGER NOT NULL DEFAULT 0,
  level         INTEGER NOT NULL DEFAULT 0
);

-- 付款登记订单（个人收款码无回调，管理员人工确认）
CREATE TABLE IF NOT EXISTS orders (
  id         TEXT PRIMARY KEY,           -- 订单号（随机短ID）
  token      TEXT UNIQUE NOT NULL,       -- 取码页访问令牌 /o/<token>
  contact    TEXT NOT NULL,              -- 用户留的联系方式（手机号/微信号）
  status     TEXT NOT NULL DEFAULT 'pending',  -- pending | paid
  code       TEXT,                       -- 确认后分配的激活码
  created_at INTEGER NOT NULL,
  paid_at    INTEGER
);
