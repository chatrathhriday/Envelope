import { Tooltip, makeStyles } from '@fluentui/react-components';
import { DATA_SOURCES } from '@envelope/data';
import type { FreshnessState } from '@envelope/data';
import { formatHour, phaseForMonth, totalMonths } from '@envelope/models';
import { useAppStore } from '../store/appStore';
import { shell } from '../theme/theme';

const useStyles = makeStyles({
  root: {
    height: '24px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '0',
    backgroundColor: shell.chrome,
    borderTop: `1px solid ${shell.border}`,
    fontSize: '11px',
    color: shell.textMuted,
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  },
  item: {
    paddingLeft: '10px',
    paddingRight: '10px',
    borderRight: `1px solid ${shell.border}`,
    lineHeight: '24px',
  },
  spacer: { flexGrow: 1 },
  source: { display: 'inline-flex', alignItems: 'center', gap: '4px', marginRight: '10px' },
  dot: { width: '7px', height: '7px', borderRadius: '50%', display: 'inline-block' },
});

const STATE_COLOUR: Record<FreshnessState, string> = {
  'not-loaded': '#BDBDBD',
  loading: '#8A8A8A',
  live: '#237A45',
  cached: '#B8860B',
  error: '#C4314B',
};

const STATE_TEXT: Record<FreshnessState, string> = {
  'not-loaded': 'Not loaded',
  loading: 'Loading',
  live: 'Live',
  cached: 'Cached',
  error: 'Unavailable',
};

export function StatusBar() {
  const s = useStyles();
  const { hour, constructionMonth } = useAppStore((st) => st.scenario);
  const { phase } = phaseForMonth(constructionMonth);
  // Freshness per source is wired to the data layer in checkpoint 2; until then nothing is loaded.
  const state: FreshnessState = 'not-loaded';

  return (
    <footer className={s.root} data-testid="panel-statusbar">
      <span className={s.item} data-testid="status-cursor">
        Cursor: –
      </span>
      <span className={s.item} data-testid="status-hour">
        {formatHour(hour)} IST
      </span>
      <span className={s.item} data-testid="status-month">
        Month {constructionMonth}/{totalMonths()} · {phase.label}
      </span>
      <span className={s.spacer} />
      <span className={s.item}>
        {DATA_SOURCES.map((src) => (
          <Tooltip key={src.id} content={`${src.label}: ${STATE_TEXT[state]}`} relationship="description">
            <span className={s.source} data-testid={`status-source-${src.id}`} tabIndex={0}>
              <span className={s.dot} style={{ backgroundColor: STATE_COLOUR[state] }} />
              {src.label}
            </span>
          </Tooltip>
        ))}
      </span>
      <span className={s.item} data-testid="status-runtime">
        Model run: –
      </span>
    </footer>
  );
}
