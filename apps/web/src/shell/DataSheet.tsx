import { Tooltip, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { ChevronDown16Regular, ChevronUp16Regular } from '@fluentui/react-icons';
import type { Assumptions } from '@envelope/models';
import { PARAMS } from '@envelope/models';
import type { ReactNode } from 'react';
import { fmt } from '../analysis/kpis';
import type { DataSheetTab } from '../store/appStore';
import { useAppStore } from '../store/appStore';
import { shell } from '../theme/theme';
import { EmptyState } from './EmptyState';

const useStyles = makeStyles({
  root: {
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    borderTop: `1px solid ${shell.border}`,
  },
  body: { height: '220px', overflow: 'auto' },
  strip: {
    height: '26px',
    display: 'flex',
    alignItems: 'stretch',
    backgroundColor: shell.chrome,
    borderTop: `1px solid ${shell.border}`,
    paddingLeft: '8px',
  },
  tab: {
    fontFamily: 'inherit',
    fontSize: '12px',
    padding: '0 14px',
    border: 'none',
    borderRight: `1px solid ${shell.border}`,
    backgroundColor: 'transparent',
    color: shell.textMuted,
    cursor: 'pointer',
    ':hover': { backgroundColor: '#EBEBEB', color: '#242424' },
    ':focus-visible': { outline: `2px solid ${tokens.colorBrandStroke1}`, outlineOffset: '-2px' },
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    color: tokens.colorBrandForeground1,
    fontWeight: 600,
    boxShadow: `inset 0 -2px 0 ${tokens.colorBrandStroke1}`,
    ':hover': { backgroundColor: '#FFFFFF', color: tokens.colorBrandForeground1 },
  },
  spacer: { flexGrow: 1 },
  toggle: {
    width: '30px',
    border: 'none',
    backgroundColor: 'transparent',
    color: shell.textMuted,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ':hover': { backgroundColor: '#EBEBEB' },
  },
  table: {
    borderCollapse: 'collapse',
    fontSize: '12px',
    fontVariantNumeric: 'tabular-nums',
    minWidth: '100%',
  },
  th: {
    position: 'sticky',
    top: 0,
    backgroundColor: '#F3F3F3',
    textAlign: 'right',
    fontWeight: 600,
    padding: '3px 8px',
    borderBottom: `1px solid ${shell.border}`,
    borderRight: '1px solid #E6E6E6',
    whiteSpace: 'nowrap',
    fontSize: '11px',
    color: '#3B3B3B',
  },
  td: {
    textAlign: 'right',
    padding: '2px 8px',
    borderBottom: '1px solid #EEEEEE',
    borderRight: '1px solid #F2F2F2',
    whiteSpace: 'nowrap',
  },
  l: { textAlign: 'left' },
  sel: { backgroundColor: '#EEF7F1' },
  caption: { fontSize: '11px', color: shell.textMuted, padding: '6px 8px 4px' },
  two: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' },
});

function Grid({ head, rows, highlight }: { head: string[]; rows: ReactNode[][]; highlight?: number }) {
  const s = useStyles();
  return (
    <table className={s.table}>
      <thead>
        <tr>
          {head.map((h, i) => (
            <th key={h} className={mergeClasses(s.th, i === 0 && s.l)}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className={i === highlight ? s.sel : undefined}>
            {r.map((c, j) => (
              <td key={j} className={mergeClasses(s.td, j === 0 && s.l)}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const TABS: { id: DataSheetTab; label: string }[] = [
  { id: 'climate', label: 'Climate' },
  { id: 'dust', label: 'Dust' },
  { id: 'heat', label: 'Heat' },
  { id: 'ghg', label: 'GHG' },
  { id: 'assumptions', label: 'Assumptions' },
];

function Body({ tab }: { tab: DataSheetTab }) {
  const s = useStyles();
  const results = useAppStore((st) => st.results);
  const show = useAppStore((st) => st.showScenario);
  const siteData = useAppStore((st) => st.siteData);
  const scenario = useAppStore((st) => st.scenario);
  const overrides = useAppStore((st) => st.assumptions);
  if (tab === 'assumptions')
    return (
      <Grid
        head={['Parameter', 'Group', 'Value', 'Unit', 'Source', 'Status']}
        rows={PARAMS.map((p) => [
          p.label,
          p.group,
          String(overrides[p.id as keyof Assumptions] ?? p.value),
          p.unit,
          p.source,
          p.status === 'verify' ? 'unverified' : 'cited',
        ])}
      />
    );
  if (!results)
    return (
      <EmptyState
        title="No results yet"
        text="Tables appear once site data has loaded and the models have run."
      />
    );
  const r = results[show];
  if (tab === 'climate') {
    const w = siteData?.weather?.values;
    const aq = siteData?.airQuality?.values;
    if (!w)
      return <EmptyState title="No climate data" text="Weather data could not be loaded for the site." />;
    const day = r.selected.dayIndex;
    const rows = Array.from({ length: 24 }, (_, h) => {
      const i = Math.min(w.temperature_2m.length - 1, Math.max(0, day * 24 + h - 5));
      return [
        `${String(h).padStart(2, '0')}:00`,
        fmt(w.temperature_2m[i]!, 1),
        fmt(w.relative_humidity_2m[i]!, 0),
        fmt(w.wind_speed_10m[i]!, 1),
        fmt(w.wind_direction_10m[i]!, 0),
        fmt(w.shortwave_radiation[i]!, 0),
        fmt(w.cloud_cover[i]!, 0),
        fmt(w.precipitation[i]!, 1),
        fmt(w.boundary_layer_height[i]!, 0),
        aq ? fmt(aq.pm10![i]!, 0) : '–',
        aq ? fmt(aq.pm2_5![i]!, 0) : '–',
      ];
    });
    return (
      <>
        <div className={s.caption}>
          Hourly weather (ERA5) and background air quality (CAMS), {r.selected.dateLabel}, local time (IST)
        </div>
        <Grid
          head={[
            'Hour',
            'Air temp °C',
            'RH %',
            'Wind m/s',
            'Wind from °',
            'Shortwave W/m²',
            'Cloud %',
            'Rain mm',
            'Mixing ht m',
            'PM10 µg/m³',
            'PM2.5 µg/m³',
          ]}
          rows={rows}
          highlight={scenario.hour}
        />
      </>
    );
  }
  if (tab === 'dust')
    return (
      <div className={s.two}>
        <div>
          <div className={s.caption}>
            Receptors, 24 h PM10 ({show}), {r.selected.dateLabel}
          </div>
          <Grid
            head={[
              'Receptor',
              'Distance m',
              'Increment µg/m³',
              'Total µg/m³',
              'Max 24 h inc.',
              'Site-caused exceed. days',
            ]}
            rows={r.dust.receptors.map((x) => [
              x.name,
              fmt(x.distanceM, 0),
              fmt(x.day.pm10Inc, 1),
              fmt(x.day.pm10Total, 0),
              fmt(x.period.maxPm10Inc24h, 1),
              fmt(x.period.exceedDaysSiteCaused, 0),
            ])}
          />
        </div>
        <div>
          <div className={s.caption}>
            Vehicle movements (derived from quantities and programme; read-only)
          </div>
          <Grid
            head={['Material', 'Phase', 'Quantity', 'Loads', 'Trips', 'Trips/day', 'VKT/day']}
            rows={r.flows.map((f) => [
              f.label,
              f.phase,
              `${fmt(f.quantity, 0)} ${f.quantityUnit}`,
              fmt(f.loads, 0),
              fmt(f.trips, 0),
              fmt(f.tripsPerDay, 1),
              fmt(f.vktPerDay, 2),
            ])}
          />
          <div className={s.caption}>PM10 emitted over the programme by source (t)</div>
          <Grid
            head={['Source', 'PM10 t']}
            rows={Object.entries(r.dust.bySourceT).map(([k, v]) => [k, fmt(v, 3)])}
          />
        </div>
      </div>
    );
  if (tab === 'heat')
    return (
      <Grid
        head={['Indicator', 'Value']}
        rows={[
          ['Selected hour', `${r.selected.dateLabel}, ${String(scenario.hour).padStart(2, '0')}:00 IST`],
          ['Sun altitude', `${fmt(r.heat.sunAltDeg, 1)}°`],
          ['Air temperature', `${fmt(r.met.taC, 1)} °C`],
          ['Site surface temperature (cleared)', `${fmt(r.heat.plotTsC, 1)} °C`],
          ['Same plot as grass (pre-development)', `${fmt(r.heat.plotTsPreC, 1)} °C`],
          ['Increase from clearing', `${fmt(r.heat.plotTsC - r.heat.plotTsPreC, 1)} °C`],
          ['Max worker UTCI on site', `${fmt(r.heat.maxWorkerUtci, 1)} °C`],
          ['Mean worker UTCI on site', `${fmt(r.heat.meanWorkerUtci, 1)} °C`],
          [
            'Working hours at risk (UTCI > 32 °C)',
            `${fmt(r.heat.riskHours, 0)} of ${fmt(r.heat.workingHours, 0)} h`,
          ],
        ]}
      />
    );
  const g = r.ghg;
  const t = (v: number) => fmt(v / 1000, 1);
  return (
    <Grid
      head={['Module', 'tCO2e', 'Note']}
      rows={[
        ['A1–A3 concrete', t(g.a1a3.concrete), `${fmt(r.quantities.concreteM3, 0)} m³`],
        ['A1–A3 rebar', t(g.a1a3.rebar), `${fmt(r.quantities.rebarKg / 1000, 0)} t`],
        ['A1–A3 masonry', t(g.a1a3.masonry), `${fmt(r.quantities.masonryKg / 1000, 0)} t`],
        ['A1–A3 glass', t(g.a1a3.glass), `${fmt(r.quantities.glassKg / 1000, 0)} t`],
        ['A1–A3 aluminium', t(g.a1a3.aluminium), `${fmt(r.quantities.aluminiumKg / 1000, 1)} t`],
        ['A4 transport', t(g.a4), 'off-site t·km × factor'],
        ['A5 site diesel (Scope 1)', t(g.a5Diesel), `${fmt(g.a5DieselLitres, 0)} L`],
        ['A5 grid electricity (Scope 2)', t(g.a5Electricity), `${fmt(g.a5GridKwh, 0)} kWh`],
        ['A5 waste', t(g.waste), 'wastage × (A1–A4)'],
        ['Total', t(g.total), `${fmt(g.perM2Gfa, 0)} kgCO2e/m² GFA`],
      ]}
    />
  );
}

export function DataSheet() {
  const s = useStyles();
  const open = useAppStore((st) => st.ui.dataSheetOpen);
  const active = useAppStore((st) => st.ui.dataSheetTab);
  const openTab = useAppStore((st) => st.openDataSheetTab);
  const toggle = useAppStore((st) => st.toggleDataSheet);
  return (
    <section className={s.root} data-testid="panel-datasheet" aria-label="Data sheet">
      {open && (
        <div className={s.body} role="tabpanel" data-testid="datasheet-body">
          <Body tab={active} />
        </div>
      )}
      <div className={s.strip} role="tablist" aria-label="Data sheet tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={open && t.id === active}
            className={mergeClasses(s.tab, open && t.id === active && s.tabActive)}
            data-testid={`ctl-datasheet-tab-${t.id}`}
            onClick={() => (open && t.id === active ? toggle() : openTab(t.id))}
          >
            {t.label}
          </button>
        ))}
        <span className={s.spacer} />
        <Tooltip content={open ? 'Collapse the data sheet' : 'Expand the data sheet'} relationship="label">
          <button
            type="button"
            className={s.toggle}
            data-testid="ctl-datasheet-collapse"
            aria-expanded={open}
            onClick={toggle}
          >
            {open ? <ChevronDown16Regular /> : <ChevronUp16Regular />}
          </button>
        </Tooltip>
      </div>
    </section>
  );
}
