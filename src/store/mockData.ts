// JP SEO Bot — mock data + JAPAN_BACKLINK_SOURCES (§B 原文を型化).
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

export const DEFAULT_SITES: Site[] = [
  {
    id: 'site-1',
    name: '株式会社マジック コーポレート',
    url: 'https://magic.example.co.jp',
    industry: 'SaaS / BtoB',
    language: 'ja',
    createdAt: '2026-01-12T03:00:00Z',
  },
  {
    id: 'site-2',
    name: '東京カフェ巡り',
    url: 'https://tokyo-cafe.example.com',
    industry: '飲食 / メディア',
    language: 'ja',
    createdAt: '2026-02-22T05:00:00Z',
  },
  {
    id: 'site-3',
    name: '美容クリニック銀座',
    url: 'https://ginza-beauty.example.jp',
    industry: '医療 / 美容',
    language: 'ja',
    createdAt: '2026-03-04T07:00:00Z',
  },
]

export const DEFAULT_KEYWORDS: Keyword[] = [
  { id: 'kw-1', siteId: 'site-1', keyword: 'SEO 対策 ツール', searchVolume: 8100, difficulty: 62, rank: 14, trend: [16, 15, 15, 14, 14, 13, 13, 14, 14, 14, 14, 14], intent: 'commercial', cluster: 'SEO ツール比較', updatedAt: '2026-05-26T09:00:00Z' },
  { id: 'kw-2', siteId: 'site-1', keyword: 'コンテンツマーケティング 事例', searchVolume: 2900, difficulty: 38, rank: 7, trend: [12, 11, 10, 9, 9, 8, 8, 8, 7, 7, 7, 7], intent: 'informational', cluster: 'コンテンツマーケ', updatedAt: '2026-05-26T09:00:00Z' },
  { id: 'kw-3', siteId: 'site-1', keyword: 'BtoB リード獲得', searchVolume: 1300, difficulty: 45, rank: 22, trend: [30, 28, 27, 25, 24, 24, 23, 23, 22, 22, 22, 22], intent: 'commercial', cluster: 'BtoB マーケ', updatedAt: '2026-05-26T09:00:00Z' },
  { id: 'kw-4', siteId: 'site-1', keyword: 'AIライティング 比較', searchVolume: 4400, difficulty: 55, rank: 31, trend: [40, 38, 36, 35, 34, 33, 32, 32, 31, 31, 31, 31], intent: 'commercial', cluster: 'AI ライティング', updatedAt: '2026-05-26T09:00:00Z' },
  { id: 'kw-5', siteId: 'site-1', keyword: 'SaaS 比較 サイト', searchVolume: 720, difficulty: 28, rank: 4, trend: [10, 9, 8, 8, 7, 6, 6, 5, 5, 4, 4, 4], intent: 'navigational', cluster: 'SaaS 比較', updatedAt: '2026-05-26T09:00:00Z' },
  { id: 'kw-6', siteId: 'site-1', keyword: 'リスティング広告 効果', searchVolume: 5400, difficulty: 70, rank: null, trend: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], intent: 'informational', cluster: 'リスティング広告', updatedAt: '2026-05-26T09:00:00Z' },
  { id: 'kw-7', siteId: 'site-2', keyword: '渋谷 カフェ 電源', searchVolume: 2200, difficulty: 32, rank: 6, trend: [9, 8, 8, 7, 7, 7, 6, 6, 6, 6, 6, 6], intent: 'commercial', cluster: '電源カフェ', updatedAt: '2026-05-26T09:00:00Z' },
  { id: 'kw-8', siteId: 'site-2', keyword: '原宿 カフェ おしゃれ', searchVolume: 3300, difficulty: 41, rank: 11, trend: [16, 15, 14, 14, 13, 13, 12, 12, 12, 11, 11, 11], intent: 'informational', cluster: 'おしゃれカフェ', updatedAt: '2026-05-26T09:00:00Z' },
  { id: 'kw-9', siteId: 'site-3', keyword: '銀座 美容クリニック レーザー', searchVolume: 880, difficulty: 48, rank: 8, trend: [14, 12, 11, 10, 10, 9, 9, 8, 8, 8, 8, 8], intent: 'commercial', cluster: 'レーザー治療', updatedAt: '2026-05-26T09:00:00Z' },
]

