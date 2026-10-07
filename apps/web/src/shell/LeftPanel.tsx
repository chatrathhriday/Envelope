import {
  Checkbox,
  Input,
  Slider,
  Tooltip,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';
import { Eye16Regular, EyeOff16Regular } from '@fluentui/react-icons';
import type { Mitigations } from '@envelope/models';
import type { ImpactLayerId, SiteLayerId } from '../store/appStore';
import { useAppStore } from '../store/appStore';
import { shell } from '../theme/theme';
import { PanelHeader } from './PanelHeader';

const useStyles = makeStyles({
  root: {
    width: '272px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    borderRight: `1px solid ${shell.border}`,
    overflowY: 'auto',
  },
  group: { fontSize: '11px', fontWeight: 600, color: shell.textMuted, padding: '8px 10px 2px' },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    minHeight: '26px',
    paddingLeft: '6px',
    paddingRight: '10px',
    fontSize: '12px',
    ':hover': { backgroundColor: '#F5F5F5' },
  },
  rowOff: { color: shell.textSubtle },
  eye: {
    width: '24px',
    height: '22px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    borderRadius: '2px',
    backgroundColor: 'transparent',
    color: '#3B3B3B',
    cursor: 'pointer',
    ':hover': { backgroundColor: '#E6E6E6' },
    ':focus-visible': { outline: `2px solid ${tokens.colorBrandStroke1}` },
  },
  eyeOff: { color: shell.textSubtle },
  hint: { marginLeft: 'auto', color: shell.textSubtle, fontSize: '11px' },
  sub: {
    paddingLeft: '36px',
    paddingRight: '10px',
    paddingBottom: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    color: shell.textMuted,
  },
  seg: {
    fontFamily: 'inherit',
    fontSize: '11px',
    padding: '1px 8px',
    border: `1px solid ${shell.border}`,
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
    color: '#3B3B3B',
  },
  segOn: {
    backgroundColor: tokens.colorBrandBackground2,
    borderTopColor: tokens.colorBrandStroke2,
    borderBottomColor: tokens.colorBrandStroke2,
    borderLeftColor: tokens.colorBrandStroke2,
    borderRightColor: tokens.colorBrandStroke2,
    color: tokens.colorBrandForeground1,
  },
  mit: {
    display: 'flex',
    alignItems: 'center',
    minHeight: '26px',
    paddingLeft: '4px',
    paddingRight: '10px',
    fontSize: '12px',
  },
  effect: { marginLeft: 'auto', color: shell.textSubtle, fontSize: '11px', whiteSpace: 'nowrap' },
  flag: { color: '#8A6100', fontSize: '10px', marginLeft: '4px' },
  num: { width: '64px' },
});

