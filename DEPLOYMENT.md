# Cloudflare Pages 部署

当前仓库是纯静态站，不依赖构建框架。

## 推荐部署方式

### Git 集成

在 Cloudflare Pages 中连接 `hexagon-codes/hexclaw-site` 仓库：

- Framework preset：`None`
- Build command：留空
- Build output directory：`.`

## 当前结构约定

- `index.html`：官网首页
- `en/docs/`：英文产品文档
- `zh/docs/`：中文产品文档
- `assets/`：静态资源
- `_headers`：Cloudflare Pages 响应头规则
- `_redirects`：Cloudflare Pages 跳转规则
- `404.html`：静态 404 页面
- `robots.txt`：爬虫入口
- `sitemap.xml`：站点地图

## 本地预览

如果本机安装了 Wrangler，可在仓库根目录运行：

```bash
wrangler pages dev .
```

如果使用 `wrangler.toml`，Cloudflare 会把它视为 Pages 配置的一部分。当前文件只声明了：

- `name = "hexclaw-site"`
- `pages_build_output_dir = "."`

如果后续要把更多 Pages 配置写入 `wrangler.toml`，应确保它与 Cloudflare Dashboard 的配置一致。

## 自定义域名

当前仓库已经通过 [functions/_middleware.js](/Users/guoyanjun/work/hexclaw-site/functions/_middleware.js) 声明了：

- `www.hexclaw.net/*` 永久跳转到 `https://hexclaw.net/:splat`

这解决的是站点层的主机名统一问题。要让 `www.hexclaw.net` 真正可访问，还需要在 Cloudflare Pages / Cloudflare DNS 中完成以下配置：

1. 在 Pages 项目的 `Custom domains` 中添加 `www.hexclaw.net`
2. 确认 `www` 的 DNS 记录已由 Cloudflare 接管并开启代理
3. 保持主站 canonical 继续指向 `https://hexclaw.net/...`，避免 `www` 与 apex 重复收录
