// 静的ブログ生成スクリプト(vite build の後に実行)。
// content/blog-articles.mjs を読み、/blog 配下に完全クロール可能な静的 HTML を出力し、
// sitemap.xml を再生成する。SPA と違い JS 不要で読めるため SEO/GEO に効く。
//
// 実行: package.json の build スクリプトが `vite build && node scripts/build-blog.mjs` で呼ぶ。

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { articles, SITE, PUBLISHER } from '../content/blog-articles.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = resolve(ROOT, 'dist')

// ── 最小 Markdown → HTML ──────────────────────────────
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
function md2html(md) {
  let html = '', inList = false, tableRows = null
  const closeList = () => { if (inList) { html += '</ul>'; inList = false } }
  // GitHub 風テーブル(| a | b |)対応。区切り行(|---|---|)はスキップ、1行目=ヘッダ。
  const isSep = (cells) => cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c))
  const flushTable = () => {
    if (!tableRows) return
    const rows = tableRows; tableRows = null
    const [head, ...rest] = rows
    let t = '<table><thead><tr>' + head.map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead>'
    if (rest.length) t += '<tbody>' + rest.map((r) => '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody>'
    html += t + '</table>'
  }
  for (const raw of md.split('\n')) {
    const line = raw.trimEnd()
    if (line.startsWith('|') && line.endsWith('|')) {
      closeList()
      const cells = line.slice(1, -1).split('|').map((c) => c.trim())
      if (isSep(cells)) continue
      if (!tableRows) tableRows = []
      tableRows.push(cells)
      continue
    }
    flushTable()
    if (line === '') { closeList(); continue }
    if (line.startsWith('### ')) { closeList(); html += `<h3>${inline(line.slice(4))}</h3>` }
    else if (line.startsWith('## ')) { closeList(); html += `<h2>${inline(line.slice(3))}</h2>` }
    else if (line.startsWith('- ')) { if (!inList) { html += '<ul>'; inList = true } html += `<li>${inline(line.slice(2))}</li>` }
    else { closeList(); html += `<p>${inline(line)}</p>` }
  }
  closeList()
  flushTable()
  return html
}

