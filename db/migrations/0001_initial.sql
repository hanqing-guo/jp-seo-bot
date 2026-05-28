-- JP SEO Bot v2 — 3 画面 MVP 用スキーマ
-- 単一 keywords テーブル + 順位履歴のみ。

CREATE TABLE IF NOT EXISTS keywords (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID,                   -- auth.users(id) (Phase 後で接続)
  keyword             TEXT NOT NULL,
  -- 難易度
  difficulty          INTEGER NOT NULL CHECK (difficulty BETWEEN 0 AND 100),
  tier                TEXT NOT NULL CHECK (tier IN ('easy', 'medium', 'hard')),
  target_months       INTEGER NOT NULL CHECK (target_months IN (3, 6, 10)),
  monthly_budget_yen  INTEGER NOT NULL,
  -- 進捗
  elapsed_months      INTEGER NOT NULL DEFAULT 0,
  current_task_label  TEXT,
  -- 月別タスク (JSONB)
  monthly_tasks       JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- 直近順位
  google_rank         INTEGER,
  yahoo_rank          INTEGER,
  -- 順位履歴 (JSONB, 直近 12 ヶ月)
  rank_history        JSONB NOT NULL DEFAULT '[]'::jsonb,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_keywords_user_id  ON keywords(user_id);
CREATE INDEX IF NOT EXISTS idx_keywords_tier     ON keywords(tier);
CREATE INDEX IF NOT EXISTS idx_keywords_created  ON keywords(created_at DESC);

-- 順位の日次スナップショット (Cron で毎日 1 行 INSERT)
CREATE TABLE IF NOT EXISTS daily_rank_snapshots (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id   UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
  recorded_at  DATE NOT NULL,
  google_rank  INTEGER,
  yahoo_rank   INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (keyword_id, recorded_at)
);

CREATE INDEX IF NOT EXISTS idx_daily_kw_date ON daily_rank_snapshots(keyword_id, recorded_at DESC);
