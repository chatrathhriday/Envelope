import type { ConstructionPhase, ConstructionPhaseId } from './construction';
import { DEFAULT_SCHEDULE, phaseForMonth } from './construction';
import type { EN, LonLat, Orientation } from './geometry';
import { centroid, facadeEdges, openRing, orientationOf, signedArea, toLocalEN } from './geometry';

/** Shape of fixtures/demo/building.json. Geometry for all maths comes from this spec (CLAUDE.md §3). */
export interface BuildingSpec {
  name: string;
  use: 'office' | 'residential' | 'retail' | 'mixed';
  structure: 'rcc-frame';
  stage: 'pre-construction';
  site: {
    label: string;
    lat: number;
    lon: number;
    timezone: string;
    /** Plot boundary = footprint buffered by this distance (m); clipped out of the 3D tiles. */
    plotBufferM: number;
    /**
     * Ground height (WGS84 ellipsoidal m) at the plot, sampled from Google 3D tiles and
     * committed with the demo snapshot so the building can be placed before tiles load.
     * The viewer re-samples and corrects it live.
     */
    groundEllipsoidalM?: number;
  };
  /** Footprint ring, [lon, lat] pairs, counter-clockwise. */
  footprint: [number, number][];
  floors: number;
  floorToFloorM: number;
  /** Window-to-wall ratio by facade orientation, 0–1. */
  wwr: Record<Orientation, number>;
  roofType: 'flat';
}

export interface FacadeTakeoff {
  index: number;
  orientation: Orientation;
  normalAzimuthDeg: number;
  lengthM: number;
  areaM2: number;
  windowAreaM2: number;
  opaqueAreaM2: number;
}

export interface BuildingTakeoff {
  origin: LonLat;
  footprintEN: EN[];
  footprintCentroidEN: EN;
  footprintAreaM2: number;
  perimeterM: number;
  heightM: number;
  gfaM2: number;
  roofAreaM2: number;
  volumeM3: number;
  facades: FacadeTakeoff[];
  facadeAreaM2: number;
  windowAreaM2: number;
}

export function footprintLonLat(spec: BuildingSpec): LonLat[] {
  return openRing(spec.footprint.map(([lon, lat]) => ({ lon, lat })));
}

/** Geometry takeoff (MODELS.md A.1): areas per facade, GFA, roof, volume. */
export function takeoff(spec: BuildingSpec): BuildingTakeoff {
  const origin: LonLat = { lon: spec.site.lon, lat: spec.site.lat };
  const footprintEN = footprintLonLat(spec).map((p) => toLocalEN(p, origin));
  const footprintAreaM2 = Math.abs(signedArea(footprintEN));
  const heightM = spec.floors * spec.floorToFloorM;
  const facades = facadeEdges(footprintEN).map((edge): FacadeTakeoff => {
    const orientation = orientationOf(edge.normalAzimuthDeg);
    const areaM2 = edge.lengthM * heightM;
    const windowAreaM2 = areaM2 * spec.wwr[orientation];
    return {
      index: edge.index,
      orientation,
      normalAzimuthDeg: edge.normalAzimuthDeg,
      lengthM: edge.lengthM,
      areaM2,
      windowAreaM2,
      opaqueAreaM2: areaM2 - windowAreaM2,
    };
  });
  return {
    origin,
    footprintEN,
    footprintCentroidEN: centroid(footprintEN),
    footprintAreaM2,
    perimeterM: facades.reduce((s, f) => s + f.lengthM, 0),
    heightM,
    gfaM2: footprintAreaM2 * spec.floors,
    roofAreaM2: footprintAreaM2,
    volumeM3: footprintAreaM2 * heightM,
    facades,
    facadeAreaM2: facades.reduce((s, f) => s + f.areaM2, 0),
    windowAreaM2: facades.reduce((s, f) => s + f.windowAreaM2, 0),
  };
}

export interface BuildingState {
  phase: ConstructionPhaseId;
  phaseLabel: string;
  /** 0–1 share of the excavation dug (1 from the structure phase on). */
  excavationProgress: number;
  /** Floors with the frame complete. */
  floorsBuilt: number;
  /** 0–1 share of the envelope (glazing, cladding) installed. */
  envelopeProgress: number;
}

/**
 * What stands on site at the end of a construction month (MODELS.md A.0):
 * excavation progresses linearly; floors rise linearly through the structure phase,
 * floors built = ceil(n_floors × month-in-structure / structure months); the envelope is
 * installed linearly through finishing.
 */
export function buildingStateForMonth(
  month: number,
  floors: number,
  schedule: readonly ConstructionPhase[] = DEFAULT_SCHEDULE,
): BuildingState {
  const { phase, monthInPhase } = phaseForMonth(month, schedule);
  const progress = monthInPhase / phase.months;
  if (phase.id === 'excavation') {
    return {
      phase: phase.id,
      phaseLabel: phase.label,
      excavationProgress: progress,
      floorsBuilt: 0,
      envelopeProgress: 0,
    };
  }
  if (phase.id === 'structure') {
    return {
      phase: phase.id,
      phaseLabel: phase.label,
      excavationProgress: 1,
      floorsBuilt: Math.min(floors, Math.ceil(floors * progress)),
      envelopeProgress: 0,
    };
  }
  return {
    phase: phase.id,
    phaseLabel: phase.label,
    excavationProgress: 1,
    floorsBuilt: floors,
    envelopeProgress: progress,
  };
}
