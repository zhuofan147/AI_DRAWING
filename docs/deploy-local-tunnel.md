# 本地部署并映射到互联网

这份说明用于把 AI_DRAWING 跑在本机，再通过 Cloudflare Tunnel 暴露到公网。

## 适用场景

- 你想让项目运行在自己的电脑、家用服务器或办公室机器上。
- 你不想购买云服务器。
- 你没有公网 IP，或者不想在路由器上做端口转发。
- 你希望数据、SQLite 数据库和上传文件保留在本机。

## 1. 准备环境变量

在项目根目录新建 `.env.production`：

```env
DATABASE_URL=file:/app/data/ai-drawing.db
UPLOAD_DIR=/app/uploads

# 按需填写。没有用到的供应商可以先留空或删除。
OPENAI_API_KEY=
OPENAI_BASE_URL=
OPENAI_MODEL=

GEMINI_API_KEY=

SEEDANCE_API_KEY=
SEEDANCE_BASE_URL=
SEEDANCE_MODEL=

KLING_ACCESS_KEY=
KLING_SECRET_KEY=

DASHSCOPE_API_KEY=
DASHSCOPE_BASE_URL=
DASHSCOPE_IMAGE_MODEL=

WAN_API_KEY=
WAN_BASE_URL=
WAN_MODEL=
```

`.env.production` 会被 `.gitignore` 忽略，不要提交真实密钥。

## 2. 本地启动

```powershell
docker compose up -d --build app
```

打开：

```text
http://localhost:3000
```

查看日志：

```powershell
docker compose logs -f app
```

停止：

```powershell
docker compose down
```

数据库会保存在本机 `data/`，上传和生成素材会保存在本机 `uploads/`。

## 3. 临时公网访问

适合临时演示，不适合长期使用。

```powershell
cloudflared tunnel --url http://localhost:3000
```

命令会输出一个临时公网地址。关闭命令后地址失效。

## 4. 长期公网访问

推荐使用 Cloudflare Zero Trust 创建 Named Tunnel，并绑定自己的域名。

大致流程：

1. 在 Cloudflare 托管你的域名 DNS。
2. 进入 Cloudflare Zero Trust。
3. 创建 Tunnel。
4. 在 Tunnel 里添加 Public Hostname，例如 `ai.example.com`。
5. 如果 Tunnel 也通过本项目的 Docker Compose 启动，服务地址填：

```text
http://app:3000
```

6. 复制 Cloudflare 给出的 tunnel token。
7. 在本机环境变量里设置 token：

```powershell
$env:CLOUDFLARED_TOKEN="你的_tunnel_token"
docker compose --profile tunnel up -d --build
```

之后访问你的域名即可进入本机服务。

## 5. 强烈建议加访问保护

当前项目主要按浏览器用户标识区分数据，不是面向公网开放注册的完整账号系统。

把服务暴露到互联网之前，建议在 Cloudflare Zero Trust 里给这个域名加 Access 保护，只允许你的邮箱或团队邮箱访问。否则陌生人可能访问你的应用、写入数据，甚至消耗你配置的 AI 服务额度。

## 6. 更新项目

代码更新后重新构建：

```powershell
docker compose up -d --build app
```

如果也使用 compose 里的 tunnel：

```powershell
docker compose --profile tunnel up -d --build
```
