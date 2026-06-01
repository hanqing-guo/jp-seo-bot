# JP SEO Bot — SEO 体检报告

*体检日: 2026-06-01 ｜ 范围: ① 接 SEO 引擎产文章 ② 站内技术 SEO ③ GEO（让 AI 搜索引用）*
*方法: 代码库 + 架构审计（本地未对外部署，故无公开 URL 的 PageSpeed / SERP 实测）*

---

## TL;DR

「产文章」引擎本身很强（DeepSeek + 强 E‑E‑A‑T / 检索意图 prompt），但**管线把 AI 产出的 SEO 价值丢掉了一大半**：prompt 让 AI 输出 `title / metaDescription / markdown / faq / relatedKeywords` 5 个字段，而后端 `parseArticle` 只取 `title + markdown`，**meta description、FAQ、关联词全部被丢弃**。同时平台是纯客户端 SPA、`public/` 空（无 sitemap / robots / llms.txt）、全站零结构化数据、文章无发布/导出通道（只能复制）。

- **最大机会**：别再丢弃 AI 已经产出的 SEO 元数据 + 输出 JSON‑LD —— 几乎 0 额外 AI 成本，纯管线改造，ROI 最高。
- **最大风险**：生成的文章无 schema、无具体数据、且 AI 爬虫看不见 CSR 内容 → 拿不到 AI 引用，也吃不到富结果（rich results）。

---

## ① 接 SEO 引擎产文章

**现状（实证）**
- 引擎：`api/_lib/seoGen.ts` 的 `buildSeoPrompt` → DeepSeek `deepseek-chat`。prompt 质量高：强制检索意图分析、H1/H2 结构、E‑E‑A‑T、具体数字/手顺、FAQ，并设「[ここに体験談/データを追記]」编辑闸防薄内容。
- prompt 要求 AI 输出 JSON 5 字段：`title / metaDescription(120字) / markdown / faq[{q,a}] / relatedKeywords[5]`（seoGen.ts:38‑44）。
- **但** `api/generate-article.ts` 的 `parseArticle` 只解析 `{ title, markdown }` —— metaDescription / faq / relatedKeywords **直接丢弃**（generate-article.ts:132‑136）。

**发现**
- 🔴 **管线丢弃 AI 已产出的 SEO 元数据**（最高 ROI）。AI 已经写好 meta description、FAQ、关联词，代码却扔了。捡回来即可：
  - `metaDescription` → 文章 `<meta name="description">` / 列表摘要 / OG。
  - `faq` → 正文 FAQ 区块 + **FAQPage JSON‑LD**（直接吃富结果 + AI 引用）。
  - `relatedKeywords` → 站内互链 / 下一篇选题建议。
- 🟡 **「待补数据」占位是双刃**：防 AI 量产薄内容（对），但若不补真实数据就发，文章对经典 SEO（薄）和 GEO（无可引用事实）都偏弱。建议：prompt 再要 2‑3 个「可填的具体数据点/统计提示」，或把编辑闸做成「填完才能发」的硬门。
- 🔵 jp-seo-bot 的 seoGen 之前被裁成只剩 `buildSeoPrompt`（删了 schema 生成）。做 FAQPage schema 需把 schema 生成补回来（可参考 hojokin 版本）。

**Quick Win**
1. `parseArticle` 保留全部 5 字段，`DraftArticle` 类型扩展 → 前端展示 meta description + FAQ + 关联词。工作量 **S**（纯管线层，无新 AI 成本）。
2. 由 `faq` + `metaDescription` 生成 `Article` + `FAQPage` JSON‑LD，随文章给出（可复制/可注入发布页）。工作量 **S‑M**。

---

## ② 站内技术 SEO

**现状（实证）**
- 纯 **CSR SPA**（Vite + React，客户端渲染，无 SSR/SSG）。
- `public/` **空**：无 `robots.txt`、`sitemap.xml`、`llms.txt`、OG 图片。
- `<head>`：title / description / OG / Twitter / theme-color 已具备（本轮刚加）；但 SPA 全路由共用同一份 meta（无 per-route 标题/描述）。
- 全站 **零 JSON‑LD**（无 Organization / WebApplication / FAQPage / Article）。
- 文章**无发布/导出通道**，只有「コピー」复制 markdown（KeywordDetail.tsx:395）。
- 性能：构建产物 ~200KB JS（react-vendor 53KB gzip）—— 健康，非问题。