function Eye({
  on,
  label,
  testId,
  onClick,
}: {
  on: boolean;
  label: string;
  testId: string;
  onClick: () => void;
}) {
  const s = useStyles();
  return (
    <Tooltip
      content={on ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
      relationship="label"
    >
      <button
        type="button"
        className={mergeClasses(s.eye, !on && s.eyeOff)}
        aria-pressed={on}
        data-testid={testId}
        onClick={onClick}
      >
        {on ? <Eye16Regular /> : <EyeOff16Regular />}
      </button>
    </Tooltip>
  );
}

const SITE_LAYERS: { id: SiteLayerId; label: string; hint: string }[] = [
  { id: 'basemap', label: '3D basemap', hint: 'Google / OSM' },
  { id: 'building', label: 'Building and plot', hint: 'By month' },
  { id: 'shadows', label: 'Shadows', hint: 'Sun at hour' },
];

const IMPACT_LAYERS: { id: ImpactLayerId; label: string; hint: string; key: string }[] = [
  { id: 'dust', label: 'Dust (PM10)', hint: 'µg/m³', key: 'D' },
  { id: 'ts', label: 'Surface temperature', hint: '°C', key: 'H' },
  { id: 'utci', label: 'Worker heat stress (UTCI)', hint: '°C', key: 'U' },
  { id: 'ghg', label: 'GHG on envelope', hint: 'kgCO2e/m²', key: 'G' },
];

type BoolKey = { [K in keyof Mitigations]: Mitigations[K] extends boolean ? K : never }[keyof Mitigations];

const MEASURES: { group: string; items: { id: BoolKey; label: string; effect: string; flag?: string }[] }[] =
  [
    {
      group: 'Dust',
      items: [
        {
          id: 'sprinkling',
          label: 'Water sprinkling of site and haul roads',
          effect: '−50% activity, −55% haul',
        },
        { id: 'pavedRoads', label: 'Paved or WMM haul roads', effect: '−90% haul' },
        { id: 'windBarriers', label: 'Wind barriers / barricading', effect: '−50% erosion, handling' },
        { id: 'coverStockpiles', label: 'Cover stockpiles', effect: '−90% stockpile' },
        { id: 'greenNetting', label: 'Green netting on scaffolding', effect: '−30% handling' },
        { id: 'antiSmogGun', label: 'Anti-smog gun', effect: '−30% increment', flag: 'low evidence' },
        { id: 'wheelWashing', label: 'Wheel washing at exit', effect: '−80% trackout' },
        { id: 'highWindStop', label: 'Stop dusty work in high wind', effect: 'rule' },
      ],
    },
    {
      group: 'Heat',
      items: [
        { id: 'shadeNets', label: 'Shade nets over work areas', effect: 'beam × 0.5' },
        { id: 'retainTrees', label: 'Retain trees along boundary', effect: 'shade, EF' },
        { id: 'rescheduleWork', label: 'No heavy work 12:00–15:00', effect: 'exposure' },
      ],
    },
    {
      group: 'GHG',
      items: [
        { id: 'lowCarbonConcrete', label: 'Low-carbon concrete (GGBS / fly ash)', effect: 'factor −%' },
        { id: 'recycledRebar', label: 'Recycled-content rebar', effect: '−40% rebar' },
        { id: 'gridPower', label: 'Grid connection instead of DG', effect: 'Scope 1 → 2' },
        { id: 'solarHybridDg', label: 'Solar-hybrid site power', effect: '−30% kWh' },
        { id: 'localSourcing', label: 'Local sourcing', effect: '−50% distance' },
        { id: 'wasteReduction', label: 'Waste reduction plan', effect: 'wastage × 0.5' },
      ],
    },
  ];

export function LeftPanel() {
  const s = useStyles();
  const layers = useAppStore((st) => st.layers);
  const toggleLayer = useAppStore((st) => st.toggleLayer);
  const impact = useAppStore((st) => st.impactLayer);
  const setImpact = useAppStore((st) => st.setImpactLayer);
  const metric = useAppStore((st) => st.dustMetric);
  const setMetric = useAppStore((st) => st.setDustMetric);
  const opacity = useAppStore((st) => st.layerOpacity);
  const setOpacity = useAppStore((st) => st.setLayerOpacity);
  const m = useAppStore((st) => st.mitigations);
  const setM = useAppStore((st) => st.setMitigation);

  return (
    <aside className={s.root} data-testid="panel-left" aria-label="Layers and mitigation">
      <PanelHeader>Layers</PanelHeader>
      <div className={s.group}>Impact (one at a time)</div>
      {IMPACT_LAYERS.map((l) => (
        <div key={l.id}>
          <div className={mergeClasses(s.row, impact !== l.id && s.rowOff)}>
            <Eye
              on={impact === l.id}
              label={`${l.label} layer (${l.key})`}
              testId={`ctl-layer-${l.id}`}
              onClick={() => setImpact(impact === l.id ? null : l.id)}
            />
            <span>{l.label}</span>
            <span className={s.hint}>{l.hint}</span>
          </div>
          {l.id === 'dust' && impact === 'dust' && (
            <div className={s.sub}>
              <span>Metric</span>
              <button
                type="button"
                className={mergeClasses(s.seg, metric === 'hour' && s.segOn)}
                aria-pressed={metric === 'hour'}
                data-testid="ctl-dust-metric-hour"
                onClick={() => setMetric('hour')}
              >
                Selected hour
              </button>
              <button
                type="button"
                className={mergeClasses(s.seg, metric === 'day' && s.segOn)}
                aria-pressed={metric === 'day'}
                data-testid="ctl-dust-metric-day"
                onClick={() => setMetric('day')}
              >
                24 h mean
              </button>
            </div>
          )}
        </div>
      ))}
      {impact && impact !== 'ghg' && (
        <div className={s.sub}>
          <label htmlFor="opacity">Opacity</label>
          <Slider
            id="opacity"
            size="small"
            min={10}
            max={100}
            step={5}
            value={Math.round(opacity * 100)}
            data-testid="ctl-layer-opacity"
            onChange={(_, d) => setOpacity(d.value / 100)}
          />
          <span>{Math.round(opacity * 100)}%</span>
        </div>
      )}
      <div className={s.group}>Site</div>
      {SITE_LAYERS.map((l) => (
        <div key={l.id} className={mergeClasses(s.row, !layers[l.id] && s.rowOff)}>
          <Eye
            on={layers[l.id]}
            label={l.label}
            testId={`ctl-layer-${l.id}`}
            onClick={() => toggleLayer(l.id)}
          />
          <span>{l.label}</span>
          <span className={s.hint}>{l.hint}</span>
        </div>
      ))}

      <PanelHeader>Mitigation</PanelHeader>
      {MEASURES.map((g) => (
        <div key={g.group}>
          <div className={s.group}>{g.group}</div>
          {g.items.map((it) => (
            <div key={it.id}>
              <div className={s.mit}>
                <Checkbox
                  size="medium"
                  checked={Boolean(m[it.id])}
                  onChange={(_, d) => setM(it.id, Boolean(d.checked))}
                  label={
                    <span>
                      {it.label}
                      {it.flag && <span className={s.flag}>({it.flag})</span>}
                    </span>
                  }
                  data-testid={`ctl-mit-${it.id}`}
                />
                <span className={s.effect}>{it.effect}</span>
              </div>
              {it.id === 'highWindStop' && m.highWindStop && (
                <div className={s.sub}>
                  <span>Stop above</span>
                  <Input
                    className={s.num}
                    size="small"
                    type="number"
                    value={String(m.highWindStopMs)}
                    data-testid={'ctl-mit-highWindStopMs'}
                    onChange={(_, d) => {
                      const v = Number(d.value);
                      if (Number.isFinite(v) && v > 0) setM('highWindStopMs', v);
                    }}
                  />
                  <span>m/s (U10)</span>
                </div>
              )}
              {it.id === 'lowCarbonConcrete' && m.lowCarbonConcrete && (
                <div className={s.sub}>
                  <span>Factor reduction</span>
                  <Input
                    className={s.num}
                    size="small"
                    type="number"
                    value={String(m.lowCarbonConcretePct)}
                    data-testid={'ctl-mit-lowCarbonConcretePct'}
                    onChange={(_, d) => {
                      const v = Number(d.value);
                      if (Number.isFinite(v) && v >= 0 && v <= 60) setM('lowCarbonConcretePct', v);
                    }}
                  />
                  <span>% (20–40 typical)</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </aside>
  );
}
