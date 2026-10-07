import {
  Skeleton,
  SkeletonItem,
  Tooltip,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';
import { PARAMS } from '@envelope/models';
import type { Assumptions } from '@envelope/models';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { Fragment, useEffect, useRef, useState } from 'react';
import { KPIS, delta, fmt } from '../analysis/kpis';
import { useAppStore } from '../store/appStore';
import { shell } from '../theme/theme';
import { PanelHeader } from './PanelHeader';

echarts.use([BarChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

const useStyles = makeStyles({
  root: {
    width: '380px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    borderLeft: `1px solid ${shell.border}`,
    overflowY: 'auto',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontVariantNumeric: 'tabular-nums' },
  th: {
    textAlign: 'right',
    fontWeight: 600,
    color: shell.textMuted,
    padding: '4px 6px',
    borderBottom: `1px solid ${shell.border}`,
    fontSize: '11px',
    whiteSpace: 'nowrap',
  },
  thL: { textAlign: 'left' },
  td: { textAlign: 'right', padding: '3px 6px', borderBottom: `1px solid #F0F0F0`, whiteSpace: 'nowrap' },
  tdL: { textAlign: 'left', whiteSpace: 'normal', color: '#242424' },
  unit: { color: shell.textSubtle, fontSize: '11px' },
  grp: {
    backgroundColor: shell.chromeAlt,
    fontWeight: 600,
    fontSize: '11px',
    color: shell.textMuted,
    padding: '3px 6px',
  },
  good: { color: '#237A45' },
  bad: { color: '#B3261E' },
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 10px',
    fontSize: '12px',
    color: shell.textMuted,
    borderBottom: `1px solid ${shell.border}`,
  },
  seg: {
    fontFamily: 'inherit',
    fontSize: '11px',
    padding: '2px 10px',
    border: `1px solid ${shell.border}`,
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
  },
  segOn: {
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
    fontWeight: 600,
  },
  chart: { height: '170px', margin: '4px 6px' },
  chartTitle: { fontSize: '11px', color: shell.textMuted, padding: '6px 10px 0' },
  input: {
    width: '72px',
    fontFamily: 'inherit',
    fontSize: '12px',
    textAlign: 'right',
    border: '1px solid transparent',
    padding: '1px 4px',
    fontVariantNumeric: 'tabular-nums',
    backgroundColor: 'transparent',
    ':hover': { border: `1px solid ${shell.border}` },
    ':focus': {
      border: `1px solid ${tokens.colorBrandStroke1}`,
      outlineStyle: 'none',
      backgroundColor: '#FFFFFF',
    },
  },
  changed: { backgroundColor: '#FFF4CE' },
  verify: {
    fontSize: '10px',
    color: '#8A6100',
    border: '1px solid #E8D18A',
    borderRadius: '2px',
    padding: '0 3px',
    marginLeft: '4px',
  },
  reset: {
    fontFamily: 'inherit',
    fontSize: '11px',
    border: `1px solid ${shell.border}`,
    backgroundColor: '#FFFFFF',
    padding: '2px 8px',
    cursor: 'pointer',
    marginLeft: 'auto',
  },
  note: { fontSize: '11px', color: shell.textSubtle, padding: '6px 10px 10px', lineHeight: '15px' },
});

function MonthlyChart({
  title,
  unit,
  baseline,
  mitigated,
  testId,
}: {
  title: string;
  unit: string;
  baseline: number[];
  mitigated: number[];
  testId: string;
}) {
  const s = useStyles();
  const ref = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    chart.current = echarts.init(ref.current, undefined, { renderer: 'canvas' });
    const ro = new ResizeObserver(() => chart.current?.resize());
    ro.observe(ref.current);
    return () => {
      ro.disconnect();
      chart.current?.dispose();
    };
  }, []);
  useEffect(() => {
    chart.current?.setOption({
      animation: false,
      textStyle: { fontFamily: 'Segoe UI, Inter, sans-serif', fontSize: 11 },
      grid: { left: 44, right: 8, top: 22, bottom: 22 },
      legend: {
        top: 0,
        right: 4,
        itemWidth: 10,
        itemHeight: 8,
        textStyle: { fontSize: 11, color: '#616161' },
      },
      tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${v.toFixed(1)} ${unit}` },
      xAxis: {
        type: 'category',
        data: baseline.map((_, i) => `M${i + 1}`),
        axisLabel: { color: '#8A8A8A', fontSize: 10 },
        axisLine: { lineStyle: { color: '#D0D0D0' } },
      },
      yAxis: {
        type: 'value',
        name: unit,
        nameTextStyle: { color: '#8A8A8A', fontSize: 10 },
        axisLabel: { color: '#8A8A8A', fontSize: 10 },
        splitLine: { lineStyle: { color: '#EEEEEE' } },
      },
      series: [
        { name: 'Baseline', type: 'bar', data: baseline, itemStyle: { color: '#B9B9B9' }, barGap: '10%' },
        { name: 'Mitigated', type: 'bar', data: mitigated, itemStyle: { color: '#237A45' } },
      ],
    });
  }, [baseline, mitigated, unit]);
  return (
    <>
      <div className={s.chartTitle}>{title}</div>
      <div ref={ref} className={s.chart} data-testid={testId} />
    </>
  );
}

function AssumptionCell({ id, value, changed }: { id: keyof Assumptions; value: number; changed: boolean }) {
  const s = useStyles();
  const setA = useAppStore((st) => st.setAssumption);
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const v = Number(draft);
    const def = PARAMS.find((p) => p.id === id)!;
    if (!Number.isFinite(v) || v < (def.min ?? 0) || (def.max !== undefined && v > def.max)) {
      setDraft(String(value));
      return;
    }
    setA(id, v === def.value ? null : v);
  };
  return (
    <input
      className={mergeClasses(s.input, changed && s.changed)}
      value={draft}
      aria-label={`${id} value`}
      data-testid={`ctl-assumption-${id}`}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  );
}

export function Inspector() {
  const s = useStyles();
  const results = useAppStore((st) => st.results);
  const running = useAppStore((st) => st.running);
  const error = useAppStore((st) => st.computeError);
  const show = useAppStore((st) => st.showScenario);
  const toggleShow = useAppStore((st) => st.toggleShowScenario);
  const overrides = useAppStore((st) => st.assumptions);
  const resetA = useAppStore((st) => st.resetAssumptions);
  const groups = ['Dust', 'Heat', 'GHG'] as const;

  return (
    <aside className={s.root} data-testid="panel-inspector" aria-label="Inspector">
      <div className={s.bar}>
        <span>Map shows</span>
        <button
          type="button"
          className={mergeClasses(s.seg, show === 'baseline' && s.segOn)}
          aria-pressed={show === 'baseline'}
          data-testid="ctl-show-baseline"
          onClick={() => show !== 'baseline' && toggleShow()}
        >
          Baseline
        </button>
        <Tooltip content="Toggle baseline / mitigated (M)" relationship="description">
          <button
            type="button"
            className={mergeClasses(s.seg, show === 'mitigated' && s.segOn)}
            aria-pressed={show === 'mitigated'}
            data-testid="ctl-show-mitigated"
            onClick={() => show !== 'mitigated' && toggleShow()}
          >
            Mitigated
          </button>
        </Tooltip>
        {running && <span style={{ marginLeft: 'auto' }}>Running…</span>}
      </div>
      <PanelHeader>Key indicators</PanelHeader>
      {error && <div className={s.note}>The models could not run: {error}</div>}
      {!results ? (
        <Skeleton aria-label="Loading indicators" style={{ padding: 10 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonItem key={i} size={16} style={{ marginBottom: 6 }} />
          ))}
        </Skeleton>
      ) : (
        <table className={s.table} data-testid="kpi-table">
          <thead>
            <tr>
              <th className={mergeClasses(s.th, s.thL)}>Indicator</th>
              <th className={s.th}>Baseline</th>
              <th className={s.th}>Mitigated</th>
              <th className={s.th}>Δ</th>
              <th className={s.th}>Δ%</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <Fragment key={g}>
                <tr>
                  <td colSpan={5} className={s.grp}>
                    {g}
                  </td>
                </tr>
                {KPIS.filter((k) => k.group === g).map((k) => {
                  const b = k.value(results.baseline);
                  const m = k.value(results.mitigated);
                  const d = delta(b, m, k.digits);
                  const tone = m < b - 1e-9 ? s.good : m > b + 1e-9 ? s.bad : undefined;
                  return (
                    <tr key={k.id} data-testid={`kpi-${k.id}`}>
                      <td className={mergeClasses(s.td, s.tdL)}>
                        {k.label} <span className={s.unit}>({k.unit})</span>
                      </td>
                      <td className={s.td}>{fmt(b, k.digits)}</td>
                      <td className={s.td}>{fmt(m, k.digits)}</td>
                      <td className={mergeClasses(s.td, tone)}>{d.abs}</td>
                      <td className={mergeClasses(s.td, tone)}>{d.pct}</td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
      {results && (
        <>
          <MonthlyChart
            title="Construction emissions by month (tCO2e)"
            unit="tCO2e"
            baseline={results.baseline.ghg.monthly}
            mitigated={results.mitigated.ghg.monthly}
            testId="chart-ghg-monthly"
          />
          {results.baseline.ok && (
            <MonthlyChart
              title="PM10 emitted by month (t)"
              unit="t"
              baseline={results.baseline.dust.monthlyPm10T}
              mitigated={results.mitigated.dust.monthlyPm10T}
              testId="chart-dust-monthly"
            />
          )}
        </>
      )}
      <PanelHeader>Assumptions</PanelHeader>
      <div className={s.bar}>
        <span>{Object.keys(overrides).length} changed</span>
        <button
          type="button"
          className={s.reset}
          data-testid="ctl-assumptions-reset"
          disabled={!Object.keys(overrides).length}
          onClick={resetA}
        >
          Reset to default
        </button>
      </div>
      <table className={s.table}>
        <tbody>
          {(['Programme', 'Logistics', 'Dust', 'Heat', 'GHG'] as const).map((g) => (
            <Fragment key={g}>
              <tr>
                <td colSpan={3} className={s.grp}>
                  {g}
                </td>
              </tr>
              {PARAMS.filter((p) => p.group === g).map((p) => {
                const id = p.id as keyof Assumptions;
                const v = overrides[id] ?? p.value;
                return (
                  <tr key={p.id}>
                    <td className={mergeClasses(s.td, s.tdL)} title={`Source: ${p.source}`}>
                      {p.label}
                      {p.status === 'verify' && <span className={s.verify}>unverified</span>}
                    </td>
                    <td className={s.td}>
                      <AssumptionCell id={id} value={v} changed={overrides[id] !== undefined} />
                    </td>
                    <td className={mergeClasses(s.td, s.unit)}>{p.unit}</td>
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
      <div className={s.note}>
        Screening-level models (Tier 1–2), not a regulatory dispersion model such as AERMOD. Values marked
        unverified are defaults whose sources are still to be confirmed. Hover a row for its source.
      </div>
    </aside>
  );
}
