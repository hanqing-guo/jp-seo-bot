// Edge Function — generate-article
// DeepSeek / Claude / template を env で切替えて日本語 SEO 記事を生成。
//
// 環境変数:
//   DEEPSEEK_API_KEY   → DeepSeek (deepseek-chat, OpenAI 互換)
//   ANTHROPIC_API_KEY  → Claude (claude-sonnet-4-20250514)
//   どちらも無い        → template fallback
//
// 入力: { keyword: string, tier: 'easy'|'medium'|'hard', count: number }
// 出力: { articles: [{ title, markdown, provider }] }

declare const Deno: { env: { get: (k: string) => string | undefined } }

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ReqBody {
  keyword: string
  tier?: 'easy' | 'medium' | 'hard'
  count?: number
}

interface DraftArticle {
  title: string
  markdown: string
  provider: string
}

const ANGLES = [
  'とは?基礎から徹底解説',
  'の選び方 — 失敗しない 5 つのポイント',
  'おすすめ比較【2026 年最新版】',
  'の料金・費用相場まとめ',
  '導入事例と成功パターン',
  'のよくある質問(FAQ)',
  '初心者向け完全ガイド',
  '最新トレンドと今後の展望',
]

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json(405, { error: 'METHOD_NOT_ALLOWED' })

  let body: ReqBody
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'INVALID_JSON' })
  }

  const keyword = (body.keyword ?? '').trim()
  if (!keyword) return json(400, { error: 'KEYWORD_REQUIRED', message: 'keyword は必須です' })
  const count = Math.max(1, Math.min(8, body.count ?? 2))

  const deepseek = Deno.env.get('DEEPSEEK_API_KEY')
  const anthropic = Deno.env.get('ANTHROPIC_API_KEY')

  let articles: DraftArticle[]
  try {
    if (deepseek) {
      articles = await Promise.all(
        Array.from({ length: count }, (_, i) =>
          genWithDeepSeek(keyword, ANGLES[i % ANGLES.length], deepseek),
        ),
      )
    } else if (anthropic) {
      articles = await Promise.all(
        Array.from({ length: count }, (_, i) =>
          genWithClaude(keyword, ANGLES[i % ANGLES.length], anthropic),
        ),
      )
    } else {
      articles = Array.from({ length: count }, (_, i) =>
        templateArticle(keyword, ANGLES[i % ANGLES.length]),
      )
    }
  } catch (e) {
    // どれか失敗したら template で穴埋め(全滅させない)
    console.error('generation error', e)
    articles = Array.from({ length: count }, (_, i) =>
      templateArticle(keyword, ANGLES[i % ANGLES.length]),
    )
  }

  return json(200, { articles })
}

function buildPrompt(keyword: string, angle: string): string {
  return `あなたは日本市場専門の SEO ライターです。
以下のキーワードで、Google Japan / Yahoo Japan の検索 1 ページ目を狙える
日本語 SEO 記事の下書きを Markdown で書いてください。

【キーワード】${keyword}
【記事の切り口】${keyword}${angle}

要件:
- 2,000〜3,000 文字程度
- H1 を 1 つ、H2 を 3〜5 つ、必要に応じて H3
- 冒頭に導入文、末尾にまとめ
- FAQ セクション(よくある質問 3 つ)を含める
- E-E-A-T を意識し、具体例・数字を入れる
- 薬機法・景品表示法に触れる誇大表現は避ける
- 自然にキーワードと共起語を含める(キーワード詰め込みは禁止)

JSON のみを返してください(コードフェンス不要):
{"title": "記事タイトル(32 文字以内)", "markdown": "Markdown 本文"}`
}

async function genWithDeepSeek(keyword: string, angle: string, key: string): Promise<DraftArticle> {
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: buildPrompt(keyword, angle) }],
      response_format: { type: 'json_object' },
      max_tokens: 4000,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(55000),
  })
  if (!res.ok) throw new Error(`DeepSeek HTTP ${res.status}`)
  const data = await res.json()
  const parsed = parseArticle(data?.choices?.[0]?.message?.content ?? '')
  return { ...parsed, provider: 'deepseek' }
}

async function genWithClaude(keyword: string, angle: string, key: string): Promise<DraftArticle> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: buildPrompt(keyword, angle) }],
    }),
    signal: AbortSignal.timeout(55000),
  })
  if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}`)
  const data = await res.json()
  const parsed = parseArticle((data?.content?.[0]?.text ?? '') as string)
  return { ...parsed, provider: 'claude' }
}

function parseArticle(text: string): { title: string; markdown: string } {
  const cleaned = text.replace(/```json\s*|\s*```/g, '').trim()
  const obj = JSON.parse(cleaned) as { title?: string; markdown?: string }
  if (!obj.markdown) throw new Error('missing markdown')
  return { title: obj.title ?? '無題', markdown: obj.markdown }
}

function templateArticle(keyword: string, angle: string): DraftArticle {
  const title = `${keyword}${angle}`
  const today = new Date().toISOString().slice(0, 10)
  return {
    title,
    provider: 'template',
    markdown: `# ${title}

最終更新: ${today} | 著者: JP SEO Bot 編集部

## はじめに
「${keyword}」について、初めての方にもわかりやすく解説します。

## ${keyword}の基本
${keyword}は日本市場で注目されているテーマです。基礎を押さえることが成果への第一歩です。

## 押さえるべきポイント
1. 品質の確保
2. 費用対効果のバランス
3. 中長期での継続

## よくある質問(FAQ)
**Q. 費用はどのくらい?** A. 月数千円から始められます。
**Q. 効果が出るまで?** A. 3〜10 ヶ月が目安です。

## まとめ
${keyword}は小さく始めて改善を重ねることが成功の近道です。

---
※ API キー未設定のため template 生成です。DEEPSEEK_API_KEY か ANTHROPIC_API_KEY を設定すると本物の AI 記事になります。`,
  }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
