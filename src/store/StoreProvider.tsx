import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  BACKLINK_SOURCES,
  DEFAULT_ARTICLES,
  DEFAULT_AUDIT_ISSUES,
  DEFAULT_CALENDAR,
  DEFAULT_COMPETITORS,
  DEFAULT_KEYWORDS,
  DEFAULT_MEO,
  DEFAULT_SITES,
  DEFAULT_WP,
  DEFAULT_WP_POSTS,
} from './mockData'
import type {
  Article,
  AuditIssue,
  BacklinkSource,
  CalendarEntry,
  Competitor,
  Keyword,
  MeoProfile,
  Site,
  WordPressIntegration,
  WPPost,
} from './types'

interface AppState {
  sites: Site[]
  currentSiteId: string
  keywords: Keyword[]
  articles: Article[]
  auditIssues: AuditIssue[]
  competitors: Competitor[]
  backlinks: BacklinkSource[]
  meo: Record<string, MeoProfile>
  wp: Record<string, WordPressIntegration>
  wpPosts: WPPost[]
  calendar: CalendarEntry[]
}

const STORAGE_KEY = 'jp-seo-bot:store'

const initialState: AppState = {
  sites: DEFAULT_SITES,
  currentSiteId: DEFAULT_SITES[0]?.id ?? '',
  keywords: DEFAULT_KEYWORDS,
  articles: DEFAULT_ARTICLES,
  auditIssues: DEFAULT_AUDIT_ISSUES,
  competitors: DEFAULT_COMPETITORS,
  backlinks: BACKLINK_SOURCES,
  meo: DEFAULT_MEO,
  wp: DEFAULT_WP,
  wpPosts: DEFAULT_WP_POSTS,
  calendar: DEFAULT_CALENDAR,
}

interface StoreCtx extends AppState {
  setCurrentSiteId: (id: string) => void
  addSite: (s: Omit<Site, 'id' | 'createdAt'>) => void
  upsertArticle: (article: Article) => void
  setBacklinkStatus: (id: string, status: BacklinkSource['status']) => void
  updateMeo: (siteId: string, patch: Partial<MeoProfile>) => void
  setWp: (siteId: string, wp: WordPressIntegration | null) => void
  upsertCalendarEntry: (entry: CalendarEntry) => void
  deleteCalendarEntry: (id: string) => void
  reset: () => void
}

const Ctx = createContext<StoreCtx | null>(null)

function loadFromStorage(): AppState {
  if (typeof window === 'undefined') return initialState
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState
    const parsed = JSON.parse(raw) as Partial<AppState>
    return { ...initialState, ...parsed }
  } catch {
    return initialState
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadFromStorage)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const setCurrentSiteId = useCallback((id: string) => {
    setState(s => ({ ...s, currentSiteId: id }))
  }, [])

  const addSite = useCallback((s: Omit<Site, 'id' | 'createdAt'>) => {
    setState(prev => {
      const site: Site = {
        ...s,
        id: 'site-' + Math.random().toString(36).slice(2, 8),
        createdAt: new Date().toISOString(),
      }
      return { ...prev, sites: [...prev.sites, site], currentSiteId: site.id }
    })
  }, [])

  const upsertArticle = useCallback((article: Article) => {
    setState(prev => {
      const exists = prev.articles.some(a => a.id === article.id)
      const articles = exists
        ? prev.articles.map(a => (a.id === article.id ? article : a))
        : [article, ...prev.articles]
      return { ...prev, articles }
    })
  }, [])

  const setBacklinkStatus = useCallback((id: string, status: BacklinkSource['status']) => {
    setState(prev => ({
      ...prev,
      backlinks: prev.backlinks.map(b =>
        b.id === id
          ? {
              ...b,
              status,
              registeredAt: status === 'registered' ? new Date().toISOString() : b.registeredAt,
            }
          : b,
      ),
    }))
  }, [])

  const updateMeo = useCallback((siteId: string, patch: Partial<MeoProfile>) => {
    setState(prev => {
      const existing = prev.meo[siteId]
      if (!existing) return prev
      return {
        ...prev,
        meo: {
          ...prev.meo,
          [siteId]: { ...existing, ...patch, checklist: { ...existing.checklist, ...(patch.checklist ?? {}) } },
        },
      }
    })
  }, [])

  const setWp = useCallback((siteId: string, wp: WordPressIntegration | null) => {
    setState(prev => {
      const next = { ...prev.wp }
      if (wp === null) delete next[siteId]
      else next[siteId] = wp
      return { ...prev, wp: next }
    })
  }, [])

  const upsertCalendarEntry = useCallback((entry: CalendarEntry) => {
    setState(prev => {
      const exists = prev.calendar.some(e => e.id === entry.id)
      return {
        ...prev,
        calendar: exists
          ? prev.calendar.map(e => (e.id === entry.id ? entry : e))
          : [...prev.calendar, entry],
      }
    })
  }, [])

  const deleteCalendarEntry = useCallback((id: string) => {
    setState(prev => ({ ...prev, calendar: prev.calendar.filter(e => e.id !== id) }))
  }, [])

  const reset = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY)
    setState(initialState)
  }, [])

  const value = useMemo<StoreCtx>(
    () => ({
      ...state,
      setCurrentSiteId,
      addSite,
      upsertArticle,
      setBacklinkStatus,
      updateMeo,
      setWp,
      upsertCalendarEntry,
      deleteCalendarEntry,
      reset,
    }),
    [
      state,
      setCurrentSiteId,
      addSite,
      upsertArticle,
      setBacklinkStatus,
      updateMeo,
      setWp,
      upsertCalendarEntry,
      deleteCalendarEntry,
      reset,
    ],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}

export function useCurrentSite(): Site | undefined {
  const { sites, currentSiteId } = useStore()
  return sites.find(s => s.id === currentSiteId)
}
