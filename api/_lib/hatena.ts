// はてなブログ AtomPub 自動投稿クライアント — Deno / Vercel 両対応(btoa/fetch のみ使用)
//
// 認証: Basic (はてなID : APIキー)  ※APIキーはアカウント設定で取得・env で渡す
// エンドポイント: https://blog.hatena.ne.jp/{はてなID}/{ブログID}/atom/entry
//
// seoGen が生成した Markdown 記事を HTML に変換し、Schema(JSON-LD)を埋め込んで投稿する。

export interface HatenaConfig {
  hatenaId: string // 例: han2026
  blogId: string // 例: han2026.hatenablog.com
  apiKey: string // アカウント設定の API キー(機密。env から渡す)
}

export interface HatenaPostInput {
  title: string
  markdown: string
  schemaJsonLd?: string // <script type="application/ld+json"> として本文末尾に埋め込む
  categories?: string[]
  draft?: boolean // true=下書き / false=公開(デフォルトは下書き=安全側)
}

export interface HatenaPostResult {
  url: string // 公開(または下書きプレビュー)URL
  editUrl: string // 編集URL
}

// XML エスケープ
function escXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// 最小限の Markdown → HTML 変換(SEO 記事で使う要素を網羅)
export function markdownToHtml(md: string): string {
  const lines = md.split('\n')
  const out: string[] = []
  let inUl = false
  let inOl = false
  const closeList = () => {
    if (inUl) {
      out.push('</ul>')
      inUl = false
    }
    if (inOl) {
      out.push('</ol>')
      inOl = false
    }
  }
  const inline = (s: string) =>
    s
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '')
    if (!line.trim()) {
      closeList()
      continue
    }
    let m: RegExpMatchArray | null
    if ((m = line.match(/^### (.+)/))) {
      closeList()
      out.push(`<h3>${inline(m[1])}</h3>`)
    } else if ((m = line.match(/^## (.+)/))) {
      closeList()
      out.push(`<h2>${inline(m[1])}</h2>`)
    } else if ((m = line.match(/^# (.+)/))) {
      closeList()
      out.push(`<h1>${inline(m[1])}</h1>`)
    } else if ((m = line.match(/^>\s?(.*)/))) {
      closeList()
      out.push(`<blockquote>${inline(m[1])}</blockquote>`)
    } else if ((m = line.match(/^[-*]\s+(.+)/))) {
      if (!inUl) {
        closeList()
        out.push('<ul>')
        inUl = true
      }
      out.push(`<li>${inline(m[1])}</li>`)
    } else if ((m = line.match(/^\d+\.\s+(.+)/))) {
      if (!inOl) {
        closeList()
        out.push('<ol>')
        inOl = true
      }
      out.push(`<li>${inline(m[1])}</li>`)
    } else {
      closeList()
      out.push(`<p>${inline(line)}</p>`)
    }
  }
  closeList()
  return out.join('\n')
}

// はてなブログへ投稿
export async function postToHatena(
  config: HatenaConfig,
  input: HatenaPostInput,
): Promise<HatenaPostResult> {
  const endpoint = `https://blog.hatena.ne.jp/${config.hatenaId}/${config.blogId}/atom/entry`
  const now = new Date().toISOString()
  const draft = input.draft === false ? 'no' : 'yes' // 既定は下書き(安全側)

  let html = markdownToHtml(input.markdown)
  if (input.schemaJsonLd) {
    html += `\n<script type="application/ld+json">${input.schemaJsonLd}</script>`
  }

  const categories = (input.categories ?? [])
    .map((c) => `<category term="${escXml(c)}" />`)
    .join('')

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<entry xmlns="http://www.w3.org/2005/Atom" xmlns:app="http://www.w3.org/2007/app">
  <title>${escXml(input.title)}</title>
  <content type="text/html">${escXml(html)}</content>
  <updated>${now}</updated>
  ${categories}
  <app:control><app:draft>${draft}</app:draft></app:control>
</entry>`

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${config.hatenaId}:${config.apiKey}`),
      'Content-Type': 'application/atom+xml; charset=utf-8',
    },
    body: xml,
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Hatena AtomPub HTTP ${res.status}: ${body.slice(0, 300)}`)
  }

  const rxml = await res.text()
  const url =
    rxml.match(/rel="alternate"[^>]*href="([^"]+)"/)?.[1] ??
    rxml.match(/href="([^"]+)"[^>]*rel="alternate"/)?.[1] ??
    ''
  const editUrl =
    rxml.match(/rel="edit"[^>]*href="([^"]+)"/)?.[1] ??
    rxml.match(/href="([^"]+)"[^>]*rel="edit"/)?.[1] ??
    ''
  return { url, editUrl }
}
