import { useMemo, useState } from 'react'
import { ExternalLink, Sparkles, Wand2 } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import SectionTitle from '../components/SectionTitle'
import Stat from '../components/Stat'
import { useStore } from '../store/StoreProvider'
import type { BacklinkSource } from '../store/types'

const CATEGORY_LABEL: Record<string, string> = {
  blog: 'ブログ',
  press_release: 'プレスリリース',
  comparison: '比較サイト',
  portal: 'ポータル / MEO',
  community: 'コミュニティ / 技術',
  authoritative: '権威機関',
}

const STRENGTH_LABEL: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  very_high: '極めて高',
  critical: '最重要',
}

const LINK_LABEL: Record<string, string> = {
  dofollow: 'dofollow',
  nofollow: 'nofollow',
  nofollow_mostly: 'nofollow 主体',
  mixed: '混在',
}

const STATUS_LABEL: Record<BacklinkSource['status'], string> = {
  not_registered: '未登録',
  in_progress: '進行中',
  registered: '登録済',
  failed: '失敗',
}

const PR_SAMPLE = (kw: string, biz: string) => `### プレスリリース下書き（PR TIMES 投稿用）

【${biz}】「${kw}」をテーマにした新サービスを発表 — 2026 年 X 月 X 日提供開始

報道関係者各位

${biz}（本社：東京都〇〇区、代表取締役：〇〇 〇〇）は、「${kw}」に関する新サービスを 2026 年 X 月 X 日より提供開始することを発表いたします。本リリースでは背景・特長・今後の展開について解説いたします。

## サービス概要
${kw} 領域における中小企業の課題を解決するため、専門ノウハウと AI 技術を組み合わせたサービスを新たに提供開始します。

## 開発の背景
2026 年に入り、日本国内で「${kw}」に関する検索数は前年比 1.8 倍に増加。情報の非対称性が課題となっており、信頼できる情報源が求められていました。

## 特長
1. 専門家監修による高精度なコンテンツ
2. 日本語 NLP に基づく自動最適化
3. 国内主要プラットフォームへの一括連携

## 今後の展開
2026 年下半期には大手企業向けエンタープライズプランを提供予定。

## 会社概要
社名：${biz}
所在地：東京都〇〇区
代表者：代表取締役 〇〇 〇〇
事業内容：日本市場向け SEO プラットフォーム

## 本件に関するお問い合わせ
広報担当：〇〇　Email: press@example.co.jp`

