# HexClaw Site

`hexclaw-site` 是 `HexClaw` 的官方网站仓库，承载官网首页、下载入口、产品文档和生态导航，面向产品用户、技术用户和生态访问者。

## 仓库定位

- 官网首页与产品营销页面
- 下载入口与产品对外导航
- `HexClaw` 产品级使用文档
- 生态链总览与仓库跳转

本仓库不承载底层模块实现，也不替代各仓库自己的 `README` 和 `docs`。

## 生态链

`toolkit -> ai-core -> hexagon -> hexclaw -> hexclaw-ui / hexclaw-desktop / hexagon-ui`

- `toolkit`：Go 通用基础设施库，负责日志、配置、HTTP Client、并发原语、错误链等公共能力
- `ai-core`：AI 能力底座，负责 LLM Provider 适配、Embedding、Function Calling、记忆与向量能力
- `hexagon`：AI Agent 引擎，负责 ReAct、Plan-and-Execute、Workflow、Tool 调度、上下文状态机编排
- `hexclaw`：应用层后端，负责 RESTful API、Skill 接入、RAG 检索、Cron 调度、会话持久化和引擎集成
- `hexclaw-ui`：Web 客户端，负责产品主界面与桌面端 UI 复用
- `hexclaw-desktop`：Tauri 桌面端，负责本地原生运行、Sidecar 集成和跨平台交付
- `hexagon-ui`：Agent 观测台，负责执行链路追踪、推理回放和性能观测

## 本仓库内容边界

- 官网只讲 `HexClaw` 产品定位、能力、下载方式与生态关系
- 文档站只覆盖 `HexClaw` 产品使用，不展开底层库实现细节
- 生态页负责说明各仓库职责和关系，不搬运所有底层文档
- `toolkit / ai-core / hexagon` 的开发文档继续留在各自仓库维护

## 目录结构

- `index.html`：官网首页
- `en/docs/`：英文产品文档静态页面
- `zh/docs/`：中文产品文档静态页面
- `assets/icons/`：图标与 favicon
- `assets/brand/`：品牌图片资源
- `_headers`：Cloudflare Pages 响应头规则
- `_redirects`：Cloudflare Pages 跳转规则
- `404.html`：静态 404 页面
- `robots.txt`：爬虫入口
- `sitemap.xml`：站点地图
- `wrangler.toml`：Pages 输出目录配置
- `DEPLOYMENT.md`：部署说明

## Cloudflare Pages

当前仓库是纯静态站，适合直接接入 Cloudflare Pages：

- Framework preset：`None`
- Build command：留空
- Build output directory：`.`

详细部署步骤见 `DEPLOYMENT.md`。

## License

本仓库代码采用 `Apache-2.0` 协议，详见 [LICENSE](/Users/guoyanjun/work/hexclaw-site/LICENSE)。

除非另有明确说明，`HexClaw` 名称、Logo、品牌素材和官网文案不因软件开源协议而默认授予商标或品牌使用权。
