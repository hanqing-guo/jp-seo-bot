// calculateJapaneseReadability のユニットテスト。
// 同期関数なので kuromoji の async init を待たずに即時テスト可能。
import { describe, it, expect } from 'vitest';
import { calculateJapaneseReadability } from './japaneseNlp';

describe('calculateJapaneseReadability', () => {
  it('空文字 → score 0 / sentenceCount 0', () => {
    const r = calculateJapaneseReadability('');
    expect(r.score).toBe(0);
    expect(r.sentenceCount).toBe(0);
  });

  it('空白のみ → score 0', () => {
    const r = calculateJapaneseReadability('   ');
    expect(r.score).toBe(0);
  });

  it('1 文 (中程度) で正しく分解', () => {
    const r = calculateJapaneseReadability('日本の補助金制度は中小企業の成長を支援する重要な施策である。');
    expect(r.sentenceCount).toBe(1);
    expect(r.averageSentenceLength).toBeGreaterThan(0);
    expect(r.kanjiRate).toBeGreaterThan(0);
  });

  it('複数文 (。 / ！ / ？ で分割)', () => {
    const r = calculateJapaneseReadability('補助金とは何か。それは支援制度である！どう申請するのか？');
    expect(r.sentenceCount).toBe(3);
  });

  it('長文で平均文長が反映される', () => {
    const longText = '日本の補助金制度はとても複雑で多くの中小企業経営者が申請の難しさに直面している現状である。';
    const r = calculateJapaneseReadability(longText);
    expect(r.averageSentenceLength).toBeGreaterThan(30);
  });

  it('漢字混じりで kanjiRate > 0', () => {
    const r = calculateJapaneseReadability('日本の補助金制度は中小企業の成長を支援する重要な施策である。');
    expect(r.kanjiRate).toBeGreaterThan(0);
  });

  it('score は 0-100 の範囲に収まる', () => {
    const r = calculateJapaneseReadability('日本の補助金は中小企業の成長を促進する。');
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it('改行で文を分けられる', () => {
    const r = calculateJapaneseReadability('文章 A\n文章 B\n文章 C');
    expect(r.sentenceCount).toBe(3);
  });
});
