// JP SEO Bot v2 — 3 画面 MVP store
// 単一 Keyword 配列 + localStorage 永続化のみ。

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { GeneratedArticle, Keyword } from './types'
import { SEED_KEYWORDS } from '../lib/seedData'
import { generateMonthlyTasks, profileFromKD, tierFromKD } from '../lib/difficulty'

interface AppState {
  keywords: Keyword[]
  /** キーワード ID ごとの生成記事草稿 */
  articles: Record<string, GeneratedArticle[]>
}

const STORAGE_KEY = 'jp-seo-bot:store-v2'

const initialState: AppState = {
  keywords: SEED_KEYWORDS,
  articles: {},
}

interface StoreCtx extends AppState {
  addKeyword: (input: { keyword: string; difficulty: number }) => Keyword
  deleteKeyword: (id: string) => void
  updateTaskStatus: (kwId: string, monthNumber: number, status: 'planned' | 'in_progress' | 'done') => void
  addArticles: (kwId: string, drafts: { title: string; markdown: string; provider: string }[]) => void
  deleteArticle: (kwId: string, articleId: string) => void
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

  const addKeyword = useCallback<StoreCtx['addKeyword']>(({ keyword, difficulty }) => {
    const tier = tierFromKD(difficulty)
    const profile = profileFromKD(difficulty)
    const tasks = generateMonthlyTasks(tier)
    tasks[0].status = 'in_progress'

    const kw: Keyword = {
      id: 'kw-' + Math.random().toString(36).slice(2, 10),
      keyword: keyword.trim(),
      difficulty,
      tier,
      targetMonths: profile.targetMonths,
      monthlyBudgetYen: profile.monthlyBudgetYen,
      elapsedMonths: 1,
      currentTaskLabel: tasks[0].label,
      monthlyTasks: tasks,
      googleRank: null,
      yahooRank: null,
      rankHistory: [],
      createdAt: new Date().toISOString(),
    }

    setState(prev => ({ ...prev, keywords: [kw, ...prev.keywords] }))
    return kw
  }, [])

  const deleteKeyword = useCallback((id: string) => {
    setState(prev => ({ ...prev, keywords: prev.keywords.filter(k => k.id !== id) }))
  }, [])

  const updateTaskStatus = useCallback((kwId: string, monthNumber: number, status: 'planned' | 'in_progress' | 'done') => {
    setState(prev => ({
      ...prev,
      keywords: prev.keywords.map(k =>
        k.id !== kwId
          ? k
          : {
              ...k,
              monthlyTasks: k.monthlyTasks.map(t =>
                t.monthNumber === monthNumber ? { ...t, status } : t,
              ),
            },
      ),
    }))
  }, [])

  const addArticles = useCallback<StoreCtx['addArticles']>((kwId, drafts) => {
    setState(prev => {
      const existing = prev.articles[kwId] ?? []
      const added: GeneratedArticle[] = drafts.map(d => ({
        id: 'art-' + Math.random().toString(36).slice(2, 10),
        title: d.title,
        markdown: d.markdown,
        provider: d.provider,
        createdAt: new Date().toISOString(),
      }))
      return { ...prev, articles: { ...prev.articles, [kwId]: [...added, ...existing] } }
    })
  }, [])

  const deleteArticle = useCallback((kwId: string, articleId: string) => {
    setState(prev => ({
      ...prev,
      articles: {
        ...prev.articles,
        [kwId]: (prev.articles[kwId] ?? []).filter(a => a.id !== articleId),
      },
    }))
  }, [])

  const reset = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY)
    setState(initialState)
  }, [])

  const value = useMemo<StoreCtx>(
    () => ({ ...state, addKeyword, deleteKeyword, updateTaskStatus, addArticles, deleteArticle, reset }),
    [state, addKeyword, deleteKeyword, updateTaskStatus, addArticles, deleteArticle, reset],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}

export function useKeyword(id: string | undefined): Keyword | undefined {
  const { keywords } = useStore()
  return id ? keywords.find(k => k.id === id) : undefined
}

export function useArticles(kwId: string | undefined): GeneratedArticle[] {
  const { articles } = useStore()
  return kwId ? articles[kwId] ?? [] : []
}
