import { useEffect, useMemo, useState } from 'react'
import { Search, Sparkles } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import SectionTitle from '../components/SectionTitle'
import MiniSpark from '../components/MiniSpark'
import { useStore } from '../store/StoreProvider'
import { useT } from '../lib/i18n'
import { extractKeyNouns, posBreakdown, type PosBreakdown, type Token, tokenize } from '../lib/japaneseNlp'
import { generateVariants, type JapaneseVariants } from '../lib/japaneseVariants'

const INTENT_BADGE: Record<string, string> = {
  informational: 'badge-blue',
  commercial: 'badge-green',
  navigational: 'badge-amber',
  transactional: 'badge-red',
}

const INTENT_KEYS: Record<string, string> = {
  informational: 'intent.informational',
  commercial: 'intent.commercial',
  navigational: 'intent.navigational',
  transactional: 'intent.transactional',
}

export default function Keywords() {
  const { t } = useT()
  const { keywords, currentSiteId } = useStore()
  const [filter, setFilter] = useState('')
  const [intent, setIntent] = useState<string>('all')
  const [analysisInput, setAnalysisInput] = useState('SEO 対策 ツール の選び方とおすすめ製品の比較')
  const [tokens, setTokens] = useState<Token[]>([])
  const [nouns, setNouns] = useState<string[]>([])
  const [variants, setVariants] = useState<JapaneseVariants | null>(null)
  const [pos, setPos] = useState<PosBreakdown[]>([])
  const [loading, setLoading] = useState(false)
  const [tokenizerReady, setTokenizerReady] = useState(false)

  const list = useMemo(() => {
    return keywords
      .filter(k => k.siteId === currentSiteId)
      .filter(k => k.keyword.includes(filter))
      .filter(k => intent === 'all' || k.intent === intent)
  }, [keywords, currentSiteId, filter, intent])

  async function analyze() {
    setLoading(true)
    try {
      const [tk, kn, ps] = await Promise.all([
        tokenize(analysisInput),
        extractKeyNouns(analysisInput),
        posBreakdown(analysisInput),
      ])
      setTokens(tk)
      setNouns(kn)
      setPos(ps)
      setVariants(generateVariants(analysisInput))
      setTokenizerReady(true)
    } catch (err) {
      console.error('NLP error', err)
      setTokenizerReady(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    analyze().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      <PageHeader
        title={t('page.keywords.title')}
        subtitle={t('page.keywords.subtitle')}
        spec="JAPAN_SPEC §A"
      />

      <div className="card mb-6">
        <SectionTitle hint="kuromoji.js による日本語形態素解析 + 表記バリアント生成">
          <span className="inline-flex items-center gap-2">
            <Sparkles className="size-4 text-brand-500" />
            日本語 NLP 解析
          </span>
        </SectionTitle>
        <div className="flex flex-col md:flex-row gap-3">
          <textarea
            value={analysisInput}
            onChange={e => setAnalysisInput(e.target.value)}
            className="pill-input flex-1 min-h-[72px]"
            placeholder="解析したい日本語テキストを入力 (例:「SEO 対策ツール 比較」)"
          />
          <button onClick={analyze} disabled={loading || !analysisInput.trim()} className="btn-primary self-start whitespace-nowrap">
            {loading ? '解析中…' : '解析する'}
          </button>
        </div>

        {!tokenizerReady && !loading ? (
          <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            kuromoji.js 辞書(/dict)が読み込めません。初回ロード時は数秒かかります。再度「解析する」をクリックしてください。
          </div>
        ) : null}

        {variants ? (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-[11px] uppercase text-slate-500 mb-1">原文</div>
              <div className="font-medium break-words">{variants.original}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-[11px] uppercase text-slate-500 mb-1">ひらがな</div>
              <div className="font-medium break-words">{variants.hiragana}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-[11px] uppercase text-slate-500 mb-1">カタカナ</div>
              <div className="font-medium break-words">{variants.katakana}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-[11px] uppercase text-slate-500 mb-1">ローマ字 (ヘボン式)</div>
              <div className="font-mono text-xs break-words">{variants.romaji}</div>
            </div>
          </div>
        ) : null}

        {tokens.length > 0 ? (
          <div className="mt-4">
            <div className="text-xs font-semibold text-slate-700 mb-2">形態素分解</div>
            <div className="flex flex-wrap gap-1.5">
              {tokens.map((t, i) => (
                <span
                  key={i}
                  className={
                    'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs ' +
                    (t.pos === '名詞'
                      ? 'border-brand-200 bg-brand-50 text-brand-700'
                      : t.pos === '動詞'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : t.pos === '形容詞'
                          ? 'border-amber-200 bg-amber-50 text-amber-700'
                          : 'border-slate-200 bg-slate-50 text-slate-600')
                  }
                >
                  <span className="font-medium">{t.surface_form}</span>
                  <span className="text-[10px] opacity-70">{t.pos}</span>
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {nouns.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-semibold text-slate-700 mb-2">
                SEO 重要名詞 ({nouns.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {nouns.map((n, i) => (
                  <span key={i} className="badge-blue">{n}</span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-700 mb-2">品詞分布</div>
              <ul className="space-y-1.5">
                {pos.map(p => (
                  <li key={p.pos} className="flex items-center gap-2 text-xs">
                    <span className="w-16 shrink-0 font-medium text-slate-700">{p.pos}</span>
                    <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-brand-500"
                        style={{ width: `${(p.count / Math.max(...pos.map(x => x.count))) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-slate-500">{p.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>

      <div className="card">
        <SectionTitle
          hint={`このサイトの追跡キーワード ${list.length} 件`}
          actions={
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input value={filter} onChange={e => setFilter(e.target.value)} className="pill-input pl-8" placeholder="キーワード絞り込み" />
              </div>
              <select value={intent} onChange={e => setIntent(e.target.value)} className="pill-input">
                <option value="all">全 intent</option>
                <option value="informational">情報</option>
                <option value="commercial">商業</option>
                <option value="navigational">指名</option>
                <option value="transactional">取引</option>
              </select>
            </div>
          }
        >
          キーワード一覧
        </SectionTitle>
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-head">キーワード</th>
              <th className="table-head">クラスタ</th>
              <th className="table-head">Intent</th>
              <th className="table-head text-right">月間検索数</th>
              <th className="table-head text-right">難易度</th>
              <th className="table-head text-right">現在順位</th>
              <th className="table-head">12 ヶ月推移</th>
            </tr>
          </thead>
          <tbody>
            {list.map(k => (
              <tr key={k.id} className="border-t border-slate-100">
                <td className="table-cell font-medium text-slate-900">{k.keyword}</td>
                <td className="table-cell text-slate-500">{k.cluster}</td>
                <td className="table-cell">
                  <span className={INTENT_BADGE[k.intent] ?? 'badge-gray'}>{t(INTENT_KEYS[k.intent] ?? k.intent)}</span>
                </td>
                <td className="table-cell text-right tabular-nums">{k.searchVolume.toLocaleString()}</td>
                <td className="table-cell text-right">
                  <span className={k.difficulty >= 60 ? 'badge-red' : k.difficulty >= 40 ? 'badge-amber' : 'badge-green'}>
                    {k.difficulty}
                  </span>
                </td>
                <td className="table-cell text-right tabular-nums font-semibold">
                  {k.rank == null ? <span className="text-slate-400">圏外</span> : k.rank}
                </td>
                <td className="table-cell">
                  {k.rank == null ? <span className="text-xs text-slate-400">—</span> : <MiniSpark data={[...k.trend].reverse()} stroke="#10b981" />}
                </td>
              </tr>
            ))}
            {list.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-400">該当キーワードがありません</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
