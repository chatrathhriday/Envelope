import { describe, expect, it } from 'vitest';
import {
  ap42DropKgPerMg,
  ap42UnpavedGPerVkt,
  briggsUrban,
  fecanResidualMoisture,
  plume,
  stabilityClass,
  unitConcentration,
} from './dust';

describe('dust reference values (TEST_PLAN, hand-checked)', () => {
  it('Gaussian plume, Briggs urban D, Q 1 g/s, u 1 m/s, x 100 m, ground source and receptor on centreline', () => {
    const { sy, sz } = briggsUrban('D', 100);
    // σy = 0.16·100·1.04^−0.5 = 15.69 m; σz = 0.14·100·1.03^−0.5 = 13.79 m
    expect(sy).toBeCloseTo(15.69, 2);
    expect(sz).toBeCloseTo(13.79, 2);
    // C = Q/(π u σy σz) = 1/(π·15.69·13.79) g/m³ = 1,471 µg/m³
    expect(plume(1, 1, sy, sz, 0, 0, 0, 1e9) * 1e6).toBeCloseTo(1471, -1);
  });

  it('unitConcentration reproduces the plume for one source 100 m upwind (wind from the west)', () => {
    const src = [{ e: 0, n: 0, share: 1, sy0: 0, sz0: 0, H: 0 }];
    expect(unitConcentration(src, 100, 0, 0, 270, 1, 'D', 1e9)).toBeCloseTo(1471, -1);
    expect(unitConcentration(src, -100, 0, 0, 270, 1, 'D', 1e9)).toBe(0); // upwind receptor
  });

  it('AP-42 13.2.4: U 3 m/s, M 2% → 0.35 × 0.0016 × (3/2.2)^1.3 = 8.38e-4 kg/Mg', () => {
    expect(ap42DropKgPerMg(0.35, 3, 2)).toBeCloseTo(8.38e-4, 6);
  });

  it('AP-42 13.2.2: s 8.5%, W 20 t → 1.5 × (8.5/12)^0.9 × (20/3)^0.45 lb/VMT × 281.9', () => {
    // (0.70833)^0.9 = 0.73316; (6.6667)^0.45 = 2.34831; × 1.5 = 2.5825 lb/VMT; × 281.9 = 728.0 g/VKT
    expect(ap42UnpavedGPerVkt('PM10', 8.5, 20)).toBeCloseTo(728.0, 0);
  });

  it('Fécan residual moisture, clay 20% → 0.0014·400 + 0.17·20 = 3.96%', () => {
    expect(fecanResidualMoisture(20)).toBeCloseTo(3.96, 9);
  });

  it('Pasquill–Turner table cases', () => {
    expect(stabilityClass(1.5, 700, 10)).toBe('A');
    expect(stabilityClass(2.5, 0, 20)).toBe('F');
    expect(stabilityClass(4, 0, 60)).toBe('D');
    expect(stabilityClass(7, 400, 20)).toBe('D');
    expect(stabilityClass(3, 400, 95)).toBe('D');
  });
});
