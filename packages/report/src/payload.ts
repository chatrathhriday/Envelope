/**
 * ReportPayload: everything the report states, as display strings, built deterministically
 * from model output (HANDOVER Appendix B). The LLM only writes prose around it.
 */
export interface Row {
  cells: string[];
}

export interface Table {
  id: string;
  title: string;
  head: string[];
  rows: string[][];
  note?: string;
}

export interface ComplianceRow {
  regulation: string;
  requirement: string;
  status: string;
  evidence: string;
}

export interface ReportPayload {
  meta: {
    title: string;
    company: string;
    preparedBy: string;
    date: string;
    version: string;
    scenario: 'baseline' | 'mitigated' | 'both';
  };
  project: {
    name: string;
    site: string;
    coordinates: string;
    use: string;
    structure: string;
    floors: string;
    gfa: string;
    footprint: string;
    height: string;
    programme: string;
    programmeSource: string;
  };
  headline: {
    label: string;
    unit: string;
    baseline: string;
    mitigated: string;
    delta: string;
    deltaPct: string;
  }[];
  mitigations: string[];
  climate: { label: string; value: string }[];
  tables: Table[];
  compliance: ComplianceRow[];
  provenance: { source: string; status: string; fetchedAt: string; attribution: string }[];
  assumptionsUnverified: number;
  limitations: string[];
}

export interface NarrativeSection {
  id: string;
  title: string;
  paragraphs: string[];
}

export const SECTION_IDS = [
  { id: 'executive', title: 'Executive summary' },
  { id: 'project', title: 'Project description' },
  { id: 'site', title: 'Site and baseline environment' },
  { id: 'method', title: 'Methodology and data sources' },
  { id: 'dust', title: 'Dust impact assessment' },
  { id: 'heat', title: 'Heat impact assessment' },
  { id: 'ghg', title: 'Greenhouse-gas assessment' },
  { id: 'emp', title: 'Mitigation measures and Environmental Management Plan' },
  { id: 'compliance', title: 'Indicative compliance matrix' },
  { id: 'monitoring', title: 'Monitoring plan' },
  { id: 'limitations', title: 'Limitations and uncertainty' },
] as const;
