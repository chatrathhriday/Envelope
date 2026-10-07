import type { SiteData } from '@envelope/data';
import type { Assumptions, Mitigations } from '@envelope/models';
import { PARAMS, programmeTotal } from '@envelope/models';
import type { ComplianceRow, ReportPayload, Table } from '@envelope/report';
import type { Results } from '../store/appStore';
import { demoBuilding } from '../viewer/site';
import { KPIS, delta, fmt } from './kpis';

const MIT_LABELS: Partial<Record<keyof Mitigations, string>> = {
  sprinkling: 'Water sprinkling of the work area and haul roads',
  pavedRoads: 'Paved or WMM haul roads',
  windBarriers: 'Wind barriers and site barricading',
  coverStockpiles: 'Covered stockpiles and materials',
  greenNetting: 'Green netting on scaffolding',
  antiSmogGun: 'Anti-smog gun (low evidence)',
  wheelWashing: 'Wheel washing at site exit',
  highWindStop: 'Stopping dusty work in high wind',
  shadeNets: 'Shade nets over work areas',
  retainTrees: 'Retained trees along the boundary',
  rescheduleWork: 'No heavy work 12:00–15:00',
  lowCarbonConcrete: 'Low-carbon concrete (GGBS / fly ash)',
  recycledRebar: 'Recycled-content rebar',
  gridPower: 'Grid connection instead of DG sets',
  solarHybridDg: 'Solar-hybrid site power',
  localSourcing: 'Local sourcing of materials',
  wasteReduction: 'Construction waste reduction plan',
};

const EMP: Partial<Record<keyof Mitigations, [string, string, string, string]>> = {
  sprinkling: ['All phases', 'Site contractor', 'Twice daily, logged', 'Haul-road PM10 at boundary'],
  pavedRoads: ['From mobilisation', 'Site contractor', 'Weekly inspection', 'Silt on haul road'],
  windBarriers: ['All phases', 'Site contractor', 'Weekly inspection', 'Barrier continuity'],
  coverStockpiles: ['All phases', 'Site contractor', 'Daily inspection', 'Share of stockpiles covered'],
  greenNetting: ['Structure, finishing', 'Site contractor', 'Weekly inspection', 'Netting coverage'],
  antiSmogGun: ['Excavation, structure', 'Site contractor', 'Daily log', 'Hours operated'],
  wheelWashing: ['All phases', 'Site contractor', 'Each vehicle exit', 'Trackout on public road'],
  highWindStop: ['All phases', 'Site manager', 'Hourly wind check', 'Hours stopped'],
  shadeNets: ['Hot season', 'EHS officer', 'Daily', 'UTCI at work areas'],
  retainTrees: ['All phases', 'Developer', 'Monthly', 'Trees retained'],
  rescheduleWork: ['Hot season', 'Site manager', 'Daily', 'Heavy work hours 12:00–15:00'],
  lowCarbonConcrete: ['Structure', 'Developer, RMC supplier', 'Per batch', 'GGBS / fly-ash content'],
  recycledRebar: ['Structure', 'Developer', 'Per delivery', 'Mill certificates'],
  gridPower: ['All phases', 'Developer', 'Monthly', 'kWh from grid vs DG'],
  solarHybridDg: ['All phases', 'Site contractor', 'Monthly', 'Solar kWh'],
  localSourcing: ['All phases', 'Procurement', 'Per order', 'Haul distance'],
  wasteReduction: ['All phases', 'Site contractor', 'Monthly', 'Wastage %'],
};