export const DEFAULT_ARTICLES: Article[] = [
  { id: 'art-1', siteId: 'site-1', title: '【2026年版】SEO 対策ツール 12 選 比較：機能・料金・選び方', targetKeyword: 'SEO 対策 ツール', contentHtml: '<h1>SEO 対策ツール 12 選</h1><p>2026 年の最新 SEO ツール事情を網羅。…</p>', contentMd: '# SEO 対策ツール 12 選\n\n2026 年の最新 SEO ツール事情を網羅。…', metaDescription: '2026 年最新版。SEO 対策ツール 12 製品を機能・料金・サポート体制まで徹底比較。中小企業の SEO 担当者向け選び方ガイド。', status: 'published', wordCount: 4280, score: 82, publishedAt: '2026-04-18T02:00:00Z', createdAt: '2026-04-10T06:00:00Z' },
  { id: 'art-2', siteId: 'site-1', title: 'BtoB SaaS のコンテンツマーケティング成功事例 7 選', targetKeyword: 'コンテンツマーケティング 事例', contentHtml: '<h1>BtoB SaaS の成功事例</h1><p>国内 SaaS 企業のコンテンツ施策を分析。…</p>', contentMd: '# BtoB SaaS の成功事例\n\n国内 SaaS 企業のコンテンツ施策を分析。…', metaDescription: 'BtoB SaaS 7 社のコンテンツマーケ事例を分析。リード獲得・CVR 改善に直結した施策のみ。', status: 'published', wordCount: 3920, score: 78, publishedAt: '2026-05-02T03:00:00Z', createdAt: '2026-04-25T07:00:00Z' },
  { id: 'art-3', siteId: 'site-1', title: 'AI ライティングツール導入で失敗する 5 つのパターン', targetKeyword: 'AIライティング 比較', contentHtml: '<h1>AI ライティング失敗パターン</h1><p>…</p>', contentMd: '# AI ライティング失敗パターン\n\n…', metaDescription: 'AI ライティング導入で陥りがちな 5 つの失敗。実例と回避策を解説。', status: 'draft', wordCount: 1840, score: 64, createdAt: '2026-05-20T09:00:00Z' },
]

export const DEFAULT_AUDIT_ISSUES: AuditIssue[] = [
  { id: 'ai-1', category: 'technical', severity: 'critical', title: 'robots.txt で / が Disallow されています', description: 'クローラがサイト全体をクロールできません。すぐ修正してください。', affectedPages: 1 },
  { id: 'ai-2', category: 'speed', severity: 'warning', title: 'LCP > 2.5s のページが 12 件', description: '画像最適化と font-display: swap で改善できます。', affectedPages: 12 },
  { id: 'ai-3', category: 'on-page', severity: 'warning', title: 'meta description が未設定のページが 8 件', description: 'CTR 改善のため日本語 70-120 文字で記入を推奨。', affectedPages: 8 },
  { id: 'ai-4', category: 'mobile', severity: 'info', title: 'タップターゲットが小さい (44px 未満) ページ 3 件', description: 'モバイル CV 率に影響します。', affectedPages: 3 },
  { id: 'ai-5', category: 'content', severity: 'warning', title: '薄いコンテンツ (300 語未満) 5 件', description: '統合または充実化を検討。', affectedPages: 5 },
]

export const DEFAULT_COMPETITORS: Competitor[] = [
  { id: 'cp-1', domain: 'ferret-plus.com', dr: 78, organicTraffic: 1240000, organicKeywords: 38400, topKeywords: ['SEO とは', 'コンテンツマーケティング', 'Webマーケティング'], overlap: 18 },
  { id: 'cp-2', domain: 'web-tan.forum.impressrd.jp', dr: 81, organicTraffic: 980000, organicKeywords: 29800, topKeywords: ['Google アルゴリズム', 'コアアップデート', 'E-E-A-T'], overlap: 14 },
  { id: 'cp-3', domain: 'bazubu.com', dr: 72, organicTraffic: 610000, organicKeywords: 18900, topKeywords: ['SEO 内部対策', '被リンク', 'コンテンツ SEO'], overlap: 22 },
]

