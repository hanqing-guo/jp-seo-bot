import { useMemo } from 'react'
import { CheckCircle2, MapPin, Star, XCircle } from 'lucide-react'
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import PageHeader from '../components/PageHeader'
import SectionTitle from '../components/SectionTitle'
import Stat from '../components/Stat'
import { useStore } from '../store/StoreProvider'
import { useT } from '../lib/i18n'
import { JAPAN_LOCAL_DIRECTORIES } from '../store/mockData'

const CHECKLIST_LABELS: Record<string, { label: string; required: boolean; jp: boolean }> = {
  hasBusinessName: { label: '事業者名', required: true, jp: false },
  hasAddress: { label: '所在地', required: true, jp: false },
  hasPhone: { label: '電話番号', required: true, jp: false },
  hasWebsite: { label: 'Web サイト URL', required: true, jp: false },
  hasBusinessHours: { label: '営業時間', required: true, jp: false },
  hasCategory: { label: 'カテゴリ', required: true, jp: false },
  hasJapaneseDescription: { label: '日本語説明文 (750 文字)', required: false, jp: true },
  hasPhotos: { label: '写真 5 枚以上', required: false, jp: true },
  hasGooglePost: { label: 'Google ポスト (週 1)', required: false, jp: true },
  hasReviewResponse: { label: '口コミ返信率 80%+', required: false, jp: true },
  hasQASection: { label: 'Q&A セクション', required: false, jp: true },
  hasFacilityInfo: { label: '設備情報', required: false, jp: false },
  hasAccessibility: { label: 'バリアフリー', required: false, jp: false },
  hasServiceMenu: { label: 'サービス/メニュー', required: false, jp: false },
  hasBookingLink: { label: '予約リンク', required: false, jp: false },
}