export function buildPayload(opts: {
  results: Results;
  mitigations: Mitigations;
  assumptions: Partial<Assumptions>;
  siteData: SiteData | null;
  projectName: string;
  title: string;
  company: string;
  preparedBy: string;
}): ReportPayload {
  const { results, mitigations } = opts;
  const b = results.baseline;
  const m = results.mitigated;
  const spec = demoBuilding;
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const enabled = (Object.keys(MIT_LABELS) as (keyof Mitigations)[]).filter((k) => mitigations[k] === true);

  const headline = KPIS.map((k) => {
    const bv = k.value(b);
    const mv = k.value(m);
    const d = delta(bv, mv, k.digits);
    return {
      label: k.label,
      unit: k.unit,
      baseline: fmt(bv, k.digits),
      mitigated: fmt(mv, k.digits),
      delta: d.abs,
      deltaPct: d.pct,
    };
  });

  const tables: Table[] = [];
  tables.push({
    id: 'kpi',
    title: 'Key indicators, baseline and mitigated',
    head: ['Indicator', 'Unit', 'Baseline', 'Mitigated', 'Δ', 'Δ%'],
    rows: headline.map((h) => [h.label, h.unit, h.baseline, h.mitigated, h.delta, h.deltaPct]),
    note: `Selected day for daily and hourly indicators: ${m.selected.dateLabel}.`,
  });
  tables.push({
    id: 'logistics',
    title: 'Material quantities and derived vehicle movements',
    head: [
      'Material',
      'Vehicle',
      'Phase',
      'Quantity',
      'Loads',
      'Trips (with returns)',
      'Trips per day',
      'On-site VKT per day',
    ],
    rows: m.flows.map((f) => [
      f.label,
      f.vehicle,
      f.phase,
      `${fmt(f.quantity, 0)} ${f.quantityUnit}`,
      fmt(f.loads, 0),
      fmt(f.trips, 0),
      fmt(f.tripsPerDay, 1),
      fmt(f.vktPerDay, 2),
    ]),
    note: `Programme ${programmeTotal(m.programme.effective)} months (${m.programme.source === 'auto' ? 'derived from the building' : 'user-set'}); haul route ${fmt(m.haulRouteM, 0)} m from gate to building.`,
  });
  const w = opts.siteData?.weather?.values;
  const mean = (xs: number[] | undefined) =>
    xs && xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : Number.NaN;
  const climate = [
    { label: 'Mean air temperature', value: `${fmt(mean(w?.temperature_2m), 1)} °C` },
    {
      label: 'Maximum air temperature',
      value: `${fmt(w ? Math.max(...w.temperature_2m) : Number.NaN, 1)} °C`,
    },
    { label: 'Mean wind speed at 10 m', value: `${fmt(mean(w?.wind_speed_10m), 1)} m/s` },
    {
      label: 'Total precipitation',
      value: `${fmt(w ? w.precipitation.reduce((s, v) => s + v, 0) : Number.NaN, 0)} mm`,
    },
    { label: 'Mean background PM10 (CAMS)', value: `${fmt(b.dust.background.periodMeanPm10, 0)} µg/m³` },
    { label: 'Calm hours in the programme', value: `${fmt(b.dust.calmHours, 0)} h` },
    { label: 'Dust susceptibility index (heuristic)', value: `${fmt(b.dust.dsi.value, 0)} of 100` },
  ];
  tables.push({
    id: 'climate',
    title: `Site climate and background air quality, reference year ${opts.siteData?.weatherYear ?? ''}`,
    head: ['Parameter', 'Value'],
    rows: climate.map((c) => [c.label, c.value]),
  });
  tables.push({
    id: 'receptors',
    title: 'PM10 at the site boundary and sensitive receptors (mitigated scenario)',
    head: [
      'Receptor',
      'Type',
      'Distance',
      'Selected day 24 h total',
      'Selected day site increment',
      'Max 24 h increment',
      'Site-caused NAAQS exceedance days',
    ],
    rows: m.dust.receptors.map((r) => [
      r.name,
      r.kind,
      `${fmt(r.distanceM, 0)} m`,
      `${fmt(r.day.pm10Total, 0)} µg/m³`,
      `${fmt(r.day.pm10Inc, 1)} µg/m³`,
      `${fmt(r.period.maxPm10Inc24h, 1)} µg/m³`,
      fmt(r.period.exceedDaysSiteCaused, 0),
    ]),
    note: 'NAAQS 2009 PM10 24 h limit 100 µg/m³; WHO 2021 guideline 45 µg/m³. Comparison is indicative.',
  });
  const g = (r: typeof b) => r.ghg;
  const t = (v: number) => fmt(v / 1000, 0);
  tables.push({
    id: 'ghg',
    title: 'Construction-stage greenhouse-gas emissions (tCO2e)',
    head: ['Module or scope', 'Baseline', 'Mitigated'],
    rows: [
      ['A1–A3 concrete', t(g(b).a1a3.concrete), t(g(m).a1a3.concrete)],
      ['A1–A3 reinforcement steel', t(g(b).a1a3.rebar), t(g(m).a1a3.rebar)],
      [
        'A1–A3 masonry, glass, aluminium',
        t(g(b).a1a3.masonry + g(b).a1a3.glass + g(b).a1a3.aluminium),
        t(g(m).a1a3.masonry + g(m).a1a3.glass + g(m).a1a3.aluminium),
      ],
      ['A4 transport to site', t(g(b).a4), t(g(m).a4)],
      ['A5 site diesel', t(g(b).a5Diesel), t(g(m).a5Diesel)],
      ['A5 grid electricity', t(g(b).a5Electricity), t(g(m).a5Electricity)],
      ['A5 waste', t(g(b).waste), t(g(m).waste)],
      ['Total', t(g(b).total), t(g(m).total)],
      [
        'Scope 1 / Scope 2 / Scope 3',
        `${t(g(b).scope1)} / ${t(g(b).scope2)} / ${t(g(b).scope3)}`,
        `${t(g(m).scope1)} / ${t(g(m).scope2)} / ${t(g(m).scope3)}`,
      ],
    ],
  });
  const prov = opts.siteData ? Object.values(opts.siteData.provenance) : [];
  tables.push({
    id: 'sources',
    title: 'Data sources and fetch times',
    head: ['Source', 'Status', 'Fetched (UTC)', 'Attribution'],
    rows: [
      ...prov.map((p) => [
        p.source,
        p.status,
        p.fetchedAt ? p.fetchedAt.slice(0, 16).replace('T', ' ') : '–',
        p.attribution,
      ]),
      ['Building geometry', 'Project file', '–', 'fixtures/demo/building.json'],
      ['Grid emission factor', 'Constant', '–', 'CEA CO2 Baseline Database v21.0, FY 2024-25'],
    ],
  });
  tables.push({
    id: 'emp',
    title: 'Environmental Management Plan for the mitigated scenario',
    head: ['Measure', 'Phase', 'Responsibility', 'Monitoring', 'KPI'],
    rows: enabled.map((k) => [
      MIT_LABELS[k]!,
      ...(EMP[k] ?? ['All phases', 'Site contractor', 'Monthly', '–']),
    ]),
  });
  const plotArea = (spec.footprint.length && m.quantities.gfaM2 / spec.floors) || 0;
  const builtUp = m.quantities.gfaM2 + plotArea * (opts.assumptions.basements ?? 1);
  const dustMeasures = [
    'windBarriers',
    'coverStockpiles',
    'sprinkling',
    'wheelWashing',
    'greenNetting',
  ] as const;
  const dustCount = dustMeasures.filter((k) => mitigations[k]).length;
  const worstExceed = Math.max(0, ...m.dust.receptors.map((r) => r.period.exceedDaysSiteCaused));
  const compliance: ComplianceRow[] = [
    {
      regulation: 'NAAQS 2009 (CPCB), PM10 24 h, 100 µg/m³',
      requirement: 'Ambient PM10 at receptors within the limit',
      status: `Background alone exceeds the limit on many days; site-caused exceedance days at the worst point: ${fmt(worstExceed, 0)} (mitigated)`,
      evidence: 'Table 4',
    },
    {
      regulation: 'MoEFCC / CPCB dust mitigation measures for construction',
      requirement: 'Barricading, covered stockpiles, sprinkling, wheel washing, green netting',
      status: `${dustCount} of ${dustMeasures.length} listed measures in the mitigated scenario`,
      evidence: 'Table 7',
    },
    {
      regulation: 'EIA Notification 2006, item 8(a)',
      requirement: 'Prior environmental clearance for built-up area at or above 20,000 m² [verify]',
      status: `Built-up area ${fmt(builtUp, 0)} m² including basement: indicatively below the threshold`,
      evidence: 'Table 2',
    },
    {
      regulation: 'BRSR (SEBI), Scope 1 and 2 disclosure',
      requirement: 'Report Scope 1 and Scope 2 emissions',
      status: `Scope 1 ${t(g(m).scope1)} tCO2e and Scope 2 ${t(g(m).scope2)} tCO2e for the construction programme`,
      evidence: 'Table 5',
    },
    {
      regulation: 'ECSBC 2024',
      requirement: 'Energy performance of the completed building',
      status: 'Not assessed: operational phase is outside the construction-phase scope',
      evidence: '–',
    },
  ];
  tables.push({
    id: 'compliance',
    title: 'Indicative compliance matrix',
    head: ['Regulation', 'Requirement', 'Project status (indicative)', 'Evidence'],
    rows: compliance.map((c) => [c.regulation, c.requirement, c.status, c.evidence]),
  });
  tables.push({
    id: 'assumptions',
    title: 'Assumptions register',
    head: ['Parameter', 'Value', 'Unit', 'Source', 'Status'],
    rows: PARAMS.map((p) => [
      p.label,
      String(opts.assumptions[p.id as keyof Assumptions] ?? p.value),
      p.unit,
      p.source,
      p.status === 'verify' ? 'unverified' : 'cited',
    ]),
  });

  return {
    meta: {
      title: opts.title,
      company: opts.company,
      preparedBy: opts.preparedBy,
      date: today,
      version: '1.0',
      scenario: 'both',
    },
    project: {
      name: opts.projectName,
      site: spec.site.label,
      coordinates: `${spec.site.lat.toFixed(4)}° N, ${spec.site.lon.toFixed(4)}° E`,
      use: spec.use,
      structure: 'RCC frame',
      floors: String(spec.floors),
      gfa: `${fmt(m.quantities.gfaM2, 0)} m²`,
      footprint: `${fmt(plotArea, 0)} m²`,
      height: `${fmt(spec.floors * spec.floorToFloorM, 1)} m`,
      programme: `${programmeTotal(m.programme.effective)} months (excavation ${m.programme.effective.excavation}, structure ${m.programme.effective.structure}, finishing ${m.programme.effective.finishing})`,
      programmeSource: m.programme.source === 'auto' ? 'derived from the building' : 'set by the user',
    },
    headline,
    mitigations: enabled.map((k) => MIT_LABELS[k]!),
    climate,
    tables,
    compliance,
    provenance: prov.map((p) => ({
      source: p.source,
      status: p.status,
      fetchedAt: p.fetchedAt ?? '–',
      attribution: p.attribution,
    })),
    assumptionsUnverified: PARAMS.filter((p) => p.status === 'verify').length,
    limitations: [
      'This is a screening-level (Tier 1–2) assessment. It is not a substitute for an Environmental Impact Assessment by a NABET-accredited consultant or an AERMOD-based dispersion study.',
      'Dispersion uses a steady-state Gaussian plume over flat terrain without building downwash; background PM10 is from the CAMS global model at about 45 km resolution and has not been validated against local stations.',
      'Heat results use a steady-state surface energy balance and a simplified mean radiant temperature; they indicate relative change rather than measured values.',
      'Default parameters marked unverified in Annex A should be confirmed against project data before submission.',
    ],
  };
}
