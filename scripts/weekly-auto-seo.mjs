#!/usr/bin/env node
// 週次 自動SEO最適化(毎週月曜 09:00 JST に launchd から実行)
//
// やること:
//   1. 監視    — Yahoo! JAPAN の site: でインデックス数を実測し、前回比で増減を判定
//   2. 技術修復 — 重複slug / sitemap重複 / OGP欠落 を検出し、直せるものは直す
//   3. 受制執筆 — 品質ゲートを通ったときだけ、キューから1本だけ記事を生成
//   4. 報告    — seo-reports/YYYY-MM-DD-weekly-auto.md に結果を書き出す
//
// ★ 品質ゲート(2026-08 追加): 過去に「自動投稿を無制限に回してインデックスが29→4に落ちた」
//   事故があったため、執筆は以下を全て満たす場合のみ実行する:
//     - 前回投稿から7日以上あいている(週1本まで)
//     - インデックス数が前回比で減っていない(減少中は新規投稿せず、原因調査を優先)
//     - キューに未公開スラッグが残っている
//     - 生成後、重複slug・最低文字数(1800字)を満たす
//   1つでも欠ければ執筆はスキップし、理由を報告に残す。
//
// 実行: node scripts/weekly-auto-seo.mjs [--dry-run]

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DRY = process.argv.includes('--dry-run')
const MIN_BODY = 1800          // 生成記事の最低文字数(薄い記事はインデックスされない実測に基づく)
const STATE_FILE = resolve(ROOT, 'seo-reports/.weekly-state.json')

const jstDate = () => new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10)
const log = []
const say = (m) => { log.push(m); console.log(m) }

// ── 状態(前回実行の記録) ──────────────────────────
function loadState() {
  try { return JSON.parse(readFileSync(STATE_FILE, 'utf8')) } catch { return {} }
}
function saveState(s) {
  mkdirSync(dirname(STATE_FILE), { recursive: true })
  writeFileSync(STATE_FILE, JSON.stringify(s, null, 2))
}

// ── 1. 監視: Yahoo! JAPAN でインデックス数を実測 ──────
// 日本市場の判定は必ず日本の入口(Yahoo! JAPAN は Google インデックスを採用)で行う。
async function measureIndexCount() {
  try {
    const res = await fetch('https://search.yahoo.co.jp/search?p=site%3Aenkiseojp.com', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
    })
    const html = await res.text()
    const m = html.match(/約([\d,]+)件/)
    return m ? Number(m[1].replace(/,/g, '')) : null
  } catch (e) {
    say(`  ! インデックス数の取得に失敗: ${e.message}`)
    return null
  }
}

// ── 2. 技術チェック ───────────────────────────────
async function technicalChecks() {
  const issues = []
  const { articles } = await import(resolve(ROOT, 'content/blog-articles.mjs') + `?t=${Date.now()}`)

  // 重複 slug(過去にインデックス低下を招いた実害あり)
  const seen = new Set()
  for (const a of articles) {
    if (seen.has(a.slug)) issues.push(`重複slug: ${a.slug}`)
    seen.add(a.slug)
  }

  // 薄い記事(インデックスされにくい)
  const thin = articles.filter((a) => a.body.length < 1000)
  if (thin.length) issues.push(`薄い記事(1000字未満) ${thin.length}本: ${thin.map((a) => a.slug).join(', ')}`)

  // ビルド成果物の健全性
  try {
    execSync('npm run build', { cwd: ROOT, stdio: 'pipe' })
    const sitemap = readFileSync(resolve(ROOT, 'dist/sitemap.xml'), 'utf8')
    const locs = sitemap.match(/<loc>/g)?.length ?? 0
    const uniq = new Set(sitemap.match(/<loc>([^<]+)<\/loc>/g) ?? []).size
    if (locs !== uniq) issues.push(`sitemapに重複URL: ${locs - uniq}件`)
    say(`  ビルド成功 / sitemap ${locs}件`)

    // OGP 必須タグ(トップ + 記事1本を抜き取り検査)
    const need = ['og:site_name', 'og:title', 'og:description', 'og:image', 'og:image:width', 'twitter:card', 'twitter:title', 'twitter:description']
    for (const [label, file] of [['トップ', 'dist/index.html'], ['記事', `dist/blog/${articles[0].slug}/index.html`]]) {
      const html = readFileSync(resolve(ROOT, file), 'utf8')
      const miss = need.filter((t) => !html.includes(`"${t}"`))
      if (miss.length) issues.push(`${label}のOGP欠落: ${miss.join(', ')}`)
    }
  } catch (e) {
    issues.push(`ビルド失敗: ${String(e.message).slice(0, 200)}`)
  }

  return { issues, articles }
}

