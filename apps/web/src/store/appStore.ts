import type { SiteData } from '@envelope/data';
import type { Assumptions, Mitigations, ProgrammeMonths, ScenarioResult } from '@envelope/models';
import { NO_MITIGATIONS, hashObject, weatherYearFor } from '@envelope/models';
import { create } from 'zustand';

export type RibbonTab = 'project' | 'site' | 'analysis' | 'mitigation' | 'report';
export type DataSheetTab = 'climate' | 'dust' | 'heat' | 'ghg' | 'assumptions';

/**
 * The Scenario is the single input to the models (CLAUDE.md §3): it is hashed and the
 * hash keys cached results. It grows as modules arrive; UI-only state stays out of it.
 */
export interface Scenario {
  /** Local hour of day at the site, 0–23. */
  hour: number;
  /** 1-based month of the construction programme. */
  constructionMonth: number;
  /** Day of the calendar month shown (weather year). */
  dayOfMonth: number;
  /** Calendar year of hourly weather used as the typical year. */
  weatherYear: number;
}

/** Which basemap is showing. `google` = Photorealistic 3D Tiles; `ion-fallback` = World Terrain + OSM Buildings. */
export type BasemapKind = 'google' | 'ion-fallback' | 'osm' | 'none';

export interface BasemapStatus {
  state: 'loading' | 'ready';
  kind: BasemapKind | null;
  /** Shown in the viewport when the preferred basemap could not be used. */
  notice: string | null;
}

export interface CameraView {
  headingDeg: number;
  pitchDeg: number;
  /** Straight-line distance from the camera to the site centre (m). */
  rangeM: number;
  /** Ground metres per screen pixel at the site centre. */
  metresPerPixel: number;
}

export type SiteLayerId = 'basemap' | 'building' | 'shadows';
export type ImpactLayerId = 'dust' | 'ts' | 'utci' | 'ghg';
export type DustMetric = 'hour' | 'day';

export interface Results {
  baseline: ScenarioResult;
  mitigated: ScenarioResult;
}

export type PresetId = 'none' | 'cpcb' | 'best' | 'netzero';

export interface UiState {
  ribbonTab: RibbonTab;
  leftPanelOpen: boolean;
  inspectorOpen: boolean;
  dataSheetOpen: boolean;
  dataSheetTab: DataSheetTab;
  playing: boolean;
  helpOpen: boolean;
  reportOpen: boolean;
}

export interface AppState {
  projectName: string;
  scenario: Scenario;
  ui: UiState;
  layers: Record<SiteLayerId, boolean>;
  basemap: BasemapStatus;
  view: CameraView | null;
  cursor: { lat: number; lon: number } | null;
  /** True once the building has been placed on the ground. */
  buildingPlaced: boolean;
  /** Ground height used for placement (ellipsoidal m) and where it came from. */
  ground: { heightM: number; source: 'snapshot' | 'sampled' | 'ellipsoid' } | null;
  setProjectName: (name: string) => void;
  setHour: (hour: number) => void;
  stepHour: (delta: number) => void;
  setConstructionMonth: (month: number) => void;
  setRibbonTab: (tab: RibbonTab) => void;
  toggleLeftPanel: () => void;
  toggleInspector: () => void;
  toggleDataSheet: () => void;
  openDataSheetTab: (tab: DataSheetTab) => void;
  togglePlaying: () => void;
  setHelpOpen: (open: boolean) => void;
  setReportOpen: (open: boolean) => void;
  toggleLayer: (id: SiteLayerId) => void;
  setBasemap: (status: BasemapStatus) => void;
  setView: (view: CameraView) => void;
  setCursor: (cursor: { lat: number; lon: number } | null) => void;
  setBuildingPlaced: (placed: boolean) => void;
  setGround: (ground: AppState['ground']) => void;