export const BACKLINK_SOURCES: BacklinkSource[] = [
  { id: 'bl-blog-1', name: 'はてなブログ', domain: 'hatenablog.com', dr: 85, type: 'blog', seoStrength: 'high', notes: 'はてなブックマークとの連携で拡散力高。2025年以降 SEO が弱化傾向あり', linkType: 'dofollow', freeAvailable: true, url: 'https://hatenablog.com', category: 'blog', status: 'registered', registeredAt: '2026-03-02T05:00:00Z' },
  { id: 'bl-blog-2', name: 'note', domain: 'note.com', dr: 82, type: 'blog', seoStrength: 'high', notes: 'クリエイター向け。Google 検索での流入が強い。SEO に強い構造', linkType: 'dofollow', freeAvailable: true, url: 'https://note.com', category: 'blog', status: 'registered', registeredAt: '2026-02-18T06:00:00Z' },
  { id: 'bl-blog-3', name: 'アメーバブログ（Ameba）', domain: 'ameblo.jp', dr: 88, type: 'blog', seoStrength: 'medium', notes: '2025年以降 SEO が回復傾向。BtoC ブランド認知に有効', linkType: 'nofollow_mostly', freeAvailable: true, url: 'https://ameblo.jp', category: 'blog', status: 'not_registered' },
  { id: 'bl-blog-4', name: 'livedoor Blog', domain: 'livedoor.blog', dr: 82, type: 'blog', seoStrength: 'medium', notes: '老舗。無料で使えるが更新頻度が必要', linkType: 'mixed', freeAvailable: true, url: 'https://livedoor.blog', category: 'blog', status: 'not_registered' },
  { id: 'bl-blog-5', name: 'FC2 ブログ', domain: 'fc2.com', dr: 79, type: 'blog', seoStrength: 'medium', notes: 'カスタマイズ性高。アダルト系も多いので業種による選択が必要', linkType: 'dofollow', freeAvailable: true, url: 'https://blog.fc2.com', category: 'blog', status: 'not_registered' },
  { id: 'bl-pr-1', name: 'PR TIMES', domain: 'prtimes.jp', dr: 91, type: 'press_release', seoStrength: 'very_high', notes: 'DR91 の超強力ドメイン。nofollow だが言及価値あり。1本3〜5万円', linkType: 'nofollow', freeAvailable: false, estimatedCost: '¥30,000〜50,000/本', url: 'https://prtimes.jp', category: 'press_release', status: 'in_progress' },
  { id: 'bl-pr-2', name: 'PRTIMES Growth', domain: 'prtimes.jp', dr: 91, type: 'press_release', seoStrength: 'very_high', notes: 'スタートアップ向けの廉価版。月額制', linkType: 'nofollow', freeAvailable: false, estimatedCost: '月額制あり', url: 'https://prtimes.jp', category: 'press_release', status: 'not_registered' },
  { id: 'bl-pr-3', name: '@Press', domain: 'atpress.ne.jp', dr: 75, type: 'press_release', seoStrength: 'high', notes: 'PR TIMES より安価。配信先メディア数は少ない', linkType: 'nofollow', freeAvailable: false, estimatedCost: '¥10,000〜30,000/本', url: 'https://www.atpress.ne.jp', category: 'press_release', status: 'not_registered' },
  { id: 'bl-pr-4', name: 'VALUE PRESS', domain: 'value-press.com', dr: 71, type: 'press_release', seoStrength: 'medium', notes: '月1本まで無料プランあり。コスパ良', linkType: 'nofollow', freeAvailable: true, url: 'https://www.value-press.com', category: 'press_release', status: 'registered', registeredAt: '2026-04-01T08:00:00Z' },
  { id: 'bl-cmp-1', name: 'Boxil SaaS', domain: 'boxil.jp', dr: 76, type: 'comparison', seoStrength: 'very_high', notes: 'BtoB SaaS の定番比較サイト。掲載で信頼性向上 + 被リンク', linkType: 'dofollow', freeAvailable: true, url: 'https://boxil.jp', category: 'comparison', industry: ['SaaS', 'BtoB'], status: 'registered', registeredAt: '2026-03-15T05:00:00Z' },
  { id: 'bl-cmp-2', name: 'ITreview', domain: 'itreview.jp', dr: 68, type: 'review', seoStrength: 'high', notes: 'IT ツールのレビューサイト。B2B 購買検討時に参照される', linkType: 'dofollow', freeAvailable: true, url: 'https://www.itreview.jp', category: 'comparison', industry: ['SaaS', 'BtoB'], status: 'in_progress' },
  { id: 'bl-cmp-3', name: 'PRONI アイミツ', domain: 'saas.imitsu.jp', dr: 65, type: 'comparison', seoStrength: 'high', notes: '発注比較サービス。SEO ツール系のキーワードで上位表示多数', linkType: 'dofollow', freeAvailable: true, url: 'https://saas.imitsu.jp', category: 'comparison', industry: ['SaaS', 'BtoB'], status: 'not_registered' },
  { id: 'bl-cmp-4', name: 'G2 Japan', domain: 'g2.com', dr: 91, type: 'review', seoStrength: 'very_high', notes: 'グローバル最大の SaaS レビューサイト。DR91', linkType: 'dofollow', freeAvailable: true, url: 'https://www.g2.com', category: 'comparison', industry: ['SaaS'], status: 'not_registered' },
  { id: 'bl-cmp-5', name: 'Capterra 日本', domain: 'capterra.jp', dr: 88, type: 'comparison', seoStrength: 'very_high', notes: 'Gartner グループ。信頼性が高くエンタープライズ向け', linkType: 'dofollow', freeAvailable: true, url: 'https://www.capterra.jp', category: 'comparison', industry: ['SaaS', 'Enterprise'], status: 'not_registered' },
  { id: 'bl-cmp-6', name: 'アスピック（ASPIC）', domain: 'aspicjapan.org', dr: 55, type: 'comparison', seoStrength: 'medium', notes: 'クラウドサービス専門。業界団体運営で信頼性高', linkType: 'dofollow', freeAvailable: true, url: 'https://www.aspicjapan.org', category: 'comparison', industry: ['SaaS'], status: 'not_registered' },
  { id: 'bl-prt-1', name: 'Yahoo!ロコ', domain: 'loco.yahoo.co.jp', dr: 91, type: 'local_directory', seoStrength: 'very_high', notes: 'Yahoo Japan のローカル情報。MEO に直結', linkType: 'dofollow', freeAvailable: true, url: 'https://loco.yahoo.co.jp', category: 'portal', status: 'registered', registeredAt: '2026-02-10T05:00:00Z' },
  { id: 'bl-prt-2', name: 'エキテン', domain: 'ekiten.jp', dr: 74, type: 'local_directory', seoStrength: 'high', notes: '地域ビジネス検索。ローカル SEO で必須登録先', linkType: 'dofollow', freeAvailable: true, url: 'https://www.ekiten.jp', category: 'portal', status: 'in_progress' },
  { id: 'bl-prt-3', name: 'Googleビジネスプロフィール', domain: 'google.com', dr: 99, type: 'meo', seoStrength: 'critical', notes: 'MEO の最重要施策。Map Pack（ローカルパック）表示に直結', linkType: 'dofollow', freeAvailable: true, url: 'https://business.google.com', category: 'portal', status: 'registered', registeredAt: '2026-01-20T03:00:00Z' },
  { id: 'bl-prt-4', name: 'Bing プレイス', domain: 'bingplaces.com', dr: 95, type: 'local_directory', seoStrength: 'medium', notes: 'Bing 経由のローカル流入。デスクトップで Edge デフォルト', linkType: 'dofollow', freeAvailable: true, url: 'https://www.bingplaces.com', category: 'portal', status: 'not_registered' },
  { id: 'bl-cm-1', name: 'Yahoo!知恵袋', domain: 'chiebukuro.yahoo.co.jp', dr: 91, type: 'qa', seoStrength: 'very_high', notes: '日本最大の Q&A。権威ある回答でブランド認知と間接的 SEO 効果', linkType: 'nofollow', freeAvailable: true, url: 'https://chiebukuro.yahoo.co.jp', category: 'community', status: 'not_registered' },
  { id: 'bl-cm-2', name: 'Qiita', domain: 'qiita.com', dr: 83, type: 'tech_blog', seoStrength: 'very_high', notes: 'エンジニア向け。テック系サービスに最重要。dofollow リンク可', linkType: 'dofollow', freeAvailable: true, url: 'https://qiita.com', category: 'community', industry: ['tech', 'SaaS'], status: 'registered', registeredAt: '2026-03-22T05:00:00Z' },
  { id: 'bl-cm-3', name: 'Zenn', domain: 'zenn.dev', dr: 75, type: 'tech_blog', seoStrength: 'high', notes: 'エンジニア向け技術記事。Qiita と並ぶ権威サイト', linkType: 'dofollow', freeAvailable: true, url: 'https://zenn.dev', category: 'community', industry: ['tech', 'SaaS'], status: 'registered', registeredAt: '2026-04-10T05:00:00Z' },
  { id: 'bl-cm-4', name: 'teratail', domain: 'teratail.com', dr: 71, type: 'tech_qa', seoStrength: 'high', notes: 'IT 系 Q&A サイト。技術的な権威性アピールに有効', linkType: 'nofollow', freeAvailable: true, url: 'https://teratail.com', category: 'community', industry: ['tech'], status: 'not_registered' },
  { id: 'bl-cm-5', name: 'connpass', domain: 'connpass.com', dr: 76, type: 'event', seoStrength: 'medium', notes: '勉強会・イベント登録。業界認知向上。被リンク副次効果', linkType: 'dofollow', freeAvailable: true, url: 'https://connpass.com', category: 'community', industry: ['tech'], status: 'in_progress' },
  { id: 'bl-auth-1', name: 'Wikipedia（日本語版）', domain: 'ja.wikipedia.org', dr: 94, type: 'wiki', seoStrength: 'critical', notes: '企業・サービスページへの掲載は究極の信頼性。容易ではない', linkType: 'nofollow', freeAvailable: false, url: 'https://ja.wikipedia.org', category: 'authoritative', status: 'not_registered' },
  { id: 'bl-auth-2', name: '中小企業庁 / 経産省', domain: 'meti.go.jp', dr: 83, type: 'government', seoStrength: 'critical', notes: '補助金ナビとの連携シナジー。政府機関掲載は最高の被リンク', linkType: 'dofollow', freeAvailable: false, url: 'https://www.meti.go.jp', category: 'authoritative', status: 'not_registered' },
]

