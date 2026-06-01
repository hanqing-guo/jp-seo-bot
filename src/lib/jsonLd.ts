// 記事から構造化データ(JSON-LD)を生成する。
// 公開先(CMS / 自社ページ)の <head> に貼ると、Google のリッチリザルト
// (Article / FAQ)+ AI 検索(ChatGPT / Perplexity 等)の引用に効く。
// 当アプリは記事を公開しない(下書きをコピーする運用)ため、ここでは
// 「貼り付け用の JSON-LD 文字列」を生成して提供する。

import type { GeneratedArticle } from '../store/types'

/** Article + FAQPage の JSON-LD を整形済み文字列で返す。 */
export function buildArticleJsonLd(article: GeneratedArticle): string {
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'Article',
      headline: article.title,
      ...(article.metaDescription ? { description: article.metaDescription } : {}),
      datePublished: article.createdAt,
      dateModified: article.createdAt,
      author: { '@type': 'Organization', name: 'JP SEO Bot' },
      ...(article.relatedKeywords && article.relatedKeywords.length > 0
        ? { keywords: article.relatedKeywords.join(', ') }
        : {}),
    },
  ]

  if (article.faq && article.faq.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: article.faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    })
  }

  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2)
}
