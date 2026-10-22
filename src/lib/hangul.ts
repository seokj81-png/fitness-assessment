// 한글 초성 검색 — "ㅈㅂㅈ" → 정범진, "정ㅂㅈ" → 정범진, "정버" → 정범진(입력 중), "석종" → 오석종
// 회원 목록 검색창(ClientDirectory)에서 이름·트레이너 비교에 쓴다.

const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const CHO_SET = new Set(CHO);

// 자음만 연달아 치면 입력기가 겹받침 한 글자로 합치기도 한다(ㅂ+ㅅ → ㅄ). 풀어서 비교.
const COMPOUND: Record<string, string> = {
  'ㄳ': 'ㄱㅅ', 'ㄵ': 'ㄴㅈ', 'ㄶ': 'ㄴㅎ', 'ㄺ': 'ㄹㄱ', 'ㄻ': 'ㄹㅁ', 'ㄼ': 'ㄹㅂ',
  'ㄽ': 'ㄹㅅ', 'ㄾ': 'ㄹㅌ', 'ㄿ': 'ㄹㅍ', 'ㅀ': 'ㄹㅎ', 'ㅄ': 'ㅂㅅ',
};

const S_BASE = 0xac00;
const S_END = 0xd7a3;

function syllable(ch: string): { cho: number; jung: number; jong: number } | null {
  const code = ch.charCodeAt(0);
  if (code < S_BASE || code > S_END) return null;
  const s = code - S_BASE;
  return { cho: Math.floor(s / 588), jung: Math.floor((s % 588) / 28), jong: s % 28 };
}

/** 완성형 한글 한 글자의 초성(ㄱ~ㅎ). 한글이 아니면 null. */
export function choseong(ch: string): string | null {
  const s = syllable(ch);
  return s ? CHO[s.cho] : null;
}

/** 검색어 정리: 앞뒤 공백 제거, 영문 소문자, 겹받침 풀기 */
export function normalizeQuery(q: string): string {
  return q.trim().toLowerCase().replace(/[ㄳㄵㄶㄺㄻㄼㄽㄾㄿㅀㅄ]/g, (c) => COMPOUND[c]);
}

// 검색어 글자 하나가 대상 글자 하나와 맞는지
// - 같은 글자 → 맞음
// - 검색어가 자음(ㄱ~ㅎ) → 대상 글자의 초성과 비교
// - 검색어의 마지막 글자가 받침 없는 글자(입력 중) → 대상 글자의 초성+중성만 비교 ("정버" ↔ "정범")
function matchChar(qc: string, tc: string, isLast: boolean): boolean {
  if (qc === tc) return true;
  if (CHO_SET.has(qc)) return choseong(tc) === qc;
  if (isLast) {
    const qs = syllable(qc);
    const ts = syllable(tc);
    if (qs && ts && qs.jong === 0) return qs.cho === ts.cho && qs.jung === ts.jung;
  }
  return false;
}

/** target 안에 query가 초성 포함 방식으로 들어 있는지. 빈 검색어는 항상 true. */
export function hangulIncludes(target: string, query: string): boolean {
  const n = normalizeQuery(query);
  if (!n) return true;
  const t = target.toLowerCase();
  for (let i = 0; i + n.length <= t.length; i++) {
    let ok = true;
    for (let j = 0; j < n.length; j++) {
      if (!matchChar(n[j], t[i + j], j === n.length - 1)) { ok = false; break; }
    }
    if (ok) return true;
  }
  return false;
}