export const JAPAN_LOCAL_DIRECTORIES = [
  { id: 'd1', name: 'Googleビジネスプロフィール', url: 'business.google.com', critical: true, industry: 'all' },
  { id: 'd2', name: 'Yahoo!ロコ', url: 'loco.yahoo.co.jp', critical: true, industry: 'all' },
  { id: 'd3', name: 'Bing プレイス', url: 'bingplaces.com', critical: false, industry: 'all' },
  { id: 'd4', name: 'エキテン', url: 'ekiten.jp', critical: true, industry: 'all' },
  { id: 'd5', name: 'ホットペッパー', url: 'hotpepper.jp', critical: false, industry: 'food' },
  { id: 'd6', name: '食べログ', url: 'tabelog.com', critical: false, industry: 'food' },
  { id: 'd7', name: '求人ボックス', url: 'kyujinbox.com', critical: false, industry: 'all' },
  { id: 'd8', name: 'Wantedly', url: 'wantedly.com', critical: false, industry: 'tech' },
  { id: 'd9', name: 'じゃらん', url: 'jalan.net', critical: false, industry: 'hotel' },
] as const

export const DEFAULT_MEO: Record<string, MeoProfile> = {
  'site-1': {
    siteId: 'site-1',
    businessName: '株式会社マジック',
    gbpPlaceId: 'ChIJSAMPLE_PLACE_ID_MAGIC',
    yahooLocoUrl: 'https://loco.yahoo.co.jp/place/sample-magic',
    ekitenUrl: 'https://www.ekiten.jp/shop_sample_magic/',
    completionScore: 72,
    reviewCount: 48,
    averageRating: 4.4,
    checklist: { hasBusinessName: true, hasAddress: true, hasPhone: true, hasWebsite: true, hasBusinessHours: true, hasCategory: true, hasJapaneseDescription: true, hasPhotos: true, hasGooglePost: false, hasReviewResponse: false, hasQASection: true, hasFacilityInfo: false, hasAccessibility: false, hasServiceMenu: true, hasBookingLink: false },
    lastAuditedAt: '2026-05-25T10:00:00Z',
    directoryRegistrations: { d1: true, d2: true, d3: false, d4: true, d7: false, d8: true },
  },
  'site-2': {
    siteId: 'site-2',
    businessName: '東京カフェ巡り 編集部',
    completionScore: 54,
    reviewCount: 21,
    averageRating: 4.7,
    checklist: { hasBusinessName: true, hasAddress: true, hasPhone: false, hasWebsite: true, hasBusinessHours: false, hasCategory: true, hasJapaneseDescription: true, hasPhotos: true, hasGooglePost: true, hasReviewResponse: true, hasQASection: false, hasFacilityInfo: false, hasAccessibility: false, hasServiceMenu: false, hasBookingLink: false },
    lastAuditedAt: '2026-05-24T10:00:00Z',
    directoryRegistrations: { d1: true, d2: false, d4: false, d5: true, d6: true },
  },
  'site-3': {
    siteId: 'site-3',
    businessName: '銀座美容クリニック',
    gbpPlaceId: 'ChIJSAMPLE_PLACE_GINZA',
    completionScore: 88,
    reviewCount: 132,
    averageRating: 4.6,
    checklist: { hasBusinessName: true, hasAddress: true, hasPhone: true, hasWebsite: true, hasBusinessHours: true, hasCategory: true, hasJapaneseDescription: true, hasPhotos: true, hasGooglePost: true, hasReviewResponse: true, hasQASection: true, hasFacilityInfo: true, hasAccessibility: true, hasServiceMenu: true, hasBookingLink: true },
    lastAuditedAt: '2026-05-26T10:00:00Z',
    directoryRegistrations: { d1: true, d2: true, d4: true },
  },
}

