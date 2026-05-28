-- JP SEO Bot — 無料診断エンジン スキーマ
-- DIAGNOSIS_SPEC.md §2.2 原文
-- Phase 1: テーブル + index 作成のみ。レート制限・キャッシュは Phase 4 で。

-- ========================================
-- 診断セッション(認証不要で保存可能)
-- ========================================
CREATE TABLE IF NOT EXISTS diagnosis_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url         TEXT NOT NULL,
  domain      TEXT NOT NULL,

  -- カテゴリ別スコア (0-100)
  total_score      INTEGER CHECK (total_score      BETWEEN 0 AND 100),
  google_score     INTEGER CHECK (google_score     BETWEEN 0 AND 100),
  yahoo_score      INTEGER CHECK (yahoo_score      BETWEEN 0 AND 100),
  technical_score  INTEGER CHECK (technical_score  BETWEEN 0 AND 100),
  onpage_score     INTEGER CHECK (onpage_score     BETWEEN 0 AND 100),
  content_score    INTEGER CHECK (content_score    BETWEEN 0 AND 100),
  backlink_score   INTEGER CHECK (backlink_score   BETWEEN 0 AND 100),
  mobile_score     INTEGER CHECK (mobile_score     BETWEEN 0 AND 100),

  -- 問題カウント
  critical_count   INTEGER DEFAULT 0,
  warning_count    INTEGER DEFAULT 0,
  info_count       INTEGER DEFAULT 0,

  -- 詳細結果 JSON (各 module の raw output)
  google_results     JSONB DEFAULT '{}'::jsonb,
  yahoo_results      JSONB DEFAULT '{}'::jsonb,
  technical_results  JSONB DEFAULT '{}'::jsonb,
  onpage_results     JSONB DEFAULT '{}'::jsonb,
  backlink_results   JSONB DEFAULT '{}'::jsonb,

  -- AI サマリー
  ai_summary     TEXT,
  ai_quick_wins  JSONB DEFAULT '[]'::jsonb,

  -- メタデータ
  user_id      UUID,                       -- auth.users(id) を後から紐付け可
  ip_address   TEXT,
  user_agent   TEXT,
  status       TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_diagnosis_domain   ON diagnosis_sessions(domain);
CREATE INDEX IF NOT EXISTS idx_diagnosis_user_id  ON diagnosis_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_diagnosis_created  ON diagnosis_sessions(created_at DESC);

-- ========================================
-- 診断詳細アイテム (チェック項目ごとに 1 行)
-- ========================================
CREATE TABLE IF NOT EXISTS diagnosis_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES diagnosis_sessions(id) ON DELETE CASCADE,

  -- 分類
  engine      TEXT NOT NULL CHECK (engine IN ('google', 'yahoo', 'common')),
  category    TEXT NOT NULL,

  -- 評価
  check_id        TEXT NOT NULL,   -- 'missing_title', 'no_https' など
  level           TEXT NOT NULL CHECK (level IN ('critical', 'warning', 'info', 'passed')),
  title           TEXT NOT NULL,
  description     TEXT,
  fix_suggestion  TEXT,
  current_value   TEXT,
  ideal_value     TEXT,
  score_impact    INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_diag_items_session ON diagnosis_items(session_id);
CREATE INDEX IF NOT EXISTS idx_diag_items_level   ON diagnosis_items(level);
CREATE INDEX IF NOT EXISTS idx_diag_items_check   ON diagnosis_items(check_id);
