/**
 * Regulatory references used by the indicative compliance checks (CLAUDE.md §5).
 * Every entry carries a citation and the date its values were checked against the
 * source document. `verifiedOn: null` means not yet checked; the UI and report must
 * show it as unverified. Wording is always "indicative", never "compliant".
 */
export interface RuleReference {
  id: string;
  title: string;
  citation: string;
  url?: string;
  verifiedOn: string | null; // ISO date
}

export interface ConcentrationLimit {
  ref: RuleReference;
  pollutant: 'PM10' | 'PM2.5';
  averaging: '24h' | 'annual';
  limitUgM3: number;
}

const NAAQS_2009: RuleReference = {
  id: 'naaqs-2009',
  title: 'National Ambient Air Quality Standards, 2009',
  citation: 'CPCB notification, Gazette of India, 18 November 2009 (NAAQS 2009)',
  verifiedOn: null,
};

const WHO_AQG_2021: RuleReference = {
  id: 'who-aqg-2021',
  title: 'WHO global air quality guidelines, 2021',
  citation: 'World Health Organization (2021), WHO global air quality guidelines',
  verifiedOn: null,
};

/** Values from HANDOVER A.2.2; checked against the source documents before first use (checkpoint 2). */
export const PM_LIMITS: readonly ConcentrationLimit[] = [
  { ref: NAAQS_2009, pollutant: 'PM10', averaging: '24h', limitUgM3: 100 },
  { ref: NAAQS_2009, pollutant: 'PM10', averaging: 'annual', limitUgM3: 60 },
  { ref: NAAQS_2009, pollutant: 'PM2.5', averaging: '24h', limitUgM3: 60 },
  { ref: NAAQS_2009, pollutant: 'PM2.5', averaging: 'annual', limitUgM3: 40 },
  { ref: WHO_AQG_2021, pollutant: 'PM10', averaging: '24h', limitUgM3: 45 },
  { ref: WHO_AQG_2021, pollutant: 'PM10', averaging: 'annual', limitUgM3: 15 },
  { ref: WHO_AQG_2021, pollutant: 'PM2.5', averaging: '24h', limitUgM3: 15 },
  { ref: WHO_AQG_2021, pollutant: 'PM2.5', averaging: 'annual', limitUgM3: 5 },
];