// ── 3. 受制執筆(品質ゲート) ───────────────────────
async function maybeWriteArticle(state, indexNow, indexPrev, articles) {
  const reasons = []

  const last = state.lastArticleAt ? new Date(state.lastArticleAt) : null
  const daysSince = last ? (Date.now() - last.getTime()) / 86_400_000 : 999
  if (daysSince < 7) reasons.push(`前回投稿から${daysSince.toFixed(1)}日(週1本まで)`)

  if (indexNow != null && indexPrev != null && indexNow < indexPrev) {
    reasons.push(`インデックス減少中(${indexPrev}→${indexNow})。新規投稿より原因調査を優先`)
  }

  const mod = await import(resolve(ROOT, 'content/blog-topic-queue.mjs') + `?t=${Date.now()}`).catch(() => ({}))
  // blog-topic-queue.mjs は `queue` という名前で export している(topicQueue ではない)
  const queue = mod.queue ?? mod.topicQueue ?? mod.default ?? []
  const published = new Set(articles.map((a) => a.slug))
  const next = queue.find((t) => t && t.slug && !published.has(t.slug))
  if (!next) reasons.push('キューに未公開スラッグなし')

  if (reasons.length) {
    say(`  執筆スキップ: ${reasons.join(' / ')}`)
    return { wrote: false, reasons }
  }

  if (DRY) {
    say(`  [dry-run] 執筆対象: ${next.slug} (${next.keyword})`)
    return { wrote: false, reasons: ['dry-run'] }
  }

  try {
    execSync(
      `node --env-file=supabase/.env scripts/gen-article.mjs ${JSON.stringify(next.keyword)} ${JSON.stringify(next.angle ?? '')} ${JSON.stringify(next.slug)} --write`,
      { cwd: ROOT, stdio: 'pipe' },
    )
    // 生成後の検品: 最低文字数を満たさなければ差し戻す
    const { articles: after } = await import(resolve(ROOT, 'content/blog-articles.mjs') + `?t=${Date.now()}`)
    const made = after.find((a) => a.slug === next.slug)
    if (!made || made.body.length < MIN_BODY) {
      execSync('git checkout -- content/blog-articles.mjs', { cwd: ROOT, stdio: 'pipe' })
      say(`  執筆を破棄: 文字数不足(${made?.body.length ?? 0} < ${MIN_BODY})`)
      return { wrote: false, reasons: [`文字数不足 ${made?.body.length ?? 0}字`] }
    }
    say(`  執筆成功: ${next.slug} (${made.body.length}字)`)
    return { wrote: true, slug: next.slug, chars: made.body.length }
  } catch (e) {
    say(`  執筆失敗: ${String(e.message).slice(0, 200)}`)
    return { wrote: false, reasons: ['生成エラー'] }
  }
}

// ── main ─────────────────────────────────────────
const today = jstDate()
say(`# 週次 自動SEO最適化 — ${today}${DRY ? ' (dry-run)' : ''}\n`)

const state = loadState()

say('## 1. インデックス監視')
const indexNow = await measureIndexCount()
const indexPrev = state.lastIndexCount ?? null
if (indexNow == null) say('  取得失敗(次回再試行)')
else if (indexPrev == null) say(`  現在: ${indexNow}ページ(初回計測)`)
else {
  const d = indexNow - indexPrev
  say(`  現在: ${indexNow}ページ (前回 ${indexPrev} / ${d >= 0 ? '+' : ''}${d})`)
  if (d < 0) say('  ⚠ 減少しています。技術要因を優先調査してください。')
}

say('\n## 2. 技術チェック')
const { issues, articles } = await technicalChecks()
say(`  記事数: ${articles.length}`)
if (issues.length) issues.forEach((i) => say(`  ⚠ ${i}`))
else say('  問題なし')

say('\n## 3. 記事生成(品質ゲート付き)')
const writeResult = await maybeWriteArticle(state, indexNow, indexPrev, articles)

// 報告書き出し
const report = [
  `# 週次 自動SEO最適化レポート — ${today}`,
  '',
  '## インデックス',
  `- 現在: ${indexNow ?? '取得失敗'}ページ` + (indexPrev != null ? ` (前回 ${indexPrev})` : ''),
  '',
  '## 技術チェック',
  issues.length ? issues.map((i) => `- ⚠ ${i}`).join('\n') : '- 問題なし',
  '',
  '## 記事生成',
  writeResult.wrote
    ? `- 生成: ${writeResult.slug} (${writeResult.chars}字)`
    : `- スキップ: ${(writeResult.reasons ?? []).join(' / ')}`,
  '',
  '## 次のアクション(人が行う)',
  '- 新規記事があれば Search Console で「インデックス登録をリクエスト」',
  '- インデックスが減少していれば、重複slug・noindex・sitemapを確認',
  '',
  `_generated by scripts/weekly-auto-seo.mjs at ${new Date().toISOString()}_`,
].join('\n')

mkdirSync(resolve(ROOT, 'seo-reports'), { recursive: true })
const reportPath = resolve(ROOT, `seo-reports/${today}-weekly-auto.md`)
if (!DRY) {
  writeFileSync(reportPath, report)
  saveState({
    lastRunAt: new Date().toISOString(),
    lastIndexCount: indexNow ?? indexPrev ?? null,
    lastArticleAt: writeResult.wrote ? new Date().toISOString() : state.lastArticleAt ?? null,
  })
}
say(`\n報告: ${DRY ? '(dry-run のため書き出しなし)' : reportPath}`)
