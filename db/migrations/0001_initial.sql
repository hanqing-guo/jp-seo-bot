-- JP SEO Bot — 初期スキーマ
-- JAPAN_SPEC §I 原文 + コア機能用テーブル (sites / keywords / content_articles / audit_issues)
-- Postgres / Supabase 互換

CREATE TABLE IF NOT EXISTS sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  industry TEXT,
  language TEXT NOT NULL DEFAULT 'ja' CHECK (language IN ('ja', 'en', 'zh')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sites_user_id ON sites(user_id);

CREATE TABLE IF NOT EXISTS keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  search_volume INTEGER,
  difficulty INTEGER CHECK (difficulty BETWEEN 0 AND 100),
  intent TEXT CHECK (intent IN ('informational', 'navigational', 'commercial', 'transactional')),
  cluster TEXT,
  current_rank INTEGER,
  trend JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_keywords_site_id ON keywords(site_id);

CREATE TABLE IF NOT EXISTS content_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_keyword TEXT,
  content_html TEXT,
  content_md TEXT,
  meta_description TEXT,
  word_count INTEGER,
  score INTEGER,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'published')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_articles_site_id ON content_articles(site_id);

CREATE TABLE IF NOT EXISTS audit_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  category TEXT CHECK (category IN ('technical', 'on-page', 'content', 'mobile', 'speed')),
  severity TEXT CHECK (severity IN ('critical', 'warning', 'info')),
  title TEXT NOT NULL,
  description TEXT,
  affected_pages INTEGER DEFAULT 0,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_issues_site_id ON audit_issues(site_id);

CREATE TABLE IF NOT EXISTS backlink_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_domain TEXT NOT NULL,
  dr_score INTEGER,
  link_type TEXT CHECK (link_type IN ('dofollow', 'nofollow', 'nofollow_mostly', 'mixed')),
  category TEXT CHECK (category IN ('blog', 'press_release', 'comparison', 'portal', 'community', 'authoritative')),
  seo_strength TEXT CHECK (seo_strength IN ('low', 'medium', 'high', 'very_high', 'critical')),
  status TEXT DEFAULT 'not_registered' CHECK (status IN ('not_registered', 'in_progress', 'registered', 'failed')),
  registered_at TIMESTAMPTZ,
  notes TEXT,
  free_available BOOLEAN DEFAULT TRUE,
  estimated_cost TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_backlink_site_id ON backlink_sources(site_id);
CREATE INDEX IF NOT EXISTS idx_backlink_status ON backlink_sources(status);

CREATE TABLE IF NOT EXISTS meo_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  business_name TEXT,
  google_maps_url TEXT,
  gbp_place_id TEXT,
  yahoo_loco_url TEXT,
  ekiten_url TEXT,
  completion_score INTEGER DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  average_rating NUMERIC(3, 1),
  checklist JSONB DEFAULT '{}'::jsonb,
  directory_registrations JSONB DEFAULT '{}'::jsonb,
  last_audited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_meo_site_id ON meo_profiles(site_id);

CREATE TABLE IF NOT EXISTS wordpress_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  wp_url TEXT NOT NULL,
  wp_username TEXT NOT NULL,
  wp_app_password_encrypted TEXT NOT NULL,
  detected_seo_plugin TEXT CHECK (detected_seo_plugin IN ('yoast', 'rankmath', 'aioseo', 'simple_pack')),
  is_active BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wp_site_id ON wordpress_integrations(site_id);

CREATE TABLE IF NOT EXISTS content_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_keyword TEXT,
  planned_date DATE,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'published', 'cancelled')),
  article_id UUID REFERENCES content_articles(id) ON DELETE SET NULL,
  seasonal_tag TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_calendar_site_date ON content_calendar(site_id, planned_date);

CREATE TABLE IF NOT EXISTS rank_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
  rank INTEGER,
  url TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rank_keyword_date ON rank_history(keyword_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  dr INTEGER,
  organic_traffic BIGINT,
  organic_keywords INTEGER,
  overlap_pct NUMERIC(5, 2),
  top_keywords JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_competitors_site_id ON competitors(site_id);
