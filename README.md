# 高校双创 PRD 协同评审 · 独立部署版

这是一套可放在普通 Linux 服务器上的完整评审网站：原始 PRD、V2 整合稿、全量意见台账，以及团队的审阅、评论和修订数据均已带入。运行时不依赖 GPT Sites、Cloudflare D1、ChatGPT 登录或海外 CDN。浏览器只向你自己的服务器请求页面、静态资源和业务接口。

技术栈为 Next.js 16、React 19、Node.js 24、SQLite。适用于团队规模、单台服务器、单应用实例；数据放持久磁盘，不使用浏览器本地存储充当共享数据库。没有 Docker 时也能用 Node.js 直接运行。

## 带了哪些内容

| 内容 | 位置 | 范围 |
| --- | --- | --- |
| 原始 PRD | `lib/document.json` | 5 个业务域、122 个功能 |
| V2 整合稿及意见台账 | `lib/releases/v2.json` | 86 条历史来源记录，其中 57 条有文字或直接修订 |
| 当前线上协作快照 | `seed/reviews.json` | 5 位成员、36 条讨论、44 条审阅、6 次修订、5 处正文覆盖 |
| 数据结构 | `db/schema.sql` | 与线上业务字段、编号、版本和时间一致 |

协作快照采集时间见 `seed/reviews.json` 的 `capturedAt`，本次为 2026-09-14。V2 台账是上一轮合并时的冻结证据；后续对正文的编辑在对应版本的修订记录里展示。原稿与 V2 的确认和讨论仍分别记录。导入保留所有原姓名、正文、意见、锚点及历史，不将旧确认转为 V2 确认。

**代码包包含真实的团队姓名和评审意见，公开仓库中的这些内容可被任何人读取。** 旧站口令、会话密钥和登录尝试记录没有打包。新站首次运行会生成新口令；如需沿用旧口令，由部署者在 `.env` 中填写。成员仍可用原姓名继续自己的审阅，需在新站重新登录。

## 最快启动：Node.js

安装 Node.js **24.13 或更新的 24.x 版本**（本地验证为 24.19.0），进入本目录：

```bash
git clone https://github.com/jeremyjiang1116/shuangchuang-prd-review-selfhosted.git
cd shuangchuang-prd-review-selfhosted
npm ci
npm run setup
# 按实际访问地址修改 .env 的 APP_ORIGIN
npm run build
npm start
```

本机访问 `http://localhost:3000`。`setup` 会显示新团队口令，并写入权限为 600 的 `.env`；重复运行保留已有配置。若用 IP 访问，例如 `http://10.0.0.8:3000`，APP_ORIGIN 就填写这一地址，不加末尾斜杠。

程序启动前自动初始化空数据库并导入快照；以后重启不会再次导入。数据默认在 `data/review.sqlite`，必须保留整个 data 目录及 `.env`。后台托管示例见 [部署说明](docs/deployment.md)。

## Docker 部署

已安装 Docker Engine 和 Compose v2 的 Linux 服务器：

```bash
# 推荐在有 Node.js 24 的管理机运行，生成 .env 后随部署配置安全传入服务器
node scripts/setup.mjs
# 修改 .env 中的 APP_ORIGIN；通过 Nginx 访问时设置 TRUST_PROXY=1
docker compose up -d --build
docker compose logs --tail=50 app
curl -f http://127.0.0.1:3000/api/health
```

没有 Node.js 的服务器也可手工根据 `.env.example` 建立 `.env`，使用 `openssl rand -hex 16` 生成口令、`openssl rand -hex 32` 生成签名密钥。不要直接使用示例值。

默认只把端口暴露给服务器本机，由 Nginx 提供团队访问。已有完整 HTTPS 配置样例 [deploy/nginx.conf](deploy/nginx.conf)。要在可信内网直接用 IP 测试，可在 `.env` 加入 `BIND_ADDRESS=0.0.0.0`，同步修改 APP_ORIGIN，并将服务器端口访问范围限制为团队网络。

构建时需要获得 npm 包和 Node 镜像。网络受限时可以配置组织可用的 `NPM_REGISTRY`、`NODE_IMAGE`，或在可联网的构建机生成镜像再离线导入；运行时不需要这些下载源。具体步骤见 [国内服务器与离线部署](docs/deployment.md)。

## 使用入口

- `/`：V2 功能清单，可逐项勾选、补充、评论和修订。
- `/?edition=v2&view=document`：V2 全文。
- `/?edition=v2&view=changes`：按作者、来源、处理结果筛选台账，查看前后对照、跳转正文、导出 CSV。
- `/?edition=original`：原稿及原始评审记录。

全文可划线评论，讨论可回复、解决、重开。并发编辑检查版本，拒绝覆盖他人更新；正文变化后，旧确认显示待复核。共享口令和署名沿用原协作方式，姓名不是经过验证的个人身份。

## 备份、恢复与升级

```bash
# 原生 Node 方式：使用 SQLite 一致性备份，不直接复制正在写入的主文件
npm run backup
# Docker 方式：备份保存在持久化的 review_backups 卷
docker compose exec app node scripts/backup.mjs /app/backups/review-backup.sqlite
# 同时导出一份到服务器其他磁盘/备份系统
docker compose cp app:/app/backups/review-backup.sqlite ./review-backup.sqlite
```

恢复前停止应用。脚本校验备份完整性，并在覆盖现有数据库前另存备份：

```bash
# 原生方式：先停止 npm start 对应的服务
node scripts/restore.mjs backups/review-backup.sqlite --confirm-stopped
npm start

# Docker 方式：备份文件已放在 review_backups 卷
docker compose stop app
docker compose run --rm --no-deps --entrypoint node app scripts/restore.mjs /app/backups/review-backup.sqlite --confirm-stopped
docker compose up -d --no-build
```

升级前备份；然后更新代码并重新构建，保留 `.env` 和数据卷。**不要运行 `docker compose down -v`**，它会删除持久卷。新旧网站不会自动同步，切换后应统一使用新地址；详见部署说明中的切换清单。

## 验证与维护

```bash
npm test
npm run typecheck
# 以下只允许本地地址，会新增测试成员和修改测试数据库，请勿指向正式业务库
REVIEW_TEST_ORIGIN=http://localhost:3000 node tests/review-http.mjs
REVIEW_TEST_ORIGIN=http://localhost:3000 node tests/edition-http.mjs
```

测试必须使用 `DATABASE_PATH=work/qa/review.sqlite` 等测试副本；只限制 localhost 不能代替数据隔离。构建和测试的具体结果、当前环境的限制见 [验证记录](docs/verification.md)。

部署机制参考：[Next.js standalone](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)、[Node.js SQLite](https://nodejs.org/docs/latest-v24.x/api/sqlite.html)。Node 24 的 SQLite API 仍带实验性标记，本项目将访问集中在 `lib/sqlite.ts` 并限定 Node 24 版本线。