// ── 共有 head(フォント + デザイントークン)──────────────
const HEAD_COMMON = `
  <meta charset="UTF-8" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Language" content="ja" />
  <meta name="theme-color" content="#1f44e6" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:wght@600;700;800&family=Zen+Kaku+Gothic+New:wght@400;500;700;900&display=swap" rel="stylesheet" />
  <style>
    :root{--paper:#f4f0e7;--card:#fffdf7;--ink:#16140d;--ink-soft:#534d42;--line:#dcd4c2;--accent:#1f44e6;--accent-deep:#142fa3;
      --font-display:"Shippori Mincho B1","Hiragino Mincho ProN",serif;--font-sans:"Zen Kaku Gothic New",system-ui,sans-serif;}
    *{box-sizing:border-box;margin:0;padding:0}
    html{scroll-behavior:smooth}
    body{font-family:var(--font-sans);color:var(--ink);background:var(--paper);line-height:1.9;font-feature-settings:"palt" 1}
    a{color:inherit;text-decoration:none}
    .wrap{max-width:1120px;margin:0 auto;padding:0 24px}
    header.nav{position:sticky;top:0;z-index:20;backdrop-filter:saturate(1.2) blur(8px);background:color-mix(in srgb,var(--paper) 82%,transparent);border-bottom:1px solid var(--line)}
    .nav-inner{display:flex;align-items:center;justify-content:space-between;height:62px}
    .brand{display:flex;align-items:center;gap:10px;font-weight:900}
    .brand .mark{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;background:linear-gradient(135deg,var(--accent),var(--accent-deep));color:#fff;font-size:15px}
    .btn{display:inline-flex;align-items:center;gap:8px;font-weight:700;font-size:.92rem;padding:10px 18px;border-radius:999px;background:var(--accent);color:#fff;transition:.18s}
    .btn:hover{background:var(--accent-deep);transform:translateY(-2px)}
    footer.foot{border-top:1px solid var(--line);padding:36px 0;margin-top:80px;font-size:.85rem;color:var(--ink-soft)}
    .foot-inner{display:flex;justify-content:space-between;flex-wrap:wrap;gap:14px}
    .foot a:hover{color:var(--accent)}
    .display{font-family:var(--font-display)}
    .eyebrow{font-size:.72rem;letter-spacing:.22em;text-transform:uppercase;color:var(--accent-deep);font-weight:700}
    /* article */
    .article{max-width:720px;margin:0 auto;padding:48px 0 0}
    .article .kw{display:inline-block;font-size:.78rem;color:var(--accent-deep);background:#e7ebfd;border-radius:999px;padding:4px 12px;font-weight:700}
    .article h1{font-family:var(--font-display);font-weight:800;font-size:clamp(1.9rem,4.5vw,2.7rem);line-height:1.35;margin:18px 0 10px}
    .article .date{color:var(--ink-soft);font-size:.86rem;margin-bottom:8px}
    .article .body{margin-top:30px}
    .article .body h2{font-family:var(--font-display);font-weight:800;font-size:1.5rem;margin:40px 0 14px;padding-bottom:8px;border-bottom:2px solid var(--ink)}
    .article .body h3{font-weight:700;font-size:1.15rem;margin:26px 0 8px;color:var(--accent-deep)}
    .article .body p{margin:14px 0;color:#2a2720}
    .article .body ul{margin:14px 0 14px 4px;padding-left:20px}
    .article .body li{margin:7px 0;color:#2a2720}
    .article .body strong{font-weight:700}
    .article .body table{width:100%;border-collapse:collapse;margin:22px 0;font-size:.9rem;border:1px solid var(--line)}
    .article .body th,.article .body td{border:1px solid var(--line);padding:9px 12px;text-align:left;vertical-align:top}
    .article .body thead th{background:#efeada;font-weight:700}
    .article .body tbody tr:nth-child(even){background:#faf8f1}
    .article .body table{display:block;overflow-x:auto}
    .cta-box{margin:44px 0;padding:30px;border:1px solid var(--accent);border-radius:18px;background:#f3f5ff;text-align:center}
    .cta-box h3{font-family:var(--font-display);font-weight:800;font-size:1.3rem;margin-bottom:8px}
    .cta-box p{color:var(--ink-soft);font-size:.95rem;margin-bottom:18px}
    .faqs{margin:48px 0}
    .faqs h2{font-family:var(--font-display);font-weight:800;font-size:1.5rem;margin-bottom:18px}
    .qa{padding:20px 0;border-bottom:1px solid var(--line)}
    .qa h3{font-weight:700;font-size:1.05rem;margin-bottom:6px}
    .qa p{color:var(--ink-soft);font-size:.95rem}
    .related{margin-top:48px;border-top:1px solid var(--line);padding-top:28px}
    .related h2{font-size:1.1rem;font-weight:700;margin-bottom:14px}
    .related a{display:block;padding:10px 0;color:var(--accent-deep);font-weight:500}
    .related a:hover{color:var(--accent)}
    .crumbs{font-size:.82rem;color:var(--ink-soft);margin-bottom:4px}
    .crumbs a:hover{color:var(--accent)}
    /* index */
    .blog-hero{padding:56px 0 8px}
    .blog-hero h1{font-family:var(--font-display);font-weight:800;font-size:clamp(2rem,5vw,3rem)}
    .blog-hero p{color:var(--ink-soft);margin-top:10px;max-width:46ch}
    .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px;margin:36px 0}
    .card{display:block;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:26px;transition:.2s}
    .card:hover{transform:translateY(-4px);box-shadow:0 16px 38px rgba(22,20,13,.08)}
    .card .kw{font-size:.74rem;color:var(--accent-deep);font-weight:700}
    .card h2{font-family:var(--font-display);font-weight:700;font-size:1.22rem;line-height:1.45;margin:10px 0}
    .card p{color:var(--ink-soft);font-size:.9rem}
    :focus-visible{outline:2px solid var(--accent);outline-offset:3px}
  </style>`

