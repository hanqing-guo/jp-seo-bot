# JP SEO Bot — 成果物 & 引き継ぎ手順（交付说明）

## 这是什么
JP SEO Bot 给「自己」做 SEO 的全部成果：5 篇满分文章 + 全自动化系统代码 + 收尾步骤。

---

## ✅ 已完成（现在就能用）

### 1. 5 篇满分 SEO 文章 → `content/articles/`
DeepSeek + 满分引擎生成，意图匹配 + E-E-A-T + FAQ + Schema 全齐：
- `01_中小企業_SEO_自動化.md`
- `02_格安_SEO_対策_おすすめ.md`
- `03_AI_SEO_記事_自動作成_サービス.md`
- `04_中小企業_SEO_自分で_やり方_失敗しない.md`
- `05_SEO_外注_格安_体験談_中小企業.md`

**这 5 篇现在就能用** —— 复制粘贴到 はてなブログ 就能发布。
每篇里 `[ここに体験談/データを追記]` 的地方，填一句你的真实经验，Google 评价会更高（这就是「编辑闸」）。

### 2. 系统代码（全部写好 + 注释）
- `api/_lib/seoGen.ts` — 满分 SEO 生成引擎（意图 / E-E-A-T / FAQ / Schema）
- `api/_lib/hatena.ts` — はてなブログ 自动发布（AtomPub）
- `scripts/publish.ts` — 一键「生成 → 发布」脚本（含 cron 示例）
- `src/` — 产品本体：3 画面，已接 DeepSeek

---

## ⬜ 剩余（给懂一点电脑的人，约 10 分钟）

### A. 填 はてな API key（自动发布的「钥匙」）
1. 打开 `https://blog.hatena.ne.jp/-/config` → 拉到最底「APIキー」→ 点「発行」
2. 把显示的 key 复制 → 粘到 `supabase/.env` 里 `HATENA_API_KEY=` 的后面 → 保存

### B. 测试（一条命令）
```
deno run --allow-net --allow-env --env-file=supabase/.env scripts/publish.ts
```
→ 自动生成 5 篇 + 发到 はてなブログ「下書き（草稿）」。
确认没问题后，把 `scripts/publish.ts` 里的 `draft: true` 改成 `false`，再跑就直接公开。

### C. 每天自动跑（cron / 定时）
```
0 9 * * * cd <这个项目文件夹> && deno run --allow-net --allow-env --env-file=supabase/.env scripts/publish.ts
```

### D.（可选）产品本身上线
`vercel --prod`（已登录 Vercel；环境变量里设 `DEEPSEEK_API_KEY` / `HATENA_*`）

---

## 实话实说（期待值，别被误导）
- SEO 效果 **3〜6 个月** 才看得到（Google 的规律，没有速成）
- 打法：低竞争长尾词 → 商业词 → 大词，每周 2〜3 篇，质量优先
- 外链**不要**自动化（Google 会重罚），靠手动 / PR

## 成本
- AI：DeepSeek（一篇几分钱）
- 排名监测（可选）：DataForSEO（月 ~$1，按量）
- 合计：每月几美元，无需固定预算
