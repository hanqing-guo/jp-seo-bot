// Module F — AI サマリー生成
// DIAGNOSIS_SPEC.md §8 ベース。Provider switch (DeepSeek / Claude / template)。

import type { TechnicalCheckResult } from '../../_shared/types.ts'

declare const Deno: { env: { get: (k: string) => string | undefined } } | undefined

function env(key: string): string | undefined {
  if (typeof Deno !== 'undefined' && Deno.env) return Deno.env.get(key)
  return undefined
}

export interface AiSummary {
  summary: string
  quickWins: string[]
  provider: 'deepseek' | 'claude' | 'template'
}

export async function generateAISummary(
  url: string,
  allResults: TechnicalCheckResult[],
  googleScore: number,
  yahooScore: number,
  totalScore: number,
): Promise<AiSummary> {
  const domain = new URL(url).hostname
  const critical = allResults.filter(r => r.level === 'critical')
  const warning  = allResults.filter(r => r.level === 'warning')

  const prompt = buildPrompt(domain, totalScore, googleScore, yahooScore, critical, warning)

  const deepseekKey = env('DEEPSEEK_API_KEY')
  if (deepseekKey) {
    try {
      const parsed = await callDeepSeek(prompt, deepseekKey)
      return { ...formatSummary(parsed), provider: 'deepseek' }
    } catch (e) {
      console.error('DeepSeek API failed, falling back', e)
    }
  }

  const claudeKey = env('ANTHROPIC_API_KEY')
  if (claudeKey) {
    try {
      const parsed = await callClaude(prompt, claudeKey)
      return { ...formatSummary(parsed), provider: 'claude' }
    } catch (e) {
      console.error('Anthropic API failed, falling back', e)
    }
  }

  return { ...templateSummary(domain, totalScore, googleScore, yahooScore, critical, warning), provider: 'template' }
}

interface ParsedAi {
  headline: string
  summary: string
  quickWins: string[]
  urgencyMessage?: string
}

function buildPrompt(
  domain: string,
  totalScore: number,
  googleScore: number,
  yahooScore: number,
  critical: TechnicalCheckResult[],
  warning: TechnicalCheckResult[],
): string {
  return `あなたは日本市場専門の SEO アドバイザーです。
以下のサイト診断結果を分析し、日本の中小企業経営者向けに、
わかりやすく・具体的・行動につながるサマリーを生成してください。

【診断サイト】${domain}
【総合スコア】${totalScore}/100
【Google Japan スコア】${googleScore}/100
【Yahoo Japan スコア】${yahooScore}/100
【重大な問題】${critical.length} 件: ${critical.slice(0, 5).map(i => i.title).join(' / ')}
【警告】${warning.length} 件: ${warning.slice(0, 5).map(i => i.title).join(' / ')}

以下の形式で JSON のみを返してください(コードフェンス不要、説明文不要):
{
  "headline": "一言で現状を表す見出し(20 文字以内)",
  "summary": "現状説明と改善の方向性(150〜200 文字、専門用語には括弧で説明を付ける)",
  "quickWins": [
    "今日からできる最優先改善策 1(具体的なアクション)",
    "今週中にできる改善策 2",
    "今月中にできる改善策 3"
  ],
  "urgencyMessage": "経営者の危機感を高める一言メッセージ(あれば)"
}`
}

async function callDeepSeek(prompt: string, key: string): Promise<ParsedAi> {
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 800,
      temperature: 0.5,
    }),
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) throw new Error(`DeepSeek HTTP ${res.status}`)
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content ?? ''
  return parseJsonResponse(text)
}

async function callClaude(prompt: string, key: string): Promise<ParsedAi> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}`)
  const data = await res.json()
  const text = (data?.content?.[0]?.text ?? '') as string
  return parseJsonResponse(text)
}

function parseJsonResponse(text: string): ParsedAi {
  const cleaned = text.replace(/```json\s*|\s*```/g, '').trim()
  const obj = JSON.parse(cleaned) as ParsedAi
  if (!obj.summary || !Array.isArray(obj.quickWins)) {
    throw new Error('AI response missing required fields')
  }
  return obj
}

function formatSummary(parsed: ParsedAi): { summary: string; quickWins: string[] } {
  return {
    summary:
      `${parsed.headline}\n\n${parsed.summary}` +
      (parsed.urgencyMessage ? `\n\n${parsed.urgencyMessage}` : ''),
    quickWins: parsed.quickWins.filter(s => typeof s === 'string' && s.length > 0),
  }
}

function templateSummary(
  domain: string,
  totalScore: number,
  googleScore: number,
  yahooScore: number,
  critical: TechnicalCheckResult[],
  warning: TechnicalCheckResult[],
): { summary: string; quickWins: string[] } {
  const grade =
    totalScore >= 80 ? 'A 優秀' :
    totalScore >= 65 ? 'B 良好' :
    totalScore >= 50 ? 'C 改善が必要' :
    totalScore >= 30 ? 'D 問題あり' : 'F 緊急対応必要'

  const headline =
    totalScore >= 65 ? 'SEO 基盤は概ね整っています' :
    totalScore >= 50 ? '改善余地が複数あります' :
                       '緊急の改善が必要です'

  const summary =
    `${domain} の総合スコアは ${totalScore}/100(${grade})。` +
    `Google Japan ${googleScore} 点、Yahoo Japan ${yahooScore} 点で、` +
    `重大な問題 ${critical.length} 件、警告 ${warning.length} 件を検出しました。` +
    (totalScore < 50
      ? '特に重大な問題から優先して対応してください。'
      : '残る課題を順次つぶせば上位表示の可能性が高まります。')

  const all = [...critical, ...warning]
  const quickWins = all.slice(0, 3).map(i => {
    const fix = (i.fixSuggestion || '').split('\n')[0] || '改善方針を確認してください'
    return `${i.title}:${fix}`
  })

  return {
    summary: `${headline}\n\n${summary}`,
    quickWins: quickWins.length > 0 ? quickWins : ['現在大きな問題は検出されていません。さらに上位を狙うなら被リンクと AI Overview 対応がおすすめです。'],
  }
}
