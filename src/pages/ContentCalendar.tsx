import { useMemo, useState } from 'react'
import { CalendarPlus, ChevronLeft, ChevronRight, Sparkles, Trash2 } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import SectionTitle from '../components/SectionTitle'
import { useStore } from '../store/StoreProvider'
import { useT } from '../lib/i18n'
import { JAPAN_CONTENT_CALENDAR } from '../store/mockData'
import type { CalendarEntry } from '../store/types'

const WEEKDAY_KEYS = ['weekday.sun', 'weekday.mon', 'weekday.tue', 'weekday.wed', 'weekday.thu', 'weekday.fri', 'weekday.sat'] as const

const STATUS_BADGE: Record<CalendarEntry['status'], string> = {
  planned: 'badge-gray',
  in_progress: 'badge-amber',
  published: 'badge-green',
  cancelled: 'badge-red',
}

const STATUS_KEY: Record<CalendarEntry['status'], string> = {
  planned: 'calendar.status.planned',
  in_progress: 'calendar.status.in_progress',
  published: 'calendar.status.published',
  cancelled: 'calendar.status.cancelled',
}

function ymKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function weekdayOfFirst(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

export default function ContentCalendar() {
  const { calendar, currentSiteId, upsertCalendarEntry, deleteCalendarEntry } = useStore()
  const { t } = useT()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newKeyword, setNewKeyword] = useState('')
  const [newDate, setNewDate] = useState(`${year}-${String(month + 1).padStart(2, '0')}-15`)
  const [newTag, setNewTag] = useState('')

  const monthEntries = useMemo(() => {
    const prefix = ymKey(year, month)
    return calendar.filter(c => c.siteId === currentSiteId && c.plannedDate.startsWith(prefix))
  }, [calendar, currentSiteId, year, month])

  const seasonalTopics = JAPAN_CONTENT_CALENDAR[month + 1] ?? []

  function go(d: number) {
    const dt = new Date(year, month + d, 1)
    setYear(dt.getFullYear())
    setMonth(dt.getMonth())
  }

  function addEntry() {
    if (!newTitle.trim()) return
    upsertCalendarEntry({
      id: 'cal-' + Math.random().toString(36).slice(2, 8),
      siteId: currentSiteId,
      title: newTitle,
      targetKeyword: newKeyword,
      plannedDate: newDate,
      status: 'planned',
      seasonalTag: newTag || undefined,
    })
    setShowAdd(false)
    setNewTitle('')
    setNewKeyword('')
    setNewTag('')
  }

  function generateAiIdeas() {
    const ideas = seasonalTopics.slice(0, 3).map((topic, i) => ({
      id: 'cal-ai-' + Date.now() + '-' + i,
      siteId: currentSiteId,
      title: `${topic}に合わせた SEO 記事案 ${i + 1}`,
      targetKeyword: `${topic} SEO`,
      plannedDate: `${year}-${String(month + 1).padStart(2, '0')}-${String(10 + i * 7).padStart(2, '0')}`,
      status: 'planned' as const,
      seasonalTag: topic,
    }))
    ideas.forEach(e => upsertCalendarEntry(e))
  }

  const totalDays = daysInMonth(year, month)
  const firstWeekday = weekdayOfFirst(year, month)
  const cells = Array.from({ length: 42 }, (_, i) => {
    const day = i - firstWeekday + 1
    if (day < 1 || day > totalDays) return null
    return day
  })

  return (
    <div>
      <PageHeader
        title={t('page.calendar.title')}
        subtitle={t('page.calendar.subtitle')}
        spec="JAPAN_SPEC §F"
        actions={
          <>
            <button onClick={generateAiIdeas} className="btn-ghost">
              <Sparkles className="size-4 mr-1" />
              季節アイデアを 3 件追加
            </button>
            <button onClick={() => setShowAdd(true)} className="btn-primary">
              <CalendarPlus className="size-4 mr-1" />
              記事を追加
            </button>
          </>
        }
      />

      <div className="card mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button onClick={() => go(-1)} className="rounded-lg p-1 hover:bg-slate-100"><ChevronLeft className="size-4" /></button>
            <span className="text-base font-bold text-slate-900">
              {year}年 {month + 1}月
            </span>
            <button onClick={() => go(1)} className="rounded-lg p-1 hover:bg-slate-100"><ChevronRight className="size-4" /></button>
          </div>
          <div className="text-xs text-slate-500">
            季節タグ:{' '}
            {seasonalTopics.map((t, i) => (
              <span key={i} className="badge-blue ml-1">{t}</span>
            ))}
          </div>
        </div>

        <div translate="no" className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
          {WEEKDAY_KEYS.map(key => (
            <div key={key} className="bg-slate-50 px-2 py-1 text-center text-[11px] font-semibold text-slate-500">{t(key)}</div>
          ))}
          {cells.map((day, i) => {
            const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null
            const todays = day ? monthEntries.filter(e => e.plannedDate === dateStr) : []
            const isToday = day && year === today.getFullYear() && month === today.getMonth() && day === today.getDate()
            return (
              <div key={i} className={'bg-white min-h-[88px] p-1.5 ' + (isToday ? 'bg-brand-50/40' : '')}>
                {day ? (
                  <>
                    <div className="text-[11px] font-medium text-slate-400 mb-1">{day}</div>
                    <div className="space-y-1">
                      {todays.map(e => (
                        <div
                          key={e.id}
                          className={
                            'rounded-md px-1.5 py-0.5 text-[10px] truncate ' +
                            (e.status === 'published'
                              ? 'bg-emerald-100 text-emerald-700'
                              : e.status === 'in_progress'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-brand-100 text-brand-700')
                          }
                          title={e.title}
                        >
                          {e.title}
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      <div className="card">
        <SectionTitle hint={`${monthEntries.length} 件 (今月)`}>記事スケジュール</SectionTitle>
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-head">予定日</th>
              <th className="table-head">タイトル</th>
              <th className="table-head">キーワード</th>
              <th className="table-head">季節タグ</th>
              <th className="table-head">状態</th>
              <th className="table-head text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {monthEntries.map(e => (
              <tr key={e.id} className="border-t border-slate-100">
                <td className="table-cell font-mono text-xs">{e.plannedDate}</td>
                <td className="table-cell font-medium text-slate-900">{e.title}</td>
                <td className="table-cell text-xs text-slate-500">{e.targetKeyword}</td>
                <td className="table-cell">
                  {e.seasonalTag ? <span className="badge-blue">{e.seasonalTag}</span> : <span className="text-slate-300">—</span>}
                </td>
                <td className="table-cell">
                  <select
                    value={e.status}
                    onChange={ev => upsertCalendarEntry({ ...e, status: ev.target.value as CalendarEntry['status'] })}
                    className="text-xs rounded-md border border-slate-200 px-2 py-1 bg-white"
                  >
                    {Object.entries(STATUS_KEY).map(([k, key]) => (
                      <option key={k} value={k}>{t(key)}</option>
                    ))}
                  </select>
                  <span className={'ml-2 ' + STATUS_BADGE[e.status]}>{t(STATUS_KEY[e.status])}</span>
                </td>
                <td className="table-cell text-right">
                  <button onClick={() => deleteCalendarEntry(e.id)} className="text-xs text-rose-600 hover:underline inline-flex items-center gap-1">
                    <Trash2 className="size-3" /> 削除
                  </button>
                </td>
              </tr>
            ))}
            {monthEntries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-400">
                  今月の予定がありません。「記事を追加」または「季節アイデアを追加」から開始してください。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {showAdd ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-bold text-slate-900 mb-3">記事を追加</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500">タイトル</label>
                <input value={newTitle} onChange={e => setNewTitle(e.target.value)} className="pill-input w-full mt-1" placeholder="記事タイトル" />
              </div>
              <div>
                <label className="text-xs text-slate-500">対象キーワード</label>
                <input value={newKeyword} onChange={e => setNewKeyword(e.target.value)} className="pill-input w-full mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500">予定日</label>
                  <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="pill-input w-full mt-1" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">季節タグ</label>
                  <input value={newTag} onChange={e => setNewTag(e.target.value)} className="pill-input w-full mt-1" placeholder="例: ゴールデンウィーク" />
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowAdd(false)} className="btn-ghost">キャンセル</button>
              <button onClick={addEntry} className="btn-primary">追加</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
