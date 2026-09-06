import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { handleHealthRequest } from './health'

const root = resolve(import.meta.dirname, '..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('paid pilot claims', () => {
  it('uses the approved name, single pilot price and manual inquiry flow', () => {
    const landing = read('index.html')
    expect(landing).toContain('日本向けSEO運用アシスタント')
    expect(landing).toContain('30日SEO改善スタート診断')
    expect(landing).toContain('¥9,800')
    expect(landing).toContain('¥19,800')
    expect(landing).toContain('7営業日以内')
    expect(landing).toContain('mailto:')
    expect(landing).toContain('月額契約や自動更新ではありません')
    expect(landing).toContain('/sample-report/')
    expect(landing).not.toMatch(/¥3,300|¥6,600|¥13,200|Stripe|サブスクリプション/)
  })

  it('publishes an evidence-led dogfood report without inventing business outcomes', () => {
    const report = read('public/sample-report/index.html')
    for (const evidence of ['48', '1,990', '5', '0.3%', '53.2', '問い合わせ・売上への改善は未証明']) {
      expect(report).toContain(evidence)
    }
    expect(report).toContain('比較可能な前期GSCデータはありません')
    expect(report).toContain('成功事例やお客様の声ではありません')
    expect(report).toContain('現時点で言えないこと')
    expect(report).toContain('Google SEO')
    expect(report).toContain('Yahoo! JAPAN')
    expect(report).toContain('GEO: 現時点では可視性を測定していません')
    expect(report).toContain('保存済み指標')
  })

  it('orders the public path from safe demo and evidence into scope and purchase details', () => {
    const landing = read('index.html')
    const order = ['id="demo"', 'id="evidence"', 'id="deliverables"', 'id="how"', 'id="pricing"', 'id="trust"', 'id="faq"']
      .map(marker => landing.indexOf(marker))
    expect(order.every(index => index >= 0)).toBe(true)
    expect(order).toEqual([...order].sort((a, b) => a - b))
  })

  it('keeps active blog sources free of retired product and subscription claims', () => {
    const blogSource = read('content/blog-articles.mjs')
    expect(blogSource).not.toContain('JP SEO Bot')
    expect(blogSource).not.toMatch(/¥3,300|¥6,600|¥13,200|月額3,300円/)
    expect(blogSource).not.toMatch(/登録不要の無料トライアル|無料トライアルで生成品質/)
    expect(blogSource).not.toMatch(/私たちが(?:提供|使っている).*SEOツール|当サイト.*SEOツール|当編集部.*SEOツール/)
    expect(blogSource).not.toMatch(/\[(?:SEOツール|市販のSEO支援ツール)\]\(\/\)/)
    expect(blogSource).not.toMatch(/SEO支援ツールはSEO記事の自動生成サービス/)
  })

  it('never publishes draft evidence placeholders or their unverified claim lines', () => {
    const builder = read('scripts/build-blog.mjs')
    expect(builder).toContain("filter((line) => !evidenceGate.test(line))")
    expect(builder).not.toContain("md = md.replace(/[[【]")
    expect(read('content/blog-articles.mjs')).not.toContain('自社では、市販のSEO支援ツールを活用して新規・消失被リンクを毎週チェック')
  })

  it('keeps refund, exclusions and non-guarantee boundaries consistent', () => {
    for (const path of ['index.html', 'public/terms/index.html', 'public/tokushoho/index.html']) {
      const page = read(path)
      expect(page).toContain('納品前')
      expect(page).toContain('全額返金')
      expect(page).toContain('納品後')
      expect(page).toContain('順位')
      expect(page).toContain('保証')
    }
    const terms = read('public/terms/index.html')
    expect(terms).toContain('記事の大量作成')
    expect(terms).toContain('リンク購入')
    expect(terms).toContain('サイトのコード変更')
  })
})

describe('demo and privacy boundaries', () => {
  it('labels browser-only, heuristic, offline-sample and live-public-page modes', () => {
    const app = [
      read('app.html'),
      read('src/components/Layout.tsx'),
      read('src/pages/KeywordInput.tsx'),
      read('src/pages/KeywordDetail.tsx'),
      read('src/pages/UrlAudit.tsx'),
    ].join('\n')
    expect(app).toContain('サンプルデモ')
    expect(app).toContain('このブラウザ')
    expect(app).toContain('ヒューリスティック')
    expect(app).toContain('サンプル下書き（通信なし）')
    expect(app).toContain('ライブ取得（公開HTML）')
    expect(app).toContain('対象サイトへのログイン、書き込み、設定変更は一切')
  })

  it('keeps the active app free of retired recurring-service promises', () => {
    const app = [read('src/lib/difficulty.ts'), read('src/pages/KeywordDetail.tsx'), read('src/pages/KeywordInput.tsx'), read('src/store/StoreProvider.tsx')].join('\n')
    expect(app).not.toMatch(/毎月\s*[248]\s*本|自動で実施|紹介リンクを増やす|プレスリリースを配信|上位表示を強力に後押し|今月の目標/)
    expect(app).toContain('優先課題 Top 10')
    expect(app).toContain('競合 2〜3 サイト')
    expect(app).toContain('seo-operations-assistant:store-v4')
    expect(app).not.toContain("jp-seo-bot:store-v3'")
  })

  it('names optional processors and offers support and deletion', () => {
    const privacy = read('public/privacy/index.html')
    expect(privacy).toContain('DeepSeek')
    expect(privacy).toContain('DataForSEO')
    expect(privacy).toContain('削除')
    expect(privacy).toContain('閲覧専用権限')
  })
})

describe('deployment safeguards', () => {
  it('uses only the canonical domain and emits security headers', () => {
    const files = [read('README.md'), read('index.html'), read('vercel.json')].join('\n')
    expect(files).toContain('https://enkiseojp.com/')
    expect(files).not.toContain('jp-seo-bot.vercel.app')
    const vercel = read('vercel.json')
    for (const header of ['Content-Security-Policy', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy']) {
      expect(vercel).toContain(header)
    }
  })

  it('provides a minimal health probe without configuration details', async () => {
    const response = await handleHealthRequest(new Request('https://enkiseojp.com/api/health'))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok' })
    expect(response.headers.get('cache-control')).toBe('no-store')
  })
})
