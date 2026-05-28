import { useEffect, useMemo, useState } from 'react'
import { PenLine, Sparkles, Wand2 } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import SectionTitle from '../components/SectionTitle'
import { useStore } from '../store/StoreProvider'
import { useT } from '../lib/i18n'
import { scoreJapaneseContent } from '../lib/japaneseScore'
import type { ContentScore } from '../store/types'

const SAMPLE_TEXT = `# 【2026年最新版】SEO 対策ツール 12 選 — 機能・料金・選び方まとめ
最終更新: 2026年5月28日 | 著者:山田 太郎（Web マーケティング歴 12 年）

## 1. SEO 対策ツール の概要
SEO 対策ツールとは、検索エンジンでのサイト順位を改善するためのソフトウェアです。本記事では国内外 12 製品を機能・料金・選び方の観点で比較します。

## 2. ツール選定の 5 つの基準
H1, H2, H3 タグの正しい使い方、内部リンク構造、競合分析、被リンクモニタリング、レポート機能の有無の 5 つが重要です。

### キーワード機能
キーワード分析機能では、検索ボリュームや競合性、関連キーワードを把握できます。

### 競合分析
競合サイトのドメインを入力すると、そのサイトが上位表示されているキーワードを抽出できます。

## 3. おすすめ製品比較表
代表的な SEO 対策ツールとして Ahrefs、SEMrush、Ubersuggest、Mieru-ca などがあります。各製品の料金プランやサポート体制も比較しています。

## 4. よくある質問 (FAQ)
Q: 中小企業でも SEO 対策ツールは必要ですか？
A: はい、基本的な順位分析と競合調査のみであれば月額 1 万円程度から始められます。

Q: 無料ツールでも十分でしょうか？
A: 初期段階では Google Search Console と Google Analytics の組み合わせで十分なケースが多いです。

出典: Google Search Central, Ahrefs Blog, 2026年版 SEO 業界レポート`

const LABEL: Record<string, string> = {
  coOccurrenceScore: '共起語カバレッジ',
  readabilityScore: '可読性',
  keywordDensity: 'キーワード密度',
  headingStructure: '見出し構造',
  wordCount: '文字数',
  internalLinks: '内部リンク',
  authorInfo: '著者情報',
  citationScore: '出典・引用',
  updateDate: '更新日表示',
  yakujihoCompliance: '薬機法コンプラ',
  keigo: '敬語',
  faqPresence: 'FAQ セクション',
}

