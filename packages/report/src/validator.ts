/**
 * Number validator (CLAUDE.md §2): every number in generated prose must exist in the payload
 * at displayed precision (±0.5%). Sentences that fail are removed. Also bans wording the
 * report must never use.
 */
import type { NarrativeSection, ReportPayload } from './payload';

const NUM_RE = /[−-]?\d[\d,]*(?:\.\d+)?/g;
export const BANNED = [/\bcompliant\b/i, /\bguarantee[sd]?\b/i, /AI-generated/i, /\bas an AI\b/i];

export function parseNumbers(text: string): number[] {
  // Skip table/figure/section references such as "Table 3" or "Section 5".
  const cleaned = text.replace(/\b(Table|Figure|Section|Annex|item)\s+\d+(\.\d+)?/gi, '');
  return (cleaned.match(NUM_RE) ?? [])
    .map((s) => Number(s.replace(/,/g, '').replace('−', '-')))
    .filter((n) => Number.isFinite(n));
}

export function payloadNumbers(payload: ReportPayload): number[] {
  const out: number[] = [];
  const walk = (v: unknown) => {
    if (typeof v === 'string') out.push(...parseNumbers(v));
    else if (typeof v === 'number') out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(payload);
  return out;
}

function known(n: number, allowed: number[]): boolean {
  const a = Math.abs(n);
  return allowed.some((v) => {
    const b = Math.abs(v);
    if (a === b) return true;
    return b !== 0 && Math.abs(a - b) / b <= 0.005;
  });
}

export function splitSentences(p: string): string[] {
  // Split after . ! ? only when followed by whitespace and a capital, so decimals stay intact.
  return p
    .split(/(?<=[.!?])\s+(?=[A-Z(])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface ValidationResult {
  sections: NarrativeSection[];
  dropped: { section: string; sentence: string; reason: string }[];
}

export function validateNarrative(sections: NarrativeSection[], payload: ReportPayload): ValidationResult {
  const allowed = payloadNumbers(payload);
  const dropped: ValidationResult['dropped'] = [];
  const clean = sections.map((sec) => ({
    ...sec,
    paragraphs: sec.paragraphs
      .map((p) =>
        splitSentences(p)
          .filter((sentence) => {
            const banned = BANNED.find((re) => re.test(sentence));
            if (banned) {
              dropped.push({ section: sec.id, sentence, reason: `banned wording ${banned}` });
              return false;
            }
            const bad = parseNumbers(sentence).filter((n) => !known(n, allowed));
            if (bad.length) {
              dropped.push({
                section: sec.id,
                sentence,
                reason: `numbers not in payload: ${bad.join(', ')}`,
              });
              return false;
            }
            return true;
          })
          .join(' '),
      )
      .filter((p) => p.length > 0),
  }));
  return { sections: clean, dropped };
}