const NAV = `
  <header class="nav"><div class="wrap nav-inner">
    <a class="brand" href="/"><span class="mark" aria-hidden="true">✦</span> JP SEO Bot</a>
    <a class="btn" href="/app">無料で試す</a>
  </div></header>`

// 運営者情報(2026-06-18): 全ページのフッターに掲載。検索エンジン/AIに「実在する正規の
// 運営者」を示し E-E-A-T を補強する。特商法の住所・電話は、個人事業主のため
// 「請求があれば遅滞なく開示」方式で表示(法定の代替表記)。
const CONTACT = {
  name: PUBLISHER, // enki
  email: 'canadaleiluo@gmail.com',
  tel: '070-1770-6868',
  address: 'ご請求があれば遅滞なく開示いたします',
}

const FOOT = `
  <footer class="foot"><div class="wrap">
    <div class="foot-inner">
      <div class="brand" style="font-size:.9rem"><span class="mark" aria-hidden="true" style="width:22px;height:22px;font-size:12px">✦</span> JP SEO Bot</div>
      <nav style="display:flex;gap:18px"><a href="/">トップ</a><a href="/blog/">ブログ</a><a href="/app">ダッシュボード</a></nav>
    </div>
    <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--line);font-size:.78rem;line-height:1.9;color:var(--ink-soft)">
      <strong>運営者情報</strong>　運営者:${CONTACT.name}　｜　メール:<a href="mailto:${CONTACT.email}">${CONTACT.email}</a>　｜　電話:${CONTACT.tel}　｜　所在地:${CONTACT.address}　｜　<a href="/tokushoho/">特定商取引法に基づく表記</a>
    </div>
  </div></footer>`

const CTA = `
  <div class="cta-box">
    <h3>キーワードを入れるだけで、AI が記事を書く。</h3>
    <p>JP SEO Bot は登録不要。ブラウザを開いて、最初の SEO 記事を AI に書かせてみてください。</p>
    <a class="btn" href="/app">無料で試す →</a>
  </div>`

// </script> が JSON 値に含まれると HTML パーサが script を早期終了させるためエスケープ
const jsonld = (obj) =>
  `<script type="application/ld+json">${JSON.stringify(obj).replace(/<\/script>/gi, '<\\/script>')}</script>`

// ── 記事ページ ─────────────────────────────────────
function renderArticle(a, others) {
  const url = `${SITE}/blog/${a.slug}/`
  const related = others.map((o) => `<a href="/blog/${o.slug}/">${esc(o.title)} →</a>`).join('')
  const faqHtml = a.faq.map((f) => `<div class="qa"><h3>${esc(f.q)}</h3><p>${esc(f.a)}</p></div>`).join('')
  const articleLd = jsonld({
    '@context': 'https://schema.org', '@type': 'Article',
    headline: a.title, description: a.description, inLanguage: 'ja',
    datePublished: a.date, dateModified: a.date,
    image: `${SITE}/og.png`, mainEntityOfPage: url,
    author: { '@type': 'Organization', name: PUBLISHER },
    publisher: { '@type': 'Organization', name: PUBLISHER, url: SITE + '/' },
  })
  const faqLd = jsonld({
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: a.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  })
  const crumbLd = jsonld({
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'トップ', item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: 'ブログ', item: SITE + '/blog/' },
      { '@type': 'ListItem', position: 3, name: a.title, item: url },
    ],
  })
  return `<!doctype html>
<html lang="ja">
<head>
  <title>${esc(a.title)} | JP SEO Bot</title>
  <meta name="description" content="${esc(a.description)}" />
  <link rel="canonical" href="${url}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="JP SEO Bot" />
  <meta property="og:locale" content="ja_JP" />
  <meta property="og:url" content="${url}" />
  <meta property="og:title" content="${esc(a.title)}" />
  <meta property="og:description" content="${esc(a.description)}" />
  <meta property="og:image" content="${SITE}/og.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="${SITE}/og.png" />
  ${articleLd}
  ${faqLd}
  ${crumbLd}
  ${HEAD_COMMON}
</head>
<body>
  ${NAV}
  <main class="wrap">
    <article class="article">
      <div class="crumbs"><a href="/">トップ</a> › <a href="/blog/">ブログ</a></div>
      <span class="kw">${esc(a.keyword)}</span>
      <h1>${esc(a.title)}</h1>
      <div class="date">公開日:${a.date}</div>
      <div class="body">${md2html(a.body)}</div>
      ${CTA}
      <section class="faqs"><h2>よくある質問</h2>${faqHtml}</section>
      <section class="related"><h2>関連記事</h2>${related}</section>
    </article>
  </main>
  ${FOOT}
</body>
</html>`
}

