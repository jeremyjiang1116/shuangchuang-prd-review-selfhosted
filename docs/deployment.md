# 部署与切换说明

## 单机部署边界

运行使用 Node.js 24 和服务器本地 SQLite 文件，推荐普通 Linux 主机、持久化磁盘和 2 GB 以上内存；构建建议预留 4 GB 内存。具体容量需要按成员数与文档量验证，本次没有做压力测试。不要把同一 SQLite 数据卷放在多台主机或共享网络文件系统上，也不要用 PM2 cluster/多副本横向扩容。当前团队评审规模使用一个应用实例。

访问是否通畅取决于服务器线路、域名解析、防火墙及团队网络。代码移除了原平台的运行依赖，但不承诺任意机房在所有地区都可访问。上线时由团队网络进行实际验收。

## Docker 配置

`compose.yaml` 默认使用命名卷 `review_data` 与 `review_backups`，容器用户为 node。应用监听 3000，主机默认绑定 127.0.0.1。Nginx 在主机上转发到该端口，设置域名、证书以及 APP_ORIGIN 后启动。APP_ORIGIN 必须与浏览器地址栏中的协议、域名和端口一致。

HTTPS 模式下会话 Cookie 自动启用 Secure；TRUST_PROXY=1 只适用于可信反向代理，且代理必须覆盖 X-Forwarded-For。示例 Nginx 已这样设置。不要把未受保护的应用端口额外暴露公网。

`.env` 包含访问口令与签名密钥，单独保存，不加入 Git。更换 REVIEW_SECRET 后旧会话失效，所有人重新登录。部署者可自定义 TEAM_PASSCODE；脚本不会从旧站复制密钥。

## 国内网络下的依赖获取

首次构建需要 Node 镜像和 npm 包；运行时页面、字体、脚本、数据库均来自本服务器。可以在 `.env` 配置组织可访问的下载源：

```dotenv
NPM_REGISTRY=https://registry.npmmirror.com
NODE_IMAGE=你的镜像仓库/node:24-bookworm-slim
```

NODE_IMAGE 留默认值表示使用 Docker Hub 的官方 Node 镜像。上述仓库地址示例需要替换为实际可访问且受信任的来源；npm 锁文件保留包完整性校验。目标服务器不具备构建网络时，优先采用下述离线镜像方式。

## 离线导入镜像

在已安装 Docker、可访问构建源的机器执行，平台须与目标服务器一致（多数 x86 服务器为 linux/amd64，ARM 服务器用 linux/arm64）：

```bash
docker buildx build --platform linux/amd64 --load -t shuangchuang-prd-review:2.0.0 .
docker save -o shuangchuang-prd-review-image.tar shuangchuang-prd-review:2.0.0
```

将镜像 tar、compose.yaml 及安全生成的 `.env` 传入目标服务器：

```bash
docker load -i shuangchuang-prd-review-image.tar
docker compose up -d --no-build --pull never
curl -f http://127.0.0.1:3000/api/health
```

镜像中带 PRD 和初始团队数据，因此镜像本身也应受控保存。本次交付的是源代码包，不包含已构建的 Linux Docker 镜像；没有 Docker 的当前验证环境未执行镜像构建。

## 不使用 Docker

用普通用户将代码部署到 `/opt/prd-review`，安装 Node.js 24，执行 README 中的 npm ci、setup、build。确保该用户可写 data 目录。

可使用以下 systemd 单元；Node 的路径以 `command -v node` 的结果为准：

```ini
[Unit]
Description=PRD team review
After=network.target

[Service]
Type=simple
User=prd-review
WorkingDirectory=/opt/prd-review
ExecStart=/usr/bin/node /opt/prd-review/scripts/start.mjs
Environment=NODE_ENV=production
Environment=NEXT_TELEMETRY_DISABLED=1
Environment=HOSTNAME_BIND=127.0.0.1
Restart=on-failure
RestartSec=5
KillSignal=SIGTERM
TimeoutStopSec=30
UMask=0077

[Install]
WantedBy=multi-user.target
```

创建相应系统用户、配置目录权限后，由管理员安装到 `/etc/systemd/system/prd-review.service`，执行 daemon-reload 和 enable --now。Nginx 的配置与 Docker 方式相同。

## 从旧站切换

1. 确认随包快照的 capturedAt。该时间之后旧站的新记录不会自动出现在此库；正式切换前如旧站还有新增评审，应再导出并核对后迁移，不能覆盖已开始使用的新站数据库。
2. 先在新站验证登录、原稿/V2 切换、86 条台账、作者筛选、正文定位，以及两位成员的勾选、评论、修订。
3. 安排统一切换时间，团队之后使用新地址，避免同时编辑两份数据。
4. 保存首次数据库备份和 `.env`，将新站地址及口令交给成员。
5. 原站保留供追溯；本次迁移没有停止、修改或删除原站。

## 验收与排障

- 健康接口 `/api/health` 只返回可用状态，不暴露业务数据。
- 403“请求来源不匹配”：对照 APP_ORIGIN、实际浏览器地址和反向代理域名。
- 无法登录：确认已生成真实口令和至少 32 字符签名密钥；重复失败可能触发十分钟尝试限制。
- 503 数据无法读写：检查 data 目录/卷写权限、磁盘空间和应用日志。
- 重启后数据丢失：确认保留了同一数据卷/数据库目录，没有使用临时路径。
- 恢复数据：先停应用，再运行 restore 脚本；不要直接替换正在使用的 SQLite 主文件。
- 升级不会重新导入 seed。若要建立新的评审空间，应使用新的空数据卷，不要删除正式库来触发导入。