export const DEFAULT_WP: Record<string, WordPressIntegration> = {
  'site-1': {
    siteId: 'site-1',
    wpUrl: 'https://magic.example.co.jp',
    wpUsername: 'editor',
    wpAppPasswordMasked: '••••-••••-••••-XYZ4',
    detectedSeoPlugin: 'rankmath',
    isActive: true,
    lastSyncedAt: '2026-05-27T15:00:00Z',
  },
}

export const DEFAULT_WP_POSTS: WPPost[] = [
  { id: 101, title: '【2026年版】SEO 対策ツール 12 選 比較', status: 'publish', slug: 'seo-tools-2026', seoTitle: '【2026年版】SEO 対策ツール 12 選 比較 | 株式会社マジック', seoDescription: '2026 年最新版。SEO 対策ツール 12 製品を機能・料金・サポート体制まで徹底比較。', focusKeyword: 'SEO 対策 ツール', modifiedAt: '2026-04-18T02:00:00Z' },
  { id: 102, title: 'BtoB SaaS のコンテンツマーケティング成功事例 7 選', status: 'publish', slug: 'btob-content-marketing-cases', seoTitle: 'BtoB SaaS コンテンツマーケ成功事例 7 選 | 株式会社マジック', seoDescription: 'BtoB SaaS 7 社のコンテンツマーケ事例を分析。', focusKeyword: 'コンテンツマーケティング 事例', modifiedAt: '2026-05-02T03:00:00Z' },
  { id: 103, title: 'AI ライティングツール導入で失敗する 5 つのパターン', status: 'draft', slug: 'ai-writing-fail-patterns', focusKeyword: 'AIライティング 比較', modifiedAt: '2026-05-20T09:00:00Z' },
]