  // Analysis
  siteData: SiteData | null;
  dataState: 'loading' | 'ready' | 'error';
  assumptions: Partial<Assumptions>;
  mitigations: Mitigations;
  preset: PresetId | 'custom';
  programmeOverride: ProgrammeMonths | null;
  results: Results | null;
  running: boolean;
  runMs: number | null;
  computeError: string | null;
  impactLayer: ImpactLayerId | null;
  dustMetric: DustMetric;
  layerOpacity: number;
  showScenario: 'baseline' | 'mitigated';
  setSiteData: (d: SiteData | null, state: AppState['dataState']) => void;
  setAssumption: (id: keyof Assumptions, value: number | null) => void;
  resetAssumptions: () => void;
  setMitigation: <K extends keyof Mitigations>(id: K, value: Mitigations[K]) => void;
  applyPreset: (preset: PresetId) => void;
  setProgrammeOverride: (p: ProgrammeMonths | null) => void;
  setResults: (r: Results | null, ms: number | null, error?: string | null) => void;
  setRunning: (running: boolean) => void;
  setImpactLayer: (id: ImpactLayerId | null) => void;
  setDustMetric: (m: DustMetric) => void;
  setLayerOpacity: (v: number) => void;
  toggleShowScenario: () => void;
  goToDay: (month: number, dayOfMonth: number) => void;
}

/** Mitigation presets (HANDOVER Appendix C, adapted to construction scope). */
export const PRESETS: Record<PresetId, Partial<Mitigations>> = {
  none: {},
  cpcb: {
    sprinkling: true,
    windBarriers: true,
    coverStockpiles: true,
    greenNetting: true,
    wheelWashing: true,
  },
  best: {
    sprinkling: true,
    pavedRoads: true,
    windBarriers: true,
    coverStockpiles: true,
    greenNetting: true,
    antiSmogGun: true,
    wheelWashing: true,
    highWindStop: true,
    shadeNets: true,
    rescheduleWork: true,
    gridPower: true,
    localSourcing: true,
  },
  netzero: {
    sprinkling: true,
    pavedRoads: true,
    windBarriers: true,
    coverStockpiles: true,
    greenNetting: true,
    antiSmogGun: true,
    wheelWashing: true,
    highWindStop: true,
    shadeNets: true,
    retainTrees: true,
    rescheduleWork: true,
    lowCarbonConcrete: true,
    lowCarbonConcretePct: 40,
    recycledRebar: true,
    gridPower: true,
    solarHybridDg: true,
    localSourcing: true,
    wasteReduction: true,
  },
};

const PROJECT_NAME_KEY = 'envelope.projectName';
export const DEFAULT_PROJECT_NAME = 'Gurugram office, construction phase';

function loadProjectName(): string {
  try {
    return window.localStorage.getItem(PROJECT_NAME_KEY) || DEFAULT_PROJECT_NAME;
  } catch {
    return DEFAULT_PROJECT_NAME;
  }
}

function saveProjectName(name: string): void {
  try {
    window.localStorage.setItem(PROJECT_NAME_KEY, name);
  } catch {
    // Storage unavailable (private mode): the name still applies for this session.
  }
}

const wrapHour = (h: number) => ((Math.round(h) % 24) + 24) % 24;

