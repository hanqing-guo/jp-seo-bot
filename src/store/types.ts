// JP SEO Bot — store types. JAPAN_SPEC §I の型化版。

export interface Site {
  id: string
  name: string
  url: string
  industry: string
  language: 'ja' | 'en' | 'zh'
  createdAt: string
}

export interface Keyword {
  id: string
  siteId: string
  keyword: string
  searchVolume: number
  difficulty: number
  rank: number | null
  trend: number[]
  intent: 'informational' | 'navigational' | 'commercial' | 'transactional'
  cluster: string
  updatedAt: string
}

export interface Article {
  id: string
  siteId: string
  title: string
  targetKeyword: string
  contentHtml: string
  contentMd: string
  metaDescription: string
  status: 'draft' | 'in_review' | 'published'
  wordCount: number
  score?: number
  publishedAt?: string
  createdAt: string
}

export interface RankSnapshot {
  date: string
  keyword: string
  rank: number
  url: string
}

export interface AuditIssue {
  id: string
  category: 'technical' | 'on-page' | 'content' | 'mobile' | 'speed'
  severity: 'critical' | 'warning' | 'info'
  title: string
  description: string
  affectedPages: number
}

export interface Competitor {
  id: string
  domain: string
  dr: number
  organicTraffic: number
  organicKeywords: number
  topKeywords: string[]
  overlap: number
}

export interface BacklinkSource {
  id: string
  name: string
  domain: string
  dr: number
  type: string
  seoStrength: 'low' | 'medium' | 'high' | 'very_high' | 'critical'
  notes: string
  linkType: 'dofollow' | 'nofollow' | 'nofollow_mostly' | 'mixed'
  freeAvailable: boolean
  estimatedCost?: string
  url: string
  category:
    | 'blog'
    | 'press_release'
    | 'comparison'
    | 'portal'
    | 'community'
    | 'authoritative'
  industry?: string[]
  status: 'not_registered' | 'in_progress' | 'registered' | 'failed'
  registeredAt?: string
}

export interface MeoChecklist {
  hasBusinessName: boolean
  hasAddress: boolean
  hasPhone: boolean
  hasWebsite: boolean
  hasBusinessHours: boolean
  hasCategory: boolean
  hasJapaneseDescription: boolean
  hasPhotos: boolean
  hasGooglePost: boolean
  hasReviewResponse: boolean
  hasQASection: boolean
  hasFacilityInfo: boolean
  hasAccessibility: boolean
  hasServiceMenu: boolean
  hasBookingLink: boolean
}

export interface MeoProfile {
  siteId: string
  businessName: string
  gbpPlaceId?: string
  yahooLocoUrl?: string
  ekitenUrl?: string
  completionScore: number
  reviewCount: number
  averageRating: number
  checklist: MeoChecklist
  lastAuditedAt: string
  directoryRegistrations: Record<string, boolean>
}

export interface WordPressIntegration {
  siteId: string
  wpUrl: string
  wpUsername: string
  wpAppPasswordMasked: string
  detectedSeoPlugin?: 'yoast' | 'rankmath' | 'aioseo' | 'simple_pack' | null
  isActive: boolean
  lastSyncedAt?: string
}

export interface WPPost {
  id: number
  title: string
  status: 'publish' | 'draft' | 'pending'
  slug: string
  seoTitle?: string
  seoDescription?: string
  focusKeyword?: string
  modifiedAt: string
}

export interface CalendarEntry {
  id: string
  siteId: string
  title: string
  targetKeyword: string
  plannedDate: string
  status: 'planned' | 'in_progress' | 'published' | 'cancelled'
  seasonalTag?: string
}

export interface ContentScoreBreakdown {
  coOccurrenceScore: number
  readabilityScore: number
  keywordDensity: number
  headingStructure: number
  wordCount: number
  internalLinks: number
  authorInfo: number
  citationScore: number
  updateDate: number
  yakujihoCompliance: number
  keigo: number
  faqPresence: number
}

export interface ContentScore {
  overall: number
  breakdown: ContentScoreBreakdown
  suggestions: string[]
}
