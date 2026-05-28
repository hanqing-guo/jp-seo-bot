// JAPAN_SPEC §A.2 — 表記バリアント変換 (簡易版).
// spec の kuroshiro はパッケージサイズが大きいため、demo 用に
// カタカナ ⇔ ひらがな の文字マップ + ヘボン式ローマ字を最低限実装.

const KATA_TO_HIRA: Record<string, string> = (() => {
  const map: Record<string, string> = {}
  const KATA_START = 0x30a1
  const HIRA_START = 0x3041
  for (let i = 0; i <= 86; i++) {
    map[String.fromCharCode(KATA_START + i)] = String.fromCharCode(HIRA_START + i)
  }
  return map
})()

const HIRA_TO_KATA: Record<string, string> = (() => {
  const map: Record<string, string> = {}
  for (const [k, v] of Object.entries(KATA_TO_HIRA)) {
    map[v] = k
  }
  return map
})()

export function toHiragana(text: string): string {
  return text
    .split('')
    .map(c => KATA_TO_HIRA[c] ?? c)
    .join('')
}

export function toKatakana(text: string): string {
  return text
    .split('')
    .map(c => HIRA_TO_KATA[c] ?? c)
    .join('')
}

const HEPBURN: Record<string, string> = {
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o',
  か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so',
  た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no',
  は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu', よ: 'yo',
  ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro',
  わ: 'wa', を: 'wo', ん: 'n',
  が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
  ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
  だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do',
  ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
  ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po',
  きゃ: 'kya', きゅ: 'kyu', きょ: 'kyo',
  しゃ: 'sha', しゅ: 'shu', しょ: 'sho',
  ちゃ: 'cha', ちゅ: 'chu', ちょ: 'cho',
  にゃ: 'nya', にゅ: 'nyu', にょ: 'nyo',
  ひゃ: 'hya', ひゅ: 'hyu', ひょ: 'hyo',
  みゃ: 'mya', みゅ: 'myu', みょ: 'myo',
  りゃ: 'rya', りゅ: 'ryu', りょ: 'ryo',
  ぎゃ: 'gya', ぎゅ: 'gyu', ぎょ: 'gyo',
  じゃ: 'ja', じゅ: 'ju', じょ: 'jo',
  びゃ: 'bya', びゅ: 'byu', びょ: 'byo',
  ぴゃ: 'pya', ぴゅ: 'pyu', ぴょ: 'pyo',
  ー: '',
  '、': ', ',
  '。': '.',
}

export function toRomaji(text: string): string {
  const hira = toHiragana(text)
  let result = ''
  let i = 0
  while (i < hira.length) {
    const two = hira.slice(i, i + 2)
    const one = hira[i]
    if (HEPBURN[two] !== undefined) {
      result += HEPBURN[two]
      i += 2
    } else if (HEPBURN[one] !== undefined) {
      result += HEPBURN[one]
      i += 1
    } else if (one === 'っ' || one === 'ッ') {
      const next = hira[i + 1]
      const r = HEPBURN[next]
      if (r) result += r[0]
      i += 1
    } else {
      result += one
      i += 1
    }
  }
  return result
}

export interface JapaneseVariants {
  original: string
  hiragana: string
  katakana: string
  romaji: string
}

export function generateVariants(text: string): JapaneseVariants {
  return {
    original: text,
    hiragana: toHiragana(text),
    katakana: toKatakana(text),
    romaji: toRomaji(text),
  }
}
