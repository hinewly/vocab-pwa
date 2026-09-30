# daobox-api — vocab-pwa 激活码后端

Cloudflare Workers + D1，负责激活码的生成、验证、设备软绑定。

## 首次部署（只需做一次）

```bash
cd worker
npm install
npx wrangler login          # 会打开浏览器授权
npx wrangler d1 create daobox-db
# ↑ 命令会输出 database_id，复制到 wrangler.toml 里替换 TODO_填入创建后的ID

# 改 wrangler.toml 里的 ADMIN_KEY 为一串长随机字符（比如 32 位以上）

npx wrangler d1 execute daobox-db --remote --file=./schema.sql
npx wrangler deploy
```

部署成功后会显示形如 `https://daobox-api.<你的子域>.workers.dev` 的地址。

## 绑定自有域名（国内可访问的关键）

1. Cloudflare 后台 → Workers & Pages → daobox-api
2. Settings → Domains & Routes → Add → Custom Domain
3. 填 `api.daobox.app` → 保存（DNS 自动配置，几分钟生效）

之后所有请求走 `https://api.daobox.app`。

## 生成一批激活码

```bash
curl -X POST "https://api.daobox.app/admin/seed?key=你的ADMIN_KEY&count=200"
```

返回每张码和对应的隐藏取码链接：

```json
{ "code": "382914", "link": "https://api.daobox.app/c/abc123..." }
```

把链接发给付款用户即可，用户打开就能看到码 + 一键复制。

## 其他管理操作

```bash
# 查看所有码和绑定（用户丢码时帮他查）
curl "https://api.daobox.app/admin/list?key=你的ADMIN_KEY"

# 手动解绑某台设备
curl -X POST "https://api.daobox.app/admin/unbind?key=你的ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"code":"382914","deviceId":"设备ID"}'
```

## 接口说明

### POST /api/activate

```json
请求：{ "code": "382914", "deviceId": "随机设备ID" }
成功：{ "ok": true, "plan": "all" }
失败：{ "ok": false, "error": "原因" }
```

- 激活码 = 购买凭证，重新输入可重新绑定，无需重复购买
- 每码最多绑 3 台设备（软绑定）
- 连续输错 5 次 → 冷却 10 分钟，反复触发冷却时间翻倍（防穷举）
