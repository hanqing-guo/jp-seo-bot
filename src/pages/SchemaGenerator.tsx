import { useMemo, useState } from 'react'
import { CheckCircle2, Clipboard, Code2 } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import SectionTitle from '../components/SectionTitle'
import { JAPAN_RICH_RESULTS } from '../store/mockData'

type SchemaType = 'LocalBusiness' | 'FAQ' | 'Breadcrumb' | 'Article' | 'SoftwareApplication'

interface FaqRow { question: string; answer: string }
interface BreadcrumbRow { name: string; url: string }

const DEFAULT_FAQS: FaqRow[] = [
  { question: 'SEO 対策ツールは中小企業でも必要ですか？', answer: '月額数千円〜数万円の予算でも、基本的な順位分析・競合調査を行えます。' },
  { question: '効果が出るまでどのくらいかかりますか？', answer: '一般的に 3〜6 ヶ月で初期効果、12 ヶ月で本格的な流入増加が見込めます。' },
  { question: 'AI が生成した記事は SEO 上問題ありませんか？', answer: 'Google は AI 生成自体を否定していません。E-E-A-T を満たすことが重要です。' },
]

const DEFAULT_BREADCRUMBS: BreadcrumbRow[] = [
  { name: 'ホーム', url: 'https://magic.example.co.jp/' },
  { name: 'ブログ', url: 'https://magic.example.co.jp/blog' },
  { name: 'SEO 対策', url: 'https://magic.example.co.jp/blog/seo' },
  { name: 'SEO 対策ツール 12 選', url: 'https://magic.example.co.jp/blog/seo/tools-2026' },
]

