import { makeStyles } from '@fluentui/react-components';
import { useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { shell } from '../theme/theme';
import { activeLayer } from './impactLayer';

const useStyles = makeStyles({
  root: {
    position: 'absolute',
    left: '8px',
    bottom: '34px',
    zIndex: 2,
    width: '230px',
    backgroundColor: 'rgba(255,255,255,0.94)',
    border: `1px solid ${shell.border}`,
    borderRadius: '2px',
    padding: '6px 8px',
    fontSize: '11px',
    color: '#242424',
    fontVariantNumeric: 'tabular-nums',
  },
  title: { fontWeight: 600, marginBottom: '4px' },
  bar: { height: '10px', borderRadius: '1px', border: '1px solid #D0D0D0' },
  ticks: { display: 'flex', justifyContent: 'space-between', color: shell.textMuted, marginTop: '2px' },
  cls: { display: 'flex', alignItems: 'center', gap: '6px', lineHeight: '16px' },
  sw: { width: '12px', height: '10px', border: '1px solid rgba(0,0,0,0.15)' },
  sub: { color: shell.textMuted, marginTop: '4px' },
});

export function Legend() {
  const s = useStyles();
  const results = useAppStore((st) => st.results);
  const show = useAppStore((st) => st.showScenario);
  const id = useAppStore((st) => st.impactLayer);
  const metric = useAppStore((st) => st.dustMetric);
  const layer = useMemo(
    () => activeLayer(results ? results[show] : null, id, metric),
    [results, show, id, metric],
  );
  if (!layer || !results) return null;
  const r = results[show];
  const sc = layer.scale;
  return (
    <div className={s.root} data-testid="legend">
      <div className={s.title}>
        {sc.title} ({sc.unit})
      </div>
      {sc.classes ? (
        sc.classes.slice(0, 5).map((c) => (
          <div key={c.label} className={s.cls}>
            <span className={s.sw} style={{ backgroundColor: c.colour }} />
            {c.label}
          </div>
        ))
      ) : (
        <>
          <div
            className={s.bar}
            style={{ background: `linear-gradient(to right, ${sc.stops!.join(',')})` }}
          />
          <div className={s.ticks}>
            <span>{sc.min.toFixed(0)}</span>
            <span>{id === 'dust' ? 'log scale' : ''}</span>
            <span>{sc.max.toFixed(0)}</span>
          </div>
        </>
      )}
      <div className={s.sub}>
        {show === 'baseline' ? 'Baseline' : 'Mitigated'} · {r.selected.dateLabel}
        {id !== 'ghg' && id !== 'dust'
          ? ` · ${String(useAppStore.getState().scenario.hour).padStart(2, '0')}:00 IST`
          : ''}
        {id === 'dust' ? ` · background ${r.dust.background.dayPm10.toFixed(0)} µg/m³ (CAMS) not shown` : ''}
      </div>
    </div>
  );
}
