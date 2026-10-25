# Cloudflare Pages 部署

当前仓库是纯静态站，不依赖构建框架。

## 推荐部署方式

### Git 集成

在 Cloudflare Pages 中连接 `hexagon-codes/hexclaw-site` 仓库：

- Framework preset：`None`
- Build command：留空
- Build output directory：`.`

## 当前结构约定

- `index.html`：默认中文入口的静态跳转后备页
- `zh/index.html`：中文官网首页
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

当前仓库已经通过 [`functions/_middleware.js`](./functions/_middleware.js) 声明了：

- `www.hexclaw.net/*` 永久跳转到 `https://hexclaw.net/:splat`

这解决的是站点层的主机名统一问题。要让 `www.hexclaw.net` 真正可访问，还需要在 Cloudflare Pages / Cloudflare DNS 中完成以下配置：

1. 在 Pages 项目的 `Custom domains` 中添加 `www.hexclaw.net`
2. 确认 `www` 的 DNS 记录已由 Cloudflare 接管并开启代理
3. 保持主站 canonical 继续指向 `https://hexclaw.net/...`，避免 `www` 与 apex 重复收录

## 路由与静态资源缓存

默认语言固定为中文，`/` 与 `/index.html` 均通过 301 直接跳转到 `/zh/`；其他语言有各自稳定的入口，不按访问者语言或爬虫 UA 改写正文。

`_headers` 将 CSS、JS 的长期缓存与可更新素材分开：

- `assets/css/`、`assets/js/` 保留一年 `immutable` 缓存。发布前运行既有 `scripts/stamp-cache-bust.sh`，使页面引用的版本随内容变化；文档 CSS 使用哈希文件名，其余受管 CSS/JS 使用内容哈希查询参数。
- `assets/brand/`、`assets/icons/`、`assets/docs/`、`assets/k12-case/`、`assets/downloads/` 使用 `max-age=0, must-revalidate`。浏览器可存储资源，但再次使用时需重新验证，避免同名截图或 PDF 更新后仍长期复用旧内容。
- 新增素材目录时同步核对缓存规则；不要恢复覆盖全部 `/assets/*` 的长期不可变缓存。多个匹配规则中的同名响应头会被合并，因此这里使用互不重叠的目录规则，参见 [Cloudflare Pages 响应头说明](https://developers.cloudflare.com/pages/configuration/headers/)。

旧响应已经写入浏览器的一年缓存不会因服务器修改响应头立即失效。需要立即刷新此前同名素材时，应更新引用的版本或文件名；部署后核对实际响应头，不把本地文件变更视为线上生效。

## 百度收录诊断与提交

站点维护人员需有 [百度搜索资源平台](https://ziyuan.baidu.com/) 对 `https://hexclaw.net` 的已验证站点权限；查看边缘请求和规则命中还需 Cloudflare 对应站点的只读权限。仓库内没有验证标签不能证明站点未绑定，先检查平台现有站点及 DNS/文件验证状态，避免重复配置。

### 先确认发现、抓取与索引处在哪一步

1. 在百度平台记录当前索引量、抓取异常、抓取频次及可用的抓取诊断结果。以平台当前提供的工具为准，普通 `site:` 搜索数量只能辅助观察，不能代替索引量。
2. 选择中文首页 `/zh/`、快速上手 `/zh/docs/getting-started`、K12 案例 `/zh/k12` 和教程 `/zh/docs/k12` 作为样本，核对最终 URL、HTTP 状态、抓到的正文、robots 与 canonical；同时确认不存在路径返回真实 404。
3. 在有权限的 Cloudflare 请求日志/事件中按时间、URL、客户端 IP、User-Agent、响应状态与 Ray ID 关联访问，记录是否发生挑战、403、超时或规则命中。平台诊断结果可用于关联时间；普通客户端收到 1010 或自行改写 Baiduspider UA 都不能证明真实百度蜘蛛受阻。
4. 对日志中的候选蜘蛛 IP 做反向 DNS，再正向解析所得主机名，确认主机名属于百度官方说明的域名且解析回原 IP；仅凭 UA 字符串不能确认身份。方法见 [百度蜘蛛双向 DNS 识别说明](https://ziyuan.baidu.com/college/articleinfo?id=2855)。
5. 只有已确认真实蜘蛛受阻，才针对命中的具体规则提出修正范围与正常访问影响。此诊断流程不自动修改 Cloudflare 安全设置，也不关闭防护作为试探。

### 普通收录提交步骤

1. 先完成部署与线上读回，确认准备提交的内容页返回 200、内容完整、允许索引，canonical 指向最终 HTTPS URL。提交跳转后的地址，不提交 `/`、`.html` 别名、404、锚点或版本查询参数。
2. 在平台“资源提交 → 普通收录”中，按账号当前开放的入口和配额使用 sitemap、手动提交或 API 推送。sitemap 地址为 `https://hexclaw.net/sitemap.xml`；文件已存在不代表已经在平台提交。
3. 首次优先提交上述四个已核对的中文样本，再提交其他已发布内容页；后续只提交新增或实质更新的页面。API 地址、站点参数与 token 从平台当前页面取得，token 只放本机私有环境或受管密钥，不写入仓库、文档和日志。
4. 保存提交时间、URL、平台接收结果及额度反馈；若使用 API，区分提交成功数与未接收项。提交属于外部写操作，执行前需有对应授权，本文不自动触发推送。
5. 之后观察同一批 URL 的发现、真实抓取、索引与展现变化。提交成功只代表接收链接，抓取诊断也不是收录申请，均不能承诺收录时间、收录结果或排名。

普通收录方式与最终 URL 要求参考 [百度平台工具说明](https://ziyuan.baidu.com/college/articleinfo?id=3076)；工具名称、配额和权限可能调整，以登录后台实际显示为准。`sitemap.xml` 的 `lastmod` 应对应页面实质内容更新，不因重复部署或提交而整站刷新。

## 官网内容更新后的验收

- 使用 `node --test scripts/*.test.mjs` 执行现有站点结构、素材与发布引用检查。
- 运行 `bash scripts/stamp-cache-bust.sh`，同步 CSS、JavaScript 和产品介绍 PDF 的内容版本；不要手动复用旧资源版本号。
- 用 `wrangler pages dev .` 检查首页、下载入口、新文章及移动导航；核对重定向和缓存头。
- 官网产品截图使用已安装客户端的原生窗口：先打开目标页面，再运行 `node scripts/capture-doc-screenshots.mjs --output <私有目录> --name <场景名>`。保留原始 PNG 与来源记录，脱敏云端地址、个人信息和宿主路径后转换为 WebP；同步 `assets/docs/screenshots/manifest.json` 中的版本、实际尺寸和文件 SHA-256。禁止把浏览器或原型截图补画系统按钮后当作安装版实图。
- 截图需标明来源与适用版本。组件演示数据只能证明页面显示，不能作为真实模型效果或消息投递成功的证据。
- 发布之后再验证线上地址，并按前文百度流程提交新内容；本地检查与代码提交不代表已经上线或已被收录。