export const DEFAULT_CALENDAR: CalendarEntry[] = [
  { id: 'cal-1', siteId: 'site-1', title: '【新生活応援】中小企業 SEO 入門 — 4月から始める集客', targetKeyword: '中小企業 SEO', plannedDate: '2026-04-05', status: 'published', seasonalTag: '新生活' },
  { id: 'cal-2', siteId: 'site-1', title: 'GW 中に読みたい SEO 担当者向けおすすめ書籍 10 選', targetKeyword: 'SEO 本', plannedDate: '2026-04-28', status: 'published', seasonalTag: 'ゴールデンウィーク' },
  { id: 'cal-3', siteId: 'site-1', title: '梅雨時期の検索行動変化と季節キーワード対策', targetKeyword: '梅雨 マーケティング', plannedDate: '2026-06-08', status: 'in_progress', seasonalTag: '梅雨' },
  { id: 'cal-4', siteId: 'site-1', title: '夏のインターン応募シーズン:採用 SEO チェックリスト', targetKeyword: '採用 SEO', plannedDate: '2026-06-25', status: 'planned', seasonalTag: '夏インターン応募' },
  { id: 'cal-5', siteId: 'site-2', title: '七夕の都内カフェ巡り 2026 — おすすめ 10 軒', targetKeyword: '七夕 カフェ 東京', plannedDate: '2026-07-02', status: 'planned', seasonalTag: '七夕' },
  { id: 'cal-6', siteId: 'site-1', title: 'お盆休み前に整理したい SEO データ — 半期総括', targetKeyword: 'SEO レポート', plannedDate: '2026-08-08', status: 'planned', seasonalTag: 'お盆' },
]

