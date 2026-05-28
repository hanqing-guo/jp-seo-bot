// 日本語表記揺れ生成のユニットテスト。
// hiragana / katakana / romaji 変換 + variant 生成の正しさを保証。
import { describe, it, expect } from 'vitest';
import {
  toHiragana,
  toKatakana,
  toRomaji,
  generateVariants,
} from './japaneseVariants';

describe('toHiragana', () => {
  it('カタカナをひらがなに変換', () => {
    expect(toHiragana('カタカナ')).toBe('かたかな');
  });
  it('既にひらがなのものはそのまま', () => {
    expect(toHiragana('ひらがな')).toBe('ひらがな');
  });
  it('混在テキストでもカタカナ部分のみ変換', () => {
    expect(toHiragana('東京タワー')).toBe('東京たわー');
  });
  it('空文字は空文字を返す', () => {
    expect(toHiragana('')).toBe('');
  });
});

describe('toKatakana', () => {
  it('ひらがなをカタカナに変換', () => {
    expect(toKatakana('ひらがな')).toBe('ヒラガナ');
  });
  it('既にカタカナのものはそのまま', () => {
    expect(toKatakana('カタカナ')).toBe('カタカナ');
  });
  it('混在テキストでもひらがな部分のみ変換', () => {
    expect(toKatakana('東京たわー')).toBe('東京タワー');
  });
});

describe('toRomaji', () => {
  it('ひらがなをローマ字に変換', () => {
    const r = toRomaji('かたかな');
    expect(typeof r).toBe('string');
    expect(r.length).toBeGreaterThan(0);
    expect(/[a-zA-Z]/.test(r)).toBe(true);
  });
  it('空文字は空文字を返す', () => {
    expect(toRomaji('')).toBe('');
  });
});

describe('generateVariants', () => {
  it('カタカナ語から hiragana / katakana / romaji の variant を生成', () => {
    const v = generateVariants('コンピュータ');
    expect(v).toHaveProperty('hiragana');
    expect(v).toHaveProperty('katakana');
    expect(v).toHaveProperty('romaji');
    expect(v.hiragana).toContain('こ');
    expect(v.katakana).toContain('コ');
  });
  it('漢字混じり語でも variant が生成される', () => {
    const v = generateVariants('東京タワー');
    expect(typeof v.hiragana).toBe('string');
    expect(typeof v.katakana).toBe('string');
  });
  it('空文字でもクラッシュしない', () => {
    expect(() => generateVariants('')).not.toThrow();
  });
});