export const useAppStore = create<AppState>()((set) => ({
  projectName: loadProjectName(),
  scenario: { hour: 14, constructionMonth: 7, dayOfMonth: 15, weatherYear: weatherYearFor(new Date()) },
  ui: {
    ribbonTab: 'project',
    leftPanelOpen: true,
    inspectorOpen: true,
    dataSheetOpen: false,
    dataSheetTab: 'climate',
    playing: false,
    helpOpen: false,
    reportOpen: false,
  },
  layers: { basemap: true, building: true, shadows: true },
  basemap: { state: 'loading', kind: null, notice: null },
  view: null,
  cursor: null,
  buildingPlaced: false,
  ground: null,
  setProjectName: (name) => {
    const trimmed = name.trim() || DEFAULT_PROJECT_NAME;
    saveProjectName(trimmed);
    set({ projectName: trimmed });
  },
  setHour: (hour) => set((s) => ({ scenario: { ...s.scenario, hour: wrapHour(hour) } })),
  stepHour: (delta) => set((s) => ({ scenario: { ...s.scenario, hour: wrapHour(s.scenario.hour + delta) } })),
  setConstructionMonth: (month) =>
    set((s) => ({
      scenario: { ...s.scenario, constructionMonth: Math.max(1, Math.round(month)) },
    })),
  setRibbonTab: (tab) => set((s) => ({ ui: { ...s.ui, ribbonTab: tab } })),
  toggleLeftPanel: () => set((s) => ({ ui: { ...s.ui, leftPanelOpen: !s.ui.leftPanelOpen } })),
  toggleInspector: () => set((s) => ({ ui: { ...s.ui, inspectorOpen: !s.ui.inspectorOpen } })),
  toggleDataSheet: () => set((s) => ({ ui: { ...s.ui, dataSheetOpen: !s.ui.dataSheetOpen } })),
  openDataSheetTab: (tab) => set((s) => ({ ui: { ...s.ui, dataSheetOpen: true, dataSheetTab: tab } })),
  togglePlaying: () => set((s) => ({ ui: { ...s.ui, playing: !s.ui.playing } })),
  setHelpOpen: (open) => set((s) => ({ ui: { ...s.ui, helpOpen: open } })),
  setReportOpen: (open) => set((s) => ({ ui: { ...s.ui, reportOpen: open } })),
  toggleLayer: (id) => set((s) => ({ layers: { ...s.layers, [id]: !s.layers[id] } })),
  setBasemap: (basemap) => set({ basemap }),
  setView: (view) => set({ view }),
  setCursor: (cursor) => set({ cursor }),
  setBuildingPlaced: (buildingPlaced) => set({ buildingPlaced }),
  setGround: (ground) => set({ ground }),

  siteData: null,
  dataState: 'loading',
  assumptions: {},
  // Demo default: the mitigated scenario starts from the CPCB minimum dust measures.
  mitigations: { ...NO_MITIGATIONS, ...PRESETS.cpcb },
  preset: 'cpcb',
  programmeOverride: null,
  results: null,
  running: false,
  runMs: null,
  computeError: null,
  impactLayer: 'dust',
  dustMetric: 'day',
  layerOpacity: 0.75,
  showScenario: 'mitigated',
  setSiteData: (siteData, dataState) => set({ siteData, dataState }),
  setAssumption: (id, value) =>
    set((s) => {
      const next = { ...s.assumptions };
      if (value === null) delete next[id];
      else next[id] = value;
      return { assumptions: next };
    }),
  resetAssumptions: () => set({ assumptions: {} }),
  setMitigation: (id, value) =>
    set((s) => ({ mitigations: { ...s.mitigations, [id]: value }, preset: 'custom' })),
  applyPreset: (preset) => set({ mitigations: { ...NO_MITIGATIONS, ...PRESETS[preset] }, preset }),
  setProgrammeOverride: (programmeOverride) => set({ programmeOverride }),
  setResults: (results, runMs, computeError = null) => set({ results, runMs, computeError, running: false }),
  setRunning: (running) => set({ running }),
  setImpactLayer: (impactLayer) => set({ impactLayer }),
  setDustMetric: (dustMetric) => set({ dustMetric }),
  setLayerOpacity: (layerOpacity) => set({ layerOpacity }),
  toggleShowScenario: () =>
    set((s) => ({ showScenario: s.showScenario === 'baseline' ? 'mitigated' : 'baseline' })),
  goToDay: (constructionMonth, dayOfMonth) =>
    set((s) => ({ scenario: { ...s.scenario, constructionMonth, dayOfMonth } })),
}));

export const scenarioHash = (scenario: Scenario) => hashObject(scenario);