export const JAPAN_CONTENT_CALENDAR: Record<number, string[]> = {
  1: ['初売り', '成人式', '年始の挨拶', '確定申告準備'],
  2: ['節分', 'バレンタイン', '確定申告'],
  3: ['ひな祭り', '卒業シーズン', '年度末', '引越しシーズン'],
  4: ['新生活', '入学・入社', '花見', '新年度'],
  5: ['ゴールデンウィーク', '母の日', 'こどもの日'],
  6: ['梅雨', '父の日', '夏インターン応募'],
  7: ['七夕', '夏休み', 'お中元'],
  8: ['お盆', '夏祭り', '甲子園'],
  9: ['防災の日', '敬老の日', '秋の行楽シーズン'],
  10: ['ハロウィン', '運動会', '紅葉シーズン開始'],
  11: ['七五三', '文化の日', '紅葉ピーク'],
  12: ['忘年会', 'クリスマス', '大掃除', '年賀状'],
}

export const JAPAN_RICH_RESULTS = [
  { type: 'FAQ', impact: 'high' as const, description: '検索結果でアコーディオン形式の Q&A を表示。CTR +20〜50% 効果あり', schemaType: 'FAQPage', bestFor: '情報系コンテンツ、ハウツー記事' },
  { type: 'HowTo', impact: 'high' as const, description: '手順を視覚的に表示。料理・DIY・手続き系に有効', schemaType: 'HowTo', bestFor: '手順説明コンテンツ' },
  { type: 'LocalBusiness', impact: 'critical' as const, description: 'Googleマップ連携。店舗・事務所の情報表示に必須', schemaType: 'LocalBusiness', bestFor: '地域ビジネス' },
  { type: 'Review / Rating', impact: 'medium' as const, description: '星評価を検索結果に表示。CTR +15〜30%', schemaType: 'Review', bestFor: 'SaaS・サービス・製品レビュー' },
  { type: 'Article（更新日表示）', impact: 'medium' as const, description: '公開日・更新日を検索結果に表示。鮮度が評価される', schemaType: 'Article', bestFor: 'ニュース・解説記事' },
  { type: 'Breadcrumb', impact: 'medium' as const, description: 'パンくずリストを検索結果 URL の代わりに表示', schemaType: 'BreadcrumbList', bestFor: 'すべてのページ' },
]