**发现**
- 🔴 **CSR SPA = SEO 先天不足**。Googlebot 能渲染 JS 但慢且不稳；**AI 爬虫（GPTBot / PerplexityBot / ClaudeBot）基本不执行 JS** → 只看到空 `<div id="root">`。一个「SEO 工具」自己不可被抓取，讽刺且实害。
- 🔴 **`public/` 空**：至少补 `robots.txt`（含 AI 爬虫 UA 规则）。`sitemap.xml` 在「有公开可抓取页」之前意义不大（当前没有）。
- 🔴 **零结构化数据**：首页应有 `Organization` + `WebApplication`(SoftwareApplication)；文章页应有 `Article` + `FAQPage`。
- 🟡 **per-route meta 缺失**：若希望 `/`、`/new` 等分别被索引，需 react-helmet 类做 per-route meta。当前是单 title。
- 🔴（架构级）**文章发布通道缺失** —— 这是「SEO 文章平台」最大架构空白：工具产了好文章，却不发布、也不控制发布后的技术 SEO（canonical / schema / 内链）。**「站内技术 SEO」目前无站可施**，因为没有对外的内容站。

**Strategic（本季度方向）**
- 先定文章的「站」在哪：① 内置发布站（SSG/SSR + 每篇独立 URL + Article/FAQ schema + canonical + sitemap）；或 ② 接 CMS（WordPress / Hatena / STUDIO…）并由工具注入 schema/meta。定了这步，站内技术 SEO 才有落点。
- 营销页（落地/定价）若要自然流量，迁 SSG（Astro / Next 静态）或加 prerender。

---

## ③ GEO — 让 AI 搜索引用

**现状（实证）**：无 `llms.txt`、无任何 schema、内容含「待补数据」占位、CSR 不可被 AI 爬虫看见、无 author/Organization 权威标记。

**发现（逐条对照 GEO 奖励的信号）**
- 🔴 **结构化数据缺失**：AI 引擎重度依赖 schema 理解并引用。讽刺的是 prompt **已生成 faq** 却没输出成 `FAQPage` —— 接回来就是现成的 GEO 燃料。
- 🔴 **无 `llms.txt`**（AI 爬虫指引的新兴标准）：`public/llms.txt` 列出站点结构 / 可引用内容。
- 🔴 **AI 爬虫看不见 CSR 内容**（同 SPA 问题）→ 无内容可引 = 引用上限为 0。
- 🟡 **内容不可引用**：AI 爱引「具体数字 / 统计 / 具名实体 / 出处」。当前靠 prompt 结构好，但「体験談/データ」是占位，缺硬事实。GEO 要点：答案前置（开头直给结论）、统计与来源、清晰实体、FAQ。
- 🟡 **无 E‑E‑A‑T 权威标记**：author / Organization / sameAs。AI 衡量来源可信度。

**Quick Win**
1. 文章输出 `Article` + `FAQPage` JSON‑LD（由已生成的 faq + metaDescription 直接拼）。**S**。
2. `public/llms.txt` + `robots.txt`（允许并引导 GPTBot / PerplexityBot / ClaudeBot / Google-Extended）。**S**。
3. prompt 增补「答案前置段 + 2‑3 个具体数据点/出处提示」，提升可引用度。**S**。

---

## 汇总：优先级

**🔴 必修（阻断 SEO/GEO 价值）**
- 管线丢弃 metaDescription/faq/relatedKeywords → 捡回来。
- 零结构化数据 → 输出 Article / FAQPage / Organization JSON‑LD。
- CSR 不可抓取 → 决定文章站形态（内置发布站 SSG/SSR，或接 CMS）。

**🟡 本季度**
- per-route meta、llms.txt / robots.txt、prompt 补可引用事实、E‑E‑A‑T 标记。

**🔵 监控**
- 营销页是否需要自然流量（决定要不要 SSG）。

---

## 建议的落地起点

从 **「🔴 管线捡回 SEO 元数据 + 输出 FAQPage/Article JSON‑LD」** 开始 —— 投入最小（S）、ROI 最高、0 额外 AI 成本，且能同时改善经典 SEO（富结果）与 GEO（AI 引用）。CSR→可抓取 的架构决策（内置发布站 vs 接 CMS）是更大的一步，需要你先定方向。
