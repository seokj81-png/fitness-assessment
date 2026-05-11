import type { AssessmentInput } from './types';

type DbAssessment = {
  id: string;
  clientId: string;
  date: Date;
  assessor: string | null;
  parq: string | null;
  postureFlags: string | null;
  fms: string | null;
  ohsaFlags: string | null;
  rom: string | null;
  [k: string]: unknown;
};

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Converts a Prisma Assessment row (with JSON-string columns) into the
 * AssessmentInput shape the AssessmentForm component expects.
 */
export function parseAssessment(
  a: DbAssessment
): AssessmentInput & { id: string; date: string } {
  const { parq, postureFlags, fms, fmsComments, ohsaFlags, rom, date, ...rest } = a as DbAssessment & { fmsComments: string | null };
  return {
    ...(rest as unknown as AssessmentInput),
    id: a.id,
    clientId: a.clientId,
    date: date instanceof Date ? date.toISOString() : String(date),
    parq: safeParse<boolean[]>(parq, []),
    postureFlags: safeParse<string[]>(postureFlags, []),
    fms: safeParse<Record<string, number>>(fms, {}),
    fmsComments: safeParse<Record<string, string>>(fmsComments, {}),
    ohsaFlags: safeParse<string[]>(ohsaFlags, []),
    rom: safeParse<Record<string, number>>(rom, {}),
  };
}
