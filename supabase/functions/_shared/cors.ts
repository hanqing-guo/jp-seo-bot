// 共有 CORS ヘッダー
// Phase 1: 開発用に '*' を許可。本番は env 経由でドメインを絞る。

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
} as const