// ── ブログ一覧ページ ─────────────────────────────────
function renderIndex() {
  const cards = articles.map((a) => `
    <a class="card" href="/blog/${a.slug}/">
      <div class="kw">${esc(a.keyword)}</div>
      <h2>${esc(a.title)}</h2>
      <p>${esc(a.description)}</p>
    </a>`).join('')
  return `<!doctype html>
<html lang="ja">
<head>
  <title>SEO ブログ | JP SEO Bot</title>
  <meta name="description" content="日本語 SEO・AI 記事作成・オウンドメディア運用のノウハウを発信。中小企業が自分で SEO を進めるための実践ガイドです。" />
  <link rel="canonical" href="${SITE}/blog/" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${SITE}/blog/" />
  <meta property="og:title" content="SEO ブログ | JP SEO Bot" />
  <meta property="og:description" content="日本語 SEO・AI 記事作成・オウンドメディア運用の実践ノウハウ。" />
  <meta property="og:locale" content="ja_JP" />
  <meta property="og:image" content="${SITE}/og.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="${SITE}/og.png" />
  ${HEAD_COMMON}
</head>
<body>
  ${NAV}
  <main class="wrap">
    <section class="blog-hero">
      <p class="eyebrow">JP SEO Bot ブログ</p>
      <h1 class="display">日本語 SEO の実践ノウハウ</h1>
      <p>中小企業が自分で SEO を進め、AI で記事作成を効率化するための実践ガイドを発信しています。</p>
    </section>
    <div class="cards">${cards}</div>
  </main>
  ${FOOT}
</body>
</html>`
}

// ── sitemap.xml 再生成(LP + ブログ一覧 + 各記事)──────
function renderSitemap() {
  // ブログ一覧は記事追加のたびに変わる → 最新記事の日付を lastmod に使う(決定的でビルド毎に揺れない)
  const newest = articles.reduce((m, a) => (a.date > m ? a.date : m), '2026-06-03')
  const urls = [
    { loc: `${SITE}/`, pri: '1.0', mod: '2026-06-03' },
    { loc: `${SITE}/blog/`, pri: '0.8', mod: newest },
    ...articles.map((a) => ({ loc: `${SITE}/blog/${a.slug}/`, pri: '0.7', mod: a.date })),
  ]
  const body = urls.map((u) => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.mod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${u.pri}</priority>\n  </url>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
}

// ── 出力 ───────────────────────────────────────────
function write(rel, content) {
  const path = resolve(DIST, rel)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
  return rel
}

const out = []
out.push(write('blog/index.html', renderIndex()))
for (const a of articles) {
  const others = articles.filter((o) => o.slug !== a.slug)
  out.push(write(`blog/${a.slug}/index.html`, renderArticle(a, others)))
}
out.push(write('sitemap.xml', renderSitemap()))
console.log(`[build-blog] generated ${out.length} files:\n  ${out.join('\n  ')}`)
