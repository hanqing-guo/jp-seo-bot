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
import type { Keyword } from './types'
import { SEED_KEYWORDS } from '../lib/seedData'
import { generateMonthlyTasks, profileFromKD, tierFromKD } from '../lib/difficulty'

interface AppState {
  keywords: Keyword[]
}

const STORAGE_KEY = 'jp-seo-bot:store-v2'

const initialState: AppState = {
  keywords: SEED_KEYWORDS,
}

interface StoreCtx extends AppState {
  addKeyword: (input: { keyword: string; difficulty: number }) => Keyword
  deleteKeyword: (id: string) => void
  updateTaskStatus: (kwId: string, monthNumber: number, status: 'planned' | 'in_progress' | 'done') => void
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

  const reset = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY)
    setState(initialState)
  }, [])

  const value = useMemo<StoreCtx>(
    () => ({ ...state, addKeyword, deleteKeyword, updateTaskStatus, reset }),
    [state, addKeyword, deleteKeyword, updateTaskStatus, reset],
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
