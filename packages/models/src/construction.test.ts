import { describe, expect, it } from 'vitest';
import { phaseForMonth, totalMonths } from './construction';

describe('construction schedule', () => {
  it('totals 24 months by default', () => {
    expect(totalMonths()).toBe(24);
  });

  it('maps months to phases at the boundaries', () => {
    expect(phaseForMonth(1).phase.id).toBe('excavation');
    expect(phaseForMonth(3)).toMatchObject({ phase: { id: 'excavation' }, monthInPhase: 3 });
    expect(phaseForMonth(4)).toMatchObject({ phase: { id: 'structure' }, monthInPhase: 1 });
    expect(phaseForMonth(15)).toMatchObject({ phase: { id: 'structure' }, monthInPhase: 12 });
    expect(phaseForMonth(16)).toMatchObject({ phase: { id: 'finishing' }, monthInPhase: 1 });
    expect(phaseForMonth(24)).toMatchObject({ phase: { id: 'finishing' }, monthInPhase: 9 });
  });

  it('clamps out-of-range months', () => {
    expect(phaseForMonth(0).phase.id).toBe('excavation');
    expect(phaseForMonth(99)).toMatchObject({ phase: { id: 'finishing' }, monthInPhase: 9 });
  });
});
