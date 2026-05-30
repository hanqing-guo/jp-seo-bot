// 満分 SEO 記事生成エンジン — api/ (Vercel) と supabase/functions (Deno) の共通コア
// 「普通の AI 記事」を「検索1ページ目を狙える満分 SEO 記事」に引き上げる。
//
// 提供する純関数(Deno / Vercel 両方で動く・ランタイム非依存):
//   buildSeoPrompt()    — 検索意図 + E-E-A-T + 構造化を強制する SEO prompt
//   parseSeoResponse()  — AI の JSON 出力を SeoArticle 構造にパース
//   buildSchemaJsonLd() — Article + FAQPage の JSON-LD 構造化データを自動生成

export interface SeoFaq {
  q: string
  a: string
}

export interface SeoArticle {
  title: string
  metaDescription: string
  markdown: string
  faq: SeoFaq[]
  relatedKeywords: string[]
  schemaJsonLd: string
  targetKeyword: string
  provider: string
}

// 記事の切り口(検索意図のバリエーション)
export const SEO_ANGLES = [
  'とは?基礎から徹底解説',
  'の選び方 — 失敗しない5つのポイント',
  'おすすめ比較【2026年最新】',
  'の費用・料金相場まとめ',
  '導入事例と成功パターン',
  'のよくある質問(FAQ)',
  '初心者向け完全ガイド',
  '自分でやる手順【保存版】',
]

// ── 満分 SEO prompt ────────────────────────────────────────────
// 検索意図の分析 → オンページ最適化 → E-E-A-T → FAQ を AI に強制する。
// 「[ここに体験談/データを追記]」の枠が、後で人間が本物の一次情報を1つ足す
// "編集ゲート"であり、Google の「薄いAI量産」ペナルティを回避する鍵。
export function buildSeoPrompt(keyword: string, angle: string): string {
  return `あなたは日本市場専門の、実績豊富なSEOライター兼コンサルタントです。
以下のキーワードで Google Japan / Yahoo! JAPAN の検索1ページ目を狙える、
「読者の検索意図を完全に満たす」高品質な日本語SEO記事を書いてください。

【ターゲットキーワード】${keyword}
【記事の切り口】${keyword}${angle}

# ① まず検索意図を分析する
このキーワードで検索する人が「本当に知りたいこと・解決したいこと」を見極め、
記事全体をそれに100%応える構成にすること。

# ② 構成ルール(オンページSEO)
- H1(タイトル)にキーワードを含め、32文字以内、クリックしたくなる具体性を持たせる
- 導入文の最初の100文字以内に、キーワードを自然に含める
- H2で検索意図を分解した見出しを3〜5個作る(必要に応じてH3)
- 各セクションは「結論 → 理由 → 具体例」の順で、簡潔で読みやすく
- 末尾に「まとめ」セクション

# ③ E-E-A-T(Googleが2026年に最重視 — 薄いAI量産は順位下落)
- 専門家としての視点、具体的な数字・手順・チェックリストを入れる
- 「一般論」で薄く流さず、現場で使える実践情報にする
- 誇大表現・断定的な効果保証は禁止(薬機法・景品表示法に配慮)
- 実体験や自社データを入れるべき箇所には [ここに体験談/データを追記] と明記する
  (後で人間が本物の事例を1つ足すための枠。これがGoogleペナルティ回避の鍵)

# ④ FAQ
読者が必ず疑問に思う質問を3〜5個、それぞれ簡潔な回答とセットで用意する。

# ⑤ 出力形式(JSONのみ。コードフェンス・前置き不要)
{
  "title": "タイトル(32文字以内・キーワードを含む)",
  "metaDescription": "120文字以内のメタdescription(キーワードを含み、クリックを促す)",
  "markdown": "記事本文(Markdown形式、# H1から始める)",
  "faq": [{"q": "質問文", "a": "回答文"}],
  "relatedKeywords": ["共起語・関連キーワードを5個程度"]
}`
}

// ── AI 出力のパース ────────────────────────────────────────────
export function parseSeoResponse(
  raw: string,
  keyword: string,
): Omit<SeoArticle, 'schemaJsonLd' | 'provider'> {
  const cleaned = raw.replace(/```json\s*|\s*```/g, '').trim()
  const obj = JSON.parse(cleaned) as Partial<{
    title: string
    metaDescription: string
    markdown: string
    faq: SeoFaq[]
    relatedKeywords: string[]
  }>
  if (!obj.markdown) throw new Error('missing markdown')
  return {
    title: obj.title ?? keyword,
    metaDescription: obj.metaDescription ?? '',
    markdown: obj.markdown,
    faq: Array.isArray(obj.faq) ? obj.faq.filter((f) => f?.q && f?.a) : [],
    relatedKeywords: Array.isArray(obj.relatedKeywords) ? obj.relatedKeywords : [],
    targetKeyword: keyword,
  }
}

// ── JSON-LD 構造化データ生成(Article + FAQPage) ─────────────────
// AI Overview / リッチリザルト対策。FAQPage は検索結果でFAQが展開され CTR が上がる。
export function buildSchemaJsonLd(
  a: { title: string; metaDescription: string; faq: SeoFaq[] },
  opts: { url?: string; datePublished?: string; author?: string } = {},
): string {
  const datePublished = opts.datePublished ?? new Date().toISOString().slice(0, 10)
  const graph: unknown[] = [
    {
      '@type': 'Article',
      headline: a.title,
      description: a.metaDescription,
      datePublished,
      dateModified: datePublished,
      author: { '@type': 'Organization', name: opts.author ?? 'JP SEO Bot' },
      ...(opts.url ? { mainEntityOfPage: { '@type': 'WebPage', '@id': opts.url } } : {}),
    },
  ]
  if (a.faq.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: a.faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    })
  }
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })
}