export default function Backlinks() {
  const { backlinks, setBacklinkStatus, sites, currentSiteId } = useStore()
  const site = sites.find(s => s.id === currentSiteId)
  const [cat, setCat] = useState<string>('all')
  const [strength, setStrength] = useState<string>('all')
  const [free, setFree] = useState<string>('all')
  const [showPr, setShowPr] = useState(false)
  const [prKw, setPrKw] = useState('SEO 対策 ツール')

  const filtered = useMemo(() => {
    return backlinks
      .filter(b => cat === 'all' || b.category === cat)
      .filter(b => strength === 'all' || b.seoStrength === strength)
      .filter(b => free === 'all' || (free === 'free' ? b.freeAvailable : !b.freeAvailable))
      .sort((a, b) => b.dr - a.dr)
  }, [backlinks, cat, strength, free])

  const total = backlinks.length
  const registered = backlinks.filter(b => b.status === 'registered').length
  const inProgress = backlinks.filter(b => b.status === 'in_progress').length
  const totalDr = backlinks
    .filter(b => b.status === 'registered')
    .reduce((s, b) => s + b.dr, 0)

  return (
    <div>
      <PageHeader
        title="被リンク戦略プランナー"
        subtitle="日本特有の被リンク獲得チャネル 26 件 (JAPAN_SPEC §B 原文) を活用"
        spec="JAPAN_SPEC §B"
        actions={
          <button onClick={() => setShowPr(v => !v)} className="btn-primary">
            <Wand2 className="size-4 mr-1" />
            プレスリリース下書き生成
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Stat label="登録対象 (全件)" value={total} hint="日本市場主要プラットフォーム" />
        <Stat label="登録済" value={registered} delta={{ value: 12, suffix: '%' }} hint="進捗" />
        <Stat label="進行中" value={inProgress} />
        <Stat label="DR 合計 (登録済)" value={totalDr} hint="日本最高水準を狙う" />
      </div>

      {showPr ? (
        <div className="card mb-6 bg-gradient-to-br from-brand-50 to-white border-brand-100">
          <SectionTitle hint="JAPAN_SPEC §B.2 のプレスリリース下書き生成。Claude API を呼び出すと AI が日本語 PR 文を生成。">
            <span className="inline-flex items-center gap-2"><Sparkles className="size-4 text-brand-500" />AI 下書き生成</span>
          </SectionTitle>
          <div className="flex flex-col md:flex-row gap-2 mb-3">
            <input value={prKw} onChange={e => setPrKw(e.target.value)} className="pill-input flex-1" placeholder="プレスのテーマキーワード" />
            <button className="btn-primary whitespace-nowrap">
              <Wand2 className="size-4 mr-1" />
              Claude で生成 (API 連携後)
            </button>
          </div>
          <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed bg-white rounded-lg border border-slate-200 p-3 max-h-72 overflow-y-auto">
            {PR_SAMPLE(prKw, site?.name ?? '株式会社マジック')}
          </pre>
          <div className="mt-3 text-xs text-slate-500">
            生成後、PR TIMES (¥30,000〜) / @Press (¥10,000〜) / VALUE PRESS (月 1 本無料) などに配信できます。
          </div>
        </div>
      ) : null}

      <div className="card">
        <SectionTitle
          hint={`${filtered.length} / ${backlinks.length} 件表示`}
          actions={
            <div className="flex gap-2">
              <select value={cat} onChange={e => setCat(e.target.value)} className="pill-input">
                <option value="all">全カテゴリ</option>
                <option value="blog">ブログ</option>
                <option value="press_release">プレスリリース</option>
                <option value="comparison">比較サイト</option>
                <option value="portal">ポータル / MEO</option>
                <option value="community">コミュニティ / 技術</option>
                <option value="authoritative">権威機関</option>
              </select>
              <select value={strength} onChange={e => setStrength(e.target.value)} className="pill-input">
                <option value="all">全 SEO 強度</option>
                <option value="critical">最重要</option>
                <option value="very_high">極めて高</option>
                <option value="high">高</option>
                <option value="medium">中</option>
              </select>
              <select value={free} onChange={e => setFree(e.target.value)} className="pill-input">
                <option value="all">全コスト</option>
                <option value="free">無料あり</option>
                <option value="paid">有料</option>
              </select>
            </div>
          }
        >
          被リンク獲得チャネル一覧
        </SectionTitle>

        <table className="w-full">
          <thead>
            <tr>
              <th className="table-head">サイト</th>
              <th className="table-head">カテゴリ</th>
              <th className="table-head text-right">DR</th>
              <th className="table-head">SEO 強度</th>
              <th className="table-head">リンク種別</th>
              <th className="table-head">コスト</th>
              <th className="table-head">状態</th>
              <th className="table-head text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(b => (
              <tr key={b.id} className="border-t border-slate-100">
                <td className="table-cell">
                  <div className="font-semibold text-slate-900">{b.name}</div>
                  <div className="text-xs text-slate-400 line-clamp-1">{b.notes}</div>
                </td>
                <td className="table-cell">
                  <span className="badge-gray">{CATEGORY_LABEL[b.category] ?? b.category}</span>
                </td>
                <td className="table-cell text-right">
                  <span
                    className={
                      'inline-block w-9 text-center rounded font-bold tabular-nums px-1.5 py-0.5 ' +
                      (b.dr >= 90 ? 'bg-brand-100 text-brand-800' : b.dr >= 75 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600')
                    }
                  >
                    {b.dr}
                  </span>
                </td>
                <td className="table-cell">
                  <span
                    className={
                      b.seoStrength === 'critical' || b.seoStrength === 'very_high'
                        ? 'badge-blue'
                        : b.seoStrength === 'high'
                          ? 'badge-green'
                          : 'badge-gray'
                    }
                  >
                    {STRENGTH_LABEL[b.seoStrength]}
                  </span>
                </td>
                <td className="table-cell">
                  <span className={b.linkType === 'dofollow' ? 'badge-green' : 'badge-gray'}>
                    {LINK_LABEL[b.linkType]}
                  </span>
                </td>
                <td className="table-cell text-xs text-slate-600">
                  {b.freeAvailable ? '無料あり' : b.estimatedCost ?? '有料'}
                </td>
                <td className="table-cell">
                  <select
                    value={b.status}
                    onChange={e => setBacklinkStatus(b.id, e.target.value as BacklinkSource['status'])}
                    className={
                      'rounded-md border px-2 py-1 text-xs ' +
                      (b.status === 'registered'
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                        : b.status === 'in_progress'
                          ? 'border-amber-300 bg-amber-50 text-amber-700'
                          : b.status === 'failed'
                            ? 'border-rose-300 bg-rose-50 text-rose-700'
                            : 'border-slate-300 bg-slate-50 text-slate-600')
                    }
                  >
                    {(['not_registered', 'in_progress', 'registered', 'failed'] as const).map(s => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="table-cell text-right">
                  <a href={b.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline">
                    開く <ExternalLink className="size-3" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
