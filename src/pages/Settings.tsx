import { useState } from 'react'
import { AlertTriangle, Key, RotateCcw, Save } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import SectionTitle from '../components/SectionTitle'
import { useStore } from '../store/StoreProvider'

export default function SettingsPage() {
  const { sites, currentSiteId, reset } = useStore()
  const site = sites.find(s => s.id === currentSiteId)
  const [claudeKey, setClaudeKey] = useState('sk-ant-•••••••••••••••••')
  const [gscAccount, setGscAccount] = useState('seo@magic.example.co.jp')
  const [confirmReset, setConfirmReset] = useState(false)

  function handleReset() {
    if (!confirmReset) {
      setConfirmReset(true)
      return
    }
    reset()
    setConfirmReset(false)
  }

  return (
    <div>
      <PageHeader title="設定" subtitle="サイト情報・API キー・データリセット" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <SectionTitle hint="現在編集中のサイト">サイト情報</SectionTitle>
          <div className="space-y-3">
            <div><label className="text-xs text-slate-500">サイト名</label><input className="pill-input w-full mt-1" defaultValue={site?.name} /></div>
            <div><label className="text-xs text-slate-500">URL</label><input className="pill-input w-full mt-1" defaultValue={site?.url} /></div>
            <div><label className="text-xs text-slate-500">業種</label><input className="pill-input w-full mt-1" defaultValue={site?.industry} /></div>
            <div>
              <label className="text-xs text-slate-500">言語</label>
              <select className="pill-input w-full mt-1" defaultValue={site?.language}>
                <option value="ja">日本語</option>
                <option value="en">English</option>
                <option value="zh">中文</option>
              </select>
            </div>
            <button className="btn-primary">
              <Save className="size-4 mr-1" />
              変更を保存
            </button>
          </div>
        </div>

        <div className="card">
          <SectionTitle hint="外部サービス連携">API キー</SectionTitle>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500 flex items-center gap-2">
                <Key className="size-3" /> Anthropic Claude API
              </label>
              <input
                className="pill-input w-full mt-1 font-mono"
                type="password"
                value={claudeKey}
                onChange={e => setClaudeKey(e.target.value)}
              />
              <p className="text-[11px] text-slate-400 mt-1">
                記事生成・改善提案・プレスリリース下書きで使用。料金は AI 利用量に応じて従量課金。
              </p>
            </div>
            <div>
              <label className="text-xs text-slate-500">Google Search Console アカウント</label>
              <input className="pill-input w-full mt-1" value={gscAccount} onChange={e => setGscAccount(e.target.value)} />
            </div>
            <button className="btn-primary"><Save className="size-4 mr-1" />保存</button>
          </div>
        </div>

        <div className="card md:col-span-2 border-rose-200 bg-rose-50/30">
          <SectionTitle hint="不可逆操作。注意してください">
            <span className="inline-flex items-center gap-2 text-rose-700">
              <AlertTriangle className="size-4" />
              データリセット
            </span>
          </SectionTitle>
          <p className="text-xs text-slate-600 mb-3">
            ブラウザの localStorage に保存された全データ (サイト・キーワード・記事・被リンク登録状況・MEO・WordPress 設定) を初期サンプルに戻します。
          </p>
          <button
            onClick={handleReset}
            className={'btn ' + (confirmReset ? 'bg-rose-600 text-white hover:bg-rose-700' : 'border border-rose-300 bg-white text-rose-700 hover:bg-rose-50')}
          >
            <RotateCcw className="size-4 mr-1" />
            {confirmReset ? 'もう一度クリックで実行' : 'デモデータにリセット'}
          </button>
        </div>
      </div>
    </div>
  )
}
