import { hashObject, totalMonths } from '@envelope/models';
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
}

export interface UiState {
  ribbonTab: RibbonTab;
  leftPanelOpen: boolean;
  inspectorOpen: boolean;
  dataSheetOpen: boolean;
  dataSheetTab: DataSheetTab;
  playing: boolean;
  helpOpen: boolean;
}

export interface AppState {
  projectName: string;
  scenario: Scenario;
  ui: UiState;
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
}

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
  scenario: { hour: 14, constructionMonth: 7 },
  ui: {
    ribbonTab: 'project',
    leftPanelOpen: true,
    inspectorOpen: true,
    dataSheetOpen: false,
    dataSheetTab: 'climate',
    playing: false,
    helpOpen: false,
  },
  setProjectName: (name) => {
    const trimmed = name.trim() || DEFAULT_PROJECT_NAME;
    saveProjectName(trimmed);
    set({ projectName: trimmed });
  },
  setHour: (hour) => set((s) => ({ scenario: { ...s.scenario, hour: wrapHour(hour) } })),
  stepHour: (delta) => set((s) => ({ scenario: { ...s.scenario, hour: wrapHour(s.scenario.hour + delta) } })),
  setConstructionMonth: (month) =>
    set((s) => ({
      scenario: { ...s.scenario, constructionMonth: Math.min(Math.max(1, Math.round(month)), totalMonths()) },
    })),
  setRibbonTab: (tab) => set((s) => ({ ui: { ...s.ui, ribbonTab: tab } })),
  toggleLeftPanel: () => set((s) => ({ ui: { ...s.ui, leftPanelOpen: !s.ui.leftPanelOpen } })),
  toggleInspector: () => set((s) => ({ ui: { ...s.ui, inspectorOpen: !s.ui.inspectorOpen } })),
  toggleDataSheet: () => set((s) => ({ ui: { ...s.ui, dataSheetOpen: !s.ui.dataSheetOpen } })),
  openDataSheetTab: (tab) => set((s) => ({ ui: { ...s.ui, dataSheetOpen: true, dataSheetTab: tab } })),
  togglePlaying: () => set((s) => ({ ui: { ...s.ui, playing: !s.ui.playing } })),
  setHelpOpen: (open) => set((s) => ({ ui: { ...s.ui, helpOpen: open } })),
}));

export const scenarioHash = (scenario: Scenario) => hashObject(scenario);