export default function Meo() {
  const { t } = useT()
  const { meo, sites, currentSiteId, updateMeo } = useStore()
  const site = sites.find(s => s.id === currentSiteId)
  const profile = meo[currentSiteId]

  const recommendations = useMemo(() => {
    if (!profile) return []
    const recs: string[] = []
    if (!profile.checklist.hasJapaneseDescription) {
      recs.push('Googleビジネスプロフィールに日本語の説明文(750 文字以内)を追加してください。SEOキーワードを自然に含めましょう。')
    }
    if (!profile.checklist.hasGooglePost) {
      recs.push('直近 30 日以内の「Google ポスト」がありません。週 1 回以上の投稿でローカル順位が向上します。')
    }
    if (!profile.checklist.hasReviewResponse) {
      recs.push('未返信の口コミがあります。口コミへの返信は Map パックの順位に直接影響します。')
    }
    if (!profile.checklist.hasPhotos) {
      recs.push('写真が不足しています。店舗外観・内観・商品写真を 5 枚以上アップロードしてください。')
    }
    if (!profile.checklist.hasAccessibility) {
      recs.push('バリアフリー情報を追加すると、来店検討中ユーザーに信頼感を与えられます。')
    }
    return recs
  }, [profile])

  const radarData = useMemo(() => {
    if (!profile) return []
    return [
      { axis: '基本情報', score: ['hasBusinessName', 'hasAddress', 'hasPhone', 'hasWebsite', 'hasBusinessHours', 'hasCategory'].filter(k => (profile.checklist as unknown as Record<string, boolean>)[k]).length * 16.6 },
      { axis: '日本語特化', score: ['hasJapaneseDescription', 'hasPhotos', 'hasGooglePost', 'hasReviewResponse', 'hasQASection'].filter(k => (profile.checklist as unknown as Record<string, boolean>)[k]).length * 20 },
      { axis: '上級項目', score: ['hasFacilityInfo', 'hasAccessibility', 'hasServiceMenu', 'hasBookingLink'].filter(k => (profile.checklist as unknown as Record<string, boolean>)[k]).length * 25 },
      { axis: 'クチコミ', score: Math.min(100, (profile.averageRating / 5) * 100) },
      { axis: '更新頻度', score: profile.checklist.hasGooglePost ? 80 : 30 },
    ]
  }, [profile])

  if (!profile) {
    return (
      <div>
        <PageHeader title={t('page.meo.title')} subtitle="このサイトには MEO プロファイルが未設定です。" spec="JAPAN_SPEC §C" />
        <div className="card text-center py-12">
          <MapPin className="size-12 mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-600">
            ビジネスプロフィール (GBP) を新規に紐付けるか、サイト情報を入力してください。
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={t('page.meo.title')}
        subtitle={`${site?.name} — ${t('page.meo.subtitle')}`}
        spec="JAPAN_SPEC §C"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Stat label="GBP 完成度" value={`${profile.completionScore}%`} hint="100% で最大限露出" />
        <Stat
          label="口コミ平均"
          value={
            <span className="inline-flex items-center gap-1">
              {profile.averageRating}
              <Star className="size-5 text-amber-400 fill-amber-400" />
            </span>
          }
          hint={`${profile.reviewCount} 件のレビュー`}
        />
        <Stat label="登録ディレクトリ" value={`${Object.values(profile.directoryRegistrations).filter(Boolean).length} / ${JAPAN_LOCAL_DIRECTORIES.length}`} />
        <Stat label="最終監査" value={new Date(profile.lastAuditedAt).toLocaleDateString('ja-JP')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2">
          <SectionTitle hint="JAPAN_SPEC §C.1 のチェックリスト">GBP チェックリスト</SectionTitle>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {Object.entries(CHECKLIST_LABELS).map(([k, meta]) => {
              const checked = (profile.checklist as unknown as Record<string, boolean>)[k]
              return (
                <li key={k}>
                  <label className="flex items-center gap-2 rounded-lg border border-slate-100 p-2 hover:bg-slate-50/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e =>
                        updateMeo(currentSiteId, {
                          checklist: { ...profile.checklist, [k]: e.target.checked },
                        })
                      }
                      className="size-4 rounded text-brand-600"
                    />
                    <span className={'text-sm ' + (checked ? 'text-slate-900' : 'text-slate-500')}>
                      {meta.label}
                    </span>
                    <span className="ml-auto flex gap-1">
                      {meta.required ? <span className="badge-red">必須</span> : null}
                      {meta.jp ? <span className="badge-blue">JP 特化</span> : null}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="card">
          <SectionTitle hint="5 軸スコアリング">MEO スコアレーダー</SectionTitle>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="axis" tick={{ fill: '#64748b', fontSize: 11 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 9 }} />
              <Radar name="現在" dataKey="score" stroke="#3563ff" fill="#3563ff" fillOpacity={0.35} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {recommendations.length > 0 ? (
        <div className="card mt-4 border-amber-200 bg-amber-50/40">
          <SectionTitle hint="JAPAN_SPEC §C.1 generateGBPRecommendations() 相当">改善推奨事項</SectionTitle>
          <ul className="space-y-2">
            {recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="badge-amber shrink-0">{i + 1}</span>
                <span className="text-slate-700">{r}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="card mt-4">
        <SectionTitle hint="JAPAN_SPEC §C.2 業種別ローカルディレクトリ">日本主要ローカルディレクトリ</SectionTitle>
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-head">名称</th>
              <th className="table-head">URL</th>
              <th className="table-head">業種</th>
              <th className="table-head">重要度</th>
              <th className="table-head text-right">登録状況</th>
            </tr>
          </thead>
          <tbody>
            {JAPAN_LOCAL_DIRECTORIES.map(d => {
              const registered = !!profile.directoryRegistrations[d.id]
              return (
                <tr key={d.id} className="border-t border-slate-100">
                  <td className="table-cell font-medium text-slate-900">{d.name}</td>
                  <td className="table-cell text-xs text-slate-400">{d.url}</td>
                  <td className="table-cell text-xs text-slate-500">{d.industry}</td>
                  <td className="table-cell">
                    {d.critical ? <span className="badge-red">必須</span> : <span className="badge-gray">推奨</span>}
                  </td>
                  <td className="table-cell text-right">
                    {registered ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                        <CheckCircle2 className="size-3.5" /> 登録済
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
                        <XCircle className="size-3.5" /> 未登録
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
