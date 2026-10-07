/** Construction programme. Default from HANDOVER Appendix A.2.1 (24 months: 3 + 12 + 9). */
export type ConstructionPhaseId = 'excavation' | 'structure' | 'finishing';

export interface ConstructionPhase {
  id: ConstructionPhaseId;
  label: string;
  months: number;
}

export const DEFAULT_SCHEDULE: readonly ConstructionPhase[] = [
  { id: 'excavation', label: 'Excavation', months: 3 },
  { id: 'structure', label: 'Structure', months: 12 },
  { id: 'finishing', label: 'Finishing', months: 9 },
];

export function totalMonths(schedule: readonly ConstructionPhase[] = DEFAULT_SCHEDULE): number {
  return schedule.reduce((s, p) => s + p.months, 0);
}

/** Phase active in a 1-based construction month; clamps to the programme. */
export function phaseForMonth(
  month: number,
  schedule: readonly ConstructionPhase[] = DEFAULT_SCHEDULE,
): { phase: ConstructionPhase; monthInPhase: number } {
  const total = totalMonths(schedule);
  const m = Math.min(Math.max(1, Math.round(month)), total);
  let start = 0;
  for (const phase of schedule) {
    if (m <= start + phase.months) return { phase, monthInPhase: m - start };
    start += phase.months;
  }
  const last = schedule[schedule.length - 1]!;
  return { phase: last, monthInPhase: last.months };
}