export default function SchemaGenerator() {
  const [type, setType] = useState<SchemaType>('LocalBusiness')
  const [copied, setCopied] = useState(false)

  const [lbName, setLbName] = useState('株式会社マジック')
  const [lbDesc, setLbDesc] = useState('日本市場特化 SEO プラットフォーム')
  const [lbStreet, setLbStreet] = useState('港区赤坂 1-2-3 マジックビル 5F')
  const [lbCity, setLbCity] = useState('港区')
  const [lbPref, setLbPref] = useState('東京都')
  const [lbZip, setLbZip] = useState('107-0052')
  const [lbPhone, setLbPhone] = useState('+81-3-1234-5678')
  const [lbUrl, setLbUrl] = useState('https://magic.example.co.jp')
  const [lbHours, setLbHours] = useState('Mo-Fr 09:00-18:00')

  const [faqs, setFaqs] = useState<FaqRow[]>(DEFAULT_FAQS)
  const [crumbs, setCrumbs] = useState<BreadcrumbRow[]>(DEFAULT_BREADCRUMBS)

  const [artTitle, setArtTitle] = useState('【2026年版】SEO 対策ツール 12 選 比較')
  const [artDesc, setArtDesc] = useState('2026 年最新版。SEO 対策ツール 12 製品を機能・料金・サポート体制まで徹底比較。')
  const [artAuthor, setArtAuthor] = useState('山田 太郎')
  const [artPub, setArtPub] = useState('2026-04-18')
  const [artUpd, setArtUpd] = useState('2026-05-28')

  const [appName, setAppName] = useState('JP SEO Bot')
  const [appDesc, setAppDesc] = useState('日本市場特化 SEO プラットフォーム — 日本語 NLP / 被リンク / MEO / WordPress 連携')
  const [appPrice, setAppPrice] = useState('29800')
  const [appCategory, setAppCategory] = useState('BusinessApplication')

  const jsonld = useMemo(() => {
    if (type === 'LocalBusiness') {
      return {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: lbName,
        description: lbDesc,
        address: {
          '@type': 'PostalAddress',
          streetAddress: lbStreet,
          addressLocality: lbCity,
          addressRegion: lbPref,
          postalCode: lbZip,
          addressCountry: 'JP',
        },
        telephone: lbPhone,
        url: lbUrl,
        openingHours: lbHours,
        priceRange: '¥¥',
        inLanguage: 'ja',
      }
    }
    if (type === 'FAQ') {
      return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map(f => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
      }
    }
    if (type === 'Breadcrumb') {
      return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((c, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: c.name,
          item: c.url,
        })),
      }
    }
    if (type === 'Article') {
      return {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: artTitle,
        description: artDesc,
        author: { '@type': 'Person', name: artAuthor },
        publisher: { '@type': 'Organization', name: '株式会社マジック' },
        datePublished: artPub,
        dateModified: artUpd,
        inLanguage: 'ja',
      }
    }
    return {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: appName,
      description: appDesc,
      offers: { '@type': 'Offer', price: appPrice, priceCurrency: 'JPY' },
      operatingSystem: 'Web',
      applicationCategory: appCategory,
      inLanguage: 'ja',
    }
  }, [type, lbName, lbDesc, lbStreet, lbCity, lbPref, lbZip, lbPhone, lbUrl, lbHours, faqs, crumbs, artTitle, artDesc, artAuthor, artPub, artUpd, appName, appDesc, appPrice, appCategory])

  const jsonString = JSON.stringify(jsonld, null, 2)

  async function copy() {
    try {
      await navigator.clipboard.writeText(`<script type="application/ld+json">\n${jsonString}\n</script>`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  return (
    <div>
      <PageHeader
        title="Schema Markup ジェネレーター"
        subtitle="日本市場で効果的な 5 種類の JSON-LD を生成"
        spec="JAPAN_SPEC §E + §G"
      />

      <div className="card mb-6">
        <SectionTitle hint="JAPAN_SPEC §G — 日本語コンテンツに特に効果の高いリッチリザルト">日本特化リッチリザルト</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {JAPAN_RICH_RESULTS.map(r => (
            <div key={r.type} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-900 text-sm">{r.type}</h3>
                <span
                  className={r.impact === 'critical' ? 'badge-red' : r.impact === 'high' ? 'badge-amber' : 'badge-blue'}
                >
                  {r.impact}
                </span>
              </div>
              <p className="text-xs text-slate-500">{r.description}</p>
              <p className="text-[11px] text-slate-400 mt-1">適応: {r.bestFor}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <SectionTitle
          hint="フォーム入力で JSON-LD を生成"
          actions={
            <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
              {(['LocalBusiness', 'FAQ', 'Breadcrumb', 'Article', 'SoftwareApplication'] as SchemaType[]).map(s => (
                <button
                  key={s}
                  onClick={() => setType(s)}
                  className={'px-3 py-1 rounded-md transition-colors ' + (type === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900')}
                >
                  {s}
                </button>
              ))}
            </div>
          }
        >
          ジェネレーター
        </SectionTitle>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            {type === 'LocalBusiness' ? (
              <>
                <Field label="事業者名" value={lbName} onChange={setLbName} />
                <Field label="説明文" value={lbDesc} onChange={setLbDesc} textarea />
                <div className="grid grid-cols-2 gap-2">
                  <Field label="住所" value={lbStreet} onChange={setLbStreet} />
                  <Field label="郵便番号" value={lbZip} onChange={setLbZip} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="市区町村" value={lbCity} onChange={setLbCity} />
                  <Field label="都道府県" value={lbPref} onChange={setLbPref} />
                </div>
                <Field label="電話" value={lbPhone} onChange={setLbPhone} />
                <Field label="URL" value={lbUrl} onChange={setLbUrl} />
                <Field label="営業時間 (例: Mo-Fr 09:00-18:00)" value={lbHours} onChange={setLbHours} />
              </>
            ) : null}

            {type === 'FAQ' ? (
              <div>
                <label className="text-xs text-slate-500 block mb-2">FAQ 項目</label>
                <div className="space-y-3">
                  {faqs.map((f, i) => (
                    <div key={i} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-500">Q{i + 1}</span>
                        <button onClick={() => setFaqs(arr => arr.filter((_, j) => j !== i))} className="text-xs text-rose-600 hover:underline">削除</button>
                      </div>
                      <input
                        value={f.question}
                        onChange={e => setFaqs(arr => arr.map((x, j) => (i === j ? { ...x, question: e.target.value } : x)))}
                        className="pill-input w-full mb-1"
                        placeholder="質問"
                      />
                      <textarea
                        value={f.answer}
                        onChange={e => setFaqs(arr => arr.map((x, j) => (i === j ? { ...x, answer: e.target.value } : x)))}
                        className="pill-input w-full"
                        rows={2}
                        placeholder="回答"
                      />
                    </div>
                  ))}
                </div>
                <button onClick={() => setFaqs(arr => [...arr, { question: '', answer: '' }])} className="btn-ghost w-full mt-3 text-xs">
                  Q&A を追加
                </button>
              </div>
            ) : null}

            {type === 'Breadcrumb' ? (
              <div>
                <label className="text-xs text-slate-500 block mb-2">パンくず階層</label>
                {crumbs.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <span className="badge-gray w-6 text-center">{i + 1}</span>
                    <input
                      value={c.name}
                      onChange={e => setCrumbs(arr => arr.map((x, j) => (i === j ? { ...x, name: e.target.value } : x)))}
                      className="pill-input flex-1"
                      placeholder="表示名"
                    />
                    <input
                      value={c.url}
                      onChange={e => setCrumbs(arr => arr.map((x, j) => (i === j ? { ...x, url: e.target.value } : x)))}
                      className="pill-input flex-[2]"
                      placeholder="URL"
                    />
                    <button onClick={() => setCrumbs(arr => arr.filter((_, j) => j !== i))} className="text-xs text-rose-600 hover:underline">×</button>
                  </div>
                ))}
                <button onClick={() => setCrumbs(arr => [...arr, { name: '', url: '' }])} className="btn-ghost w-full mt-2 text-xs">
                  階層を追加
                </button>
              </div>
            ) : null}

            {type === 'Article' ? (
              <>
                <Field label="タイトル (headline)" value={artTitle} onChange={setArtTitle} />
                <Field label="説明" value={artDesc} onChange={setArtDesc} textarea />
                <Field label="著者" value={artAuthor} onChange={setArtAuthor} />
                <div className="grid grid-cols-2 gap-2">
                  <Field label="公開日" value={artPub} onChange={setArtPub} type="date" />
                  <Field label="更新日" value={artUpd} onChange={setArtUpd} type="date" />
                </div>
              </>
            ) : null}

            {type === 'SoftwareApplication' ? (
              <>
                <Field label="製品名" value={appName} onChange={setAppName} />
                <Field label="説明" value={appDesc} onChange={setAppDesc} textarea />
                <Field label="価格 (JPY)" value={appPrice} onChange={setAppPrice} />
                <Field label="アプリカテゴリ" value={appCategory} onChange={setAppCategory} />
              </>
            ) : null}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700 inline-flex items-center gap-2">
                <Code2 className="size-4" /> JSON-LD 出力
              </span>
              <button onClick={copy} className="btn-ghost text-xs">
                {copied ? <CheckCircle2 className="size-3.5 mr-1 text-emerald-600" /> : <Clipboard className="size-3.5 mr-1" />}
                {copied ? 'コピー済み' : '<script> 全文コピー'}
              </button>
            </div>
            <pre className="rounded-lg bg-slate-900 text-slate-100 p-3 text-[11px] leading-relaxed overflow-x-auto max-h-[420px] overflow-y-auto">
              <span className="text-slate-400">{'<script type="application/ld+json">'}</span>
              {'\n' + jsonString + '\n'}
              <span className="text-slate-400">{'</script>'}</span>
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  textarea,
  type,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  textarea?: boolean
  type?: string
}) {
  return (
    <div>
      <label className="text-xs text-slate-500">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} className="pill-input w-full mt-1" rows={2} />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} className="pill-input w-full mt-1" type={type ?? 'text'} />
      )}
    </div>
  )
}
