// ブログ自動投稿の「ネタ帳」。週3本の定時タスクがここから次の未公開トピックを1件取り出して記事化する。
// 公開済みかどうかは content/blog-articles.mjs の slug で判定する（このファイルは消化のたびに編集する必要はない）。
// 上から順に消化される。キューが尽きたら定時タスクは記事を作らず「ネタ切れ」を報告する。
// 新しいネタを足すときは、この配列の末尾にオブジェクトを追加するだけ。

export const queue = [
  { slug: 'canonical-tag-toha', title: 'canonicalタグとは?重複コンテンツを防ぐ設定方法', keyword: 'canonical タグ とは', angle: '重複・類似URLで評価が分散する問題と、正規URLを1つ指定する基本・よくある間違い' },
  { slug: 'structured-data-kakikata', title: '構造化データとは?SEO効果とJSON-LDの書き方', keyword: '構造化データ 書き方', angle: 'リッチリザルトや検索・生成AIに内容を正しく伝える意味と、JSON-LDの基本的な入れ方' },
  { slug: 'index-toroku-sarenai', title: 'Googleにインデックス登録されない原因と対処法', keyword: 'インデックス 登録されない', angle: '新規ページが収録されない代表的な原因と、Search Consoleでの確認・リクエスト手順' },
  { slug: 'search-console-tsukaikata', title: 'Google Search Consoleの使い方｜初心者向けガイド', keyword: 'サーチコンソール 使い方', angle: '登録・所有権確認から、検索パフォーマンス・URL検査・サイトマップ送信までの基本' },
  { slug: 'sitemap-tsukurikata', title: 'sitemap.xmlの作り方とSearch Consoleへの送信方法', keyword: 'サイトマップ 作り方', angle: 'XMLサイトマップの役割と、作成・設置・GSCへの送信までの手順' },
  { slug: 'robots-txt-kakikata', title: 'robots.txtとは?書き方とSEOでの注意点', keyword: 'robots.txt 書き方', angle: 'クロール制御の基本と、noindexとの違い・やりがちな事故（全ブロック等）' },
  { slug: 'longtail-keyword-toha', title: 'ロングテールキーワードとは?探し方と狙うべき理由', keyword: 'ロングテールキーワード とは', angle: '中小企業・新規サイトが勝てる理由と、具体的な探し方' },
  { slug: 'kensaku-volume-shirabe-kata', title: '検索ボリュームの調べ方｜無料ツールと選び方', keyword: '検索ボリューム 調べ方', angle: '無料で調べる方法と、ボリュームだけで判断しない考え方' },
  { slug: 'suggest-keyword-tori-kata', title: 'サジェストキーワードの取得方法と記事ネタへの活かし方', keyword: 'サジェストキーワード 取得', angle: 'サジェスト・関連キーワードの集め方と、検索意図の読み取りへの活用' },
  { slug: 'kyougou-bunseki-yarikata', title: 'SEOの競合分析のやり方｜上位サイトから学ぶ手順', keyword: 'SEO 競合分析 やり方', angle: '上位記事の構成・カバー範囲・不足を見抜き、勝てる切り口を見つける手順' },
  { slug: 'domain-power-toha', title: 'ドメインパワーとは?確認方法と地道に上げる方法', keyword: 'ドメインパワー とは', angle: '指標の意味と、新規サイトがコツコツ信頼を積む現実的な方法' },
  { slug: 'hi-link-fuyashikata', title: '被リンクの増やし方｜健全に獲得する現実的な方法', keyword: '被リンク 増やし方', angle: '自然な被リンクの集め方と、買ってはいけない理由（ペナルティ）' },
  { slug: 'core-web-vitals-toha', title: 'コアウェブバイタルとは?SEOへの影響と改善のポイント', keyword: 'コアウェブバイタル とは', angle: 'LCP/INP/CLSの意味と、表示速度・体験がSEOに与える影響' },
  { slug: 'page-hyouji-sokudo-kaizen', title: 'ページ表示速度の改善方法｜SEOと離脱率への影響', keyword: 'ページ表示速度 改善', angle: '画像・コード・サーバー面の改善ポイントと、計測ツール' },
  { slug: 'mobile-friendly-toha', title: 'モバイルフレンドリーとは?スマホ対応が重要な理由', keyword: 'モバイルフレンドリー とは', angle: 'モバイルファーストインデックスと、スマホ最適化の確認・対応' },
  { slug: 'midashi-tag-tsukaikata', title: '見出しタグ（h1〜h3）の正しい使い方とSEO効果', keyword: '見出しタグ 使い方', angle: '見出しの階層構造と、読者・クローラー双方に効く付け方' },
  { slug: 'alt-zokusei-kakikata', title: 'alt属性の書き方｜画像SEOで意識すべきこと', keyword: 'alt属性 書き方', angle: '代替テキストの目的（アクセシビリティと画像検索）と書き方のコツ' },
  { slug: 'pankuzu-list-seo', title: 'パンくずリストとは?SEO効果と設置のポイント', keyword: 'パンくずリスト SEO', angle: '階層を伝える役割と、構造化データ（BreadcrumbList）との関係' },
  { slug: 'kyouki-go-toha', title: '共起語とは?調べ方とSEO記事での自然な使い方', keyword: '共起語 とは', angle: '関連語を自然に盛り込み、網羅性と検索意図への対応を高める考え方' },
  { slug: 'topic-cluster-toha', title: 'トピッククラスターとは?ピラーページを使ったSEO設計', keyword: 'トピッククラスター とは', angle: 'ピラーとクラスター記事を内部リンクでつなぎ、テーマの専門性を示す設計' },
  { slug: 'zero-click-kensaku', title: 'ゼロクリック検索とは?SEOへの影響と今すべき対策', keyword: 'ゼロクリック検索 とは', angle: '検索結果内で完結する流れと、それでも選ばれるための対策' },
  { slug: 'ai-overview-taisaku', title: 'AI Overview（AIによる概要）とは?引用される対策', keyword: 'AI Overview 対策', angle: '生成AIの要約に表示・引用されるためのコンテンツ設計（GEOの入口）' },
  { slug: 'geo-toha', title: 'GEOとは?生成AI検索に引用されるための最適化', keyword: 'GEO とは', angle: 'ChatGPT・Perplexity等に引用される最適化の考え方と、SEOとの違い・共通点' },
  { slug: 'chatgpt-kensaku-taisaku', title: 'ChatGPT検索に自社サイトを引用させる方法', keyword: 'ChatGPT 検索 対策', angle: '明確な答え・構造・一次情報で、生成AIに参照されやすくする具体策' },
  { slug: 'llms-txt-toha', title: 'llms.txtとは?生成AI向けに用意する意味と書き方', keyword: 'llms.txt とは', angle: 'AIクローラー向けの案内ファイルの役割と、書き方・設置の基本' },
  { slug: 'local-seo-toha', title: 'ローカルSEOとは?地域ビジネスが上位表示する方法', keyword: 'ローカルSEO とは', angle: '地域名と業種で選ばれる仕組みと、中小・店舗がまずやるべきこと' },
  { slug: 'google-business-profile-saitekika', title: 'Googleビジネスプロフィールの最適化｜ローカルSEOの基本', keyword: 'Googleビジネスプロフィール 最適化', angle: '登録情報の充実・写真・口コミ対応など、地図検索で効く基本施策' },
  { slug: 'seo-monji-suu', title: 'SEOに最適な文字数は?文字数より大切なこと', keyword: 'SEO 文字数', angle: '文字数に正解はないという結論と、検索意図への充足を優先する考え方' },
  { slug: 'ichiji-jouhou-toha', title: '一次情報とは?SEOとE-E-A-Tで評価される理由', keyword: '一次情報 とは', angle: '自社の体験・データなど一次情報が、薄い量産記事との差になる理由' },
  { slug: 'persona-sekkei-content', title: 'コンテンツSEOのペルソナ設計｜読者像の決め方', keyword: 'ペルソナ設計 コンテンツ', angle: '誰に向けて書くかを定め、検索意図に深く刺さる記事にする手順' },
]
