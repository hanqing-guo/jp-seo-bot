import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Globe2, Link2, Plug, Send, Unlink } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import SectionTitle from '../components/SectionTitle'
import Stat from '../components/Stat'
import { useStore } from '../store/StoreProvider'
import type { WordPressIntegration } from '../store/types'

interface FetchedPost {
  id: number
  title: { rendered: string }
  status: string
  modified: string
  slug: string
}

const SEO_PLUGIN_LABELS: Record<string, string> = {
  yoast: 'Yoast SEO',
  rankmath: 'Rank Math',
  aioseo: 'All in One SEO',
  simple_pack: 'SEO SIMPLE PACK (日本製)',
}

export default function WordPress() {
  const { wp, wpPosts, currentSiteId, setWp } = useStore()
  const integration = wp[currentSiteId]
  const [wpUrl, setWpUrl] = useState(integration?.wpUrl ?? 'https://')
  const [wpUsername, setWpUsername] = useState(integration?.wpUsername ?? '')
  const [wpPassword, setWpPassword] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [connectionResult, setConnectionResult] = useState<'idle' | 'ok' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [livePosts, setLivePosts] = useState<FetchedPost[] | null>(null)

  async function tryConnect() {
    setConnecting(true)
    setError(null)
    setConnectionResult('idle')
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (wpUsername && wpPassword) {
        headers['Authorization'] = `Basic ${btoa(`${wpUsername}:${wpPassword}`)}`
      }
      const res = await fetch(`${wpUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts?per_page=10`, {
        headers,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as FetchedPost[]
      setLivePosts(data)
      setConnectionResult('ok')

      const next: WordPressIntegration = {
        siteId: currentSiteId,
        wpUrl,
        wpUsername,
        wpAppPasswordMasked: wpPassword ? '••••-••••-••••-' + wpPassword.slice(-4) : integration?.wpAppPasswordMasked ?? '',
        detectedSeoPlugin: integration?.detectedSeoPlugin ?? null,
        isActive: true,
        lastSyncedAt: new Date().toISOString(),
      }
      setWp(currentSiteId, next)
    } catch (e) {
      setConnectionResult('error')
      setError(e instanceof Error ? e.message : '接続失敗')
    } finally {
      setConnecting(false)
    }
  }

  function disconnect() {
    setWp(currentSiteId, null)
    setLivePosts(null)
    setConnectionResult('idle')
    setWpPassword('')
  }

  useEffect(() => {
    if (integration) {
      setWpUrl(integration.wpUrl)
      setWpUsername(integration.wpUsername)
    } else {
      setWpUrl('https://')
      setWpUsername('')
    }
  }, [integration, currentSiteId])

  const displayPosts = livePosts
    ? livePosts.map(p => ({
        id: p.id,
        title: p.title.rendered,
        status: p.status,
        slug: p.slug,
        modifiedAt: p.modified,
        focusKeyword: undefined,
      }))
    : wpPosts

  return (
    <div>
      <PageHeader
        title="WordPress 連携"
        subtitle="WP REST API + Application Password 認証。Yoast / Rank Math / AIOSEO / SEO SIMPLE PACK 対応"
        spec="JAPAN_SPEC §D"
        actions={
          integration ? (
            <button onClick={disconnect} className="btn-ghost">
              <Unlink className="size-4 mr-1" />
              連携を解除
            </button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Stat
          label="接続状態"
          value={integration ? '接続済み' : '未接続'}
          hint={integration ? integration.wpUrl : 'Application Password で接続'}
        />
        <Stat
          label="検出 SEO プラグイン"
          value={integration?.detectedSeoPlugin ? SEO_PLUGIN_LABELS[integration.detectedSeoPlugin] : '—'}
          hint="自動検出"
        />
        <Stat label="記事数" value={displayPosts.length} hint="WP REST API 取得分" />
        <Stat
          label="最終同期"
          value={integration?.lastSyncedAt ? new Date(integration.lastSyncedAt).toLocaleString('ja-JP') : '—'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <SectionTitle hint="JAPAN_SPEC §D.1 — wp-json/wp/v2/posts に Basic 認証で接続">
            <span className="inline-flex items-center gap-2"><Plug className="size-4 text-brand-500" />接続設定</span>
          </SectionTitle>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500">WordPress URL</label>
              <input
                value={wpUrl}
                onChange={e => setWpUrl(e.target.value)}
                className="pill-input w-full mt-1"
                placeholder="https://example.com"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">ユーザー名</label>
              <input
                value={wpUsername}
                onChange={e => setWpUsername(e.target.value)}
                className="pill-input w-full mt-1"
                placeholder="admin"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Application Password</label>
              <input
                type="password"
                value={wpPassword}
                onChange={e => setWpPassword(e.target.value)}
                className="pill-input w-full mt-1 font-mono"
                placeholder="xxxx-xxxx-xxxx-xxxx"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                WP 管理画面の「ユーザー → プロフィール → アプリケーションパスワード」で生成
              </p>
            </div>
            <button onClick={tryConnect} disabled={connecting} className="btn-primary w-full">
              <Link2 className="size-4 mr-1" />
              {connecting ? '接続中…' : '接続テスト'}
            </button>

            {connectionResult === 'ok' ? (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800 inline-flex items-center gap-2">
                <CheckCircle2 className="size-4" /> WP REST API への接続に成功しました
              </div>
            ) : null}
            {connectionResult === 'error' ? (
              <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-800">
                <div className="inline-flex items-center gap-2 mb-1"><AlertTriangle className="size-4" /> 接続失敗:{error}</div>
                <div className="text-rose-600">CORS / 認証 / WP のバージョン (5.6+) を確認してください。下記は demo モックデータ。</div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="card">
          <SectionTitle hint="自動最適化テンプレート">SEO プラグイン別設定ガイド</SectionTitle>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
              <Globe2 className="size-5 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <div className="font-medium">Yoast SEO 検出時</div>
                <p className="text-xs text-slate-500 mt-1">
                  <code className="bg-slate-100 px-1 rounded text-[10px]">_yoast_wpseo_title</code>、
                  <code className="bg-slate-100 px-1 rounded text-[10px]">_yoast_wpseo_metadesc</code>を自動設定
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
              <Globe2 className="size-5 text-brand-500 mt-0.5 shrink-0" />
              <div>
                <div className="font-medium">Rank Math 検出時</div>
                <p className="text-xs text-slate-500 mt-1">
                  <code className="bg-slate-100 px-1 rounded text-[10px]">rank_math_title</code>、
                  <code className="bg-slate-100 px-1 rounded text-[10px]">rank_math_description</code>、
                  <code className="bg-slate-100 px-1 rounded text-[10px]">rank_math_focus_keyword</code>を自動設定
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
              <Globe2 className="size-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <div className="font-medium">SEO SIMPLE PACK 検出時 (日本製)</div>
                <p className="text-xs text-slate-500 mt-1">
                  日本語 OG 画像と meta description の設定を最適化
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
              <Globe2 className="size-5 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <div className="font-medium">All in One SEO 検出時</div>
                <p className="text-xs text-slate-500 mt-1">AIOSEO 標準 API の<code className="bg-slate-100 px-1 rounded text-[10px]">aioseo_*</code>メタを設定</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <div className="card">
        <SectionTitle
          hint={`${displayPosts.length} 件 (${livePosts ? '実 API データ' : 'モック'})`}
          actions={
            <button className="btn-primary">
              <Send className="size-4 mr-1" />
              JP SEO Bot 記事を自動投稿
            </button>
          }
        >
          WordPress 記事一覧
        </SectionTitle>
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-head">タイトル</th>
              <th className="table-head">slug</th>
              <th className="table-head">フォーカスキーワード</th>
              <th className="table-head">ステータス</th>
              <th className="table-head">更新日</th>
            </tr>
          </thead>
          <tbody>
            {displayPosts.map(p => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="table-cell font-medium text-slate-900">{p.title}</td>
                <td className="table-cell text-xs font-mono text-slate-400">{p.slug}</td>
                <td className="table-cell text-xs text-slate-500">{p.focusKeyword ?? '—'}</td>
                <td className="table-cell">
                  {p.status === 'publish' ? <span className="badge-green">公開中</span>
                    : p.status === 'draft' ? <span className="badge-gray">下書き</span>
                    : <span className="badge-amber">{p.status}</span>}
                </td>
                <td className="table-cell text-xs text-slate-500">{new Date(p.modifiedAt).toLocaleDateString('ja-JP')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