export default function ContentStudio() {
  const { t } = useT()
  const { articles, currentSiteId, upsertArticle } = useStore()
  const siteArticles = articles.filter(a => a.siteId === currentSiteId)
  const [text, setText] = useState(SAMPLE_TEXT)
  const [targetKeyword, setTargetKeyword] = useState('SEO 対策 ツール')
  const [score, setScore] = useState<ContentScore | null>(null)
  // 初回マウント時はスコア計算完了までローディング状態にし、
  // 「総合 0」と誤表示されないようにする(kuromoji 初回ロードで数秒)。
  const [loading, setLoading] = useState(true)
  const [generated, setGenerated] = useState(false)

  const wordCount = useMemo(() => text.replace(/\s/g, '').length, [text])
  const headingsH2 = useMemo(() => (text.match(/^##\s/gm) || []).length, [text])
  const headingsH3 = useMemo(() => (text.match(/^###\s/gm) || []).length, [text])
  const internalLinkCount = useMemo(() => (text.match(/\[[^\]]+\]\([^)]+\)/g) || []).length, [text])

  async function runScore() {
    setLoading(true)
    try {
      const r = await scoreJapaneseContent({
        text,
        targetKeyword,
        wordCount,
        headingsH2,
        headingsH3,
        internalLinkCount,
      })
      setScore(r)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => runScore().catch(() => {}), 600)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, targetKeyword])

  function aiOutline() {
    setGenerated(true)
    setText(SAMPLE_TEXT)
  }

  function saveAsArticle() {
    const id = 'art-' + Math.random().toString(36).slice(2, 8)
    upsertArticle({
      id,
      siteId: currentSiteId,
      title: text.split('\n')[0].replace(/^#+\s*/, '').slice(0, 80),
      targetKeyword,
      contentHtml: '',
      contentMd: text,
      metaDescription: text.replace(/[#*`>]/g, '').slice(0, 120),
      status: 'draft',
      wordCount,
      score: score?.overall,
      createdAt: new Date().toISOString(),
    })
  }

  return (
    <div>
      <PageHeader
        title={t('page.content.title')}
        subtitle={t('page.content.subtitle')}
        spec="JAPAN_SPEC §H + §G"
        actions={
          <>
            <button className="btn-ghost" onClick={aiOutline}>
              <Wand2 className="size-4 mr-1" />
              AI 構成生成
            </button>
            <button className="btn-primary" onClick={saveAsArticle}>
              <PenLine className="size-4 mr-1" />
              下書き保存
            </button>
          </>
        }
      />

      {generated ? (
        <div className="card mb-4 border-emerald-200 bg-emerald-50">
          <div className="flex items-center gap-2 text-sm text-emerald-800">
            <Sparkles className="size-4" />
            AI が H2/H3/FAQ/著者情報/出典 を含むテンプレートを挿入しました。本文を編集してスコアを最大化してください。
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 card">
          <div className="flex items-center gap-2 mb-3">
            <label className="text-xs text-slate-500 whitespace-nowrap">対象キーワード</label>
            <input value={targetKeyword} onChange={e => setTargetKeyword(e.target.value)} className="pill-input flex-1" />
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            className="w-full font-mono text-xs leading-relaxed border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-500"
            rows={28}
          />
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span>文字数 <strong className="text-slate-900">{wordCount.toLocaleString()}</strong></span>
            <span>H2 <strong className="text-slate-900">{headingsH2}</strong></span>
            <span>H3 <strong className="text-slate-900">{headingsH3}</strong></span>
            <span>内部リンク <strong className="text-slate-900">{internalLinkCount}</strong></span>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <SectionTitle hint="JAPAN_SPEC §H 重み付き総合">スコア</SectionTitle>
            <div className="flex items-center gap-4">
              <div
                className={
                  'flex size-24 items-center justify-center rounded-full border-8 ' +
                  (score === null
                    ? 'border-slate-200 text-slate-400'
                    : score.overall >= 80
                      ? 'border-emerald-500 text-emerald-700'
                      : score.overall >= 60
                        ? 'border-amber-500 text-amber-700'
                        : 'border-rose-500 text-rose-700')
                }
              >
                <span className="text-2xl font-bold">{loading || score === null ? '…' : score.overall}</span>
              </div>
              <div className="flex-1 space-y-1.5">
                {score
                  ? Object.entries(score.breakdown).slice(0, 4).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2 text-xs">
                        <span className="w-20 truncate text-slate-600">{LABEL[k] ?? k}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={'h-full ' + (v >= 80 ? 'bg-emerald-500' : v >= 60 ? 'bg-amber-500' : 'bg-rose-500')}
                            style={{ width: `${v}%` }}
                          />
                        </div>
                        <span className="w-7 text-right tabular-nums">{v}</span>
                      </div>
                    ))
                  : null}
              </div>
            </div>
          </div>

          <div className="card">
            <SectionTitle hint="12 項目">詳細スコア</SectionTitle>
            <ul className="grid grid-cols-1 gap-1.5">
              {score
                ? Object.entries(score.breakdown).map(([k, v]) => (
                    <li key={k} className="flex items-center gap-2 text-xs">
                      <span className="w-28 shrink-0 truncate text-slate-600">{LABEL[k] ?? k}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={'h-full ' + (v >= 80 ? 'bg-emerald-500' : v >= 60 ? 'bg-amber-500' : 'bg-rose-500')}
                          style={{ width: `${v}%` }}
                        />
                      </div>
                      <span className="w-7 text-right tabular-nums text-slate-700">{v}</span>
                    </li>
                  ))
                : null}
            </ul>
          </div>

          <div className="card">
            <SectionTitle hint="自動生成された改善提案">改善提案</SectionTitle>
            <ul className="space-y-2 text-xs">
              {score?.suggestions.length === 0 ? (
                <li className="text-emerald-700">問題ありません。SEO 最適化済みです。</li>
              ) : (
                score?.suggestions.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="badge-amber shrink-0">{i + 1}</span>
                    <span className="text-slate-700">{s}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-6 card">
        <SectionTitle hint={`このサイトの既存記事 ${siteArticles.length} 件`}>既存コンテンツ</SectionTitle>
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-head">タイトル</th>
              <th className="table-head">キーワード</th>
              <th className="table-head">文字数</th>
              <th className="table-head">スコア</th>
              <th className="table-head">状態</th>
            </tr>
          </thead>
          <tbody>
            {siteArticles.map(a => (
              <tr key={a.id} className="border-t border-slate-100">
                <td className="table-cell font-medium text-slate-900">{a.title}</td>
                <td className="table-cell text-slate-500">{a.targetKeyword}</td>
                <td className="table-cell">{a.wordCount.toLocaleString()}</td>
                <td className="table-cell">
                  <span className={(a.score ?? 0) >= 80 ? 'badge-green' : (a.score ?? 0) >= 60 ? 'badge-amber' : 'badge-red'}>
                    {a.score ?? '-'}
                  </span>
                </td>
                <td className="table-cell">
                  {a.status === 'published' ? <span className="badge-green">{t('article.status.published')}</span>
                    : a.status === 'in_review' ? <span className="badge-amber">{t('article.status.in_review')}</span>
                    : <span className="badge-gray">{t('article.status.draft')}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
