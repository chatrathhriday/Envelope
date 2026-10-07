import { Tooltip, makeStyles } from '@fluentui/react-components';
import { DATA_SOURCES } from '@envelope/data';
import type { FreshnessState } from '@envelope/data';
import { calendarMonthFor, formatHour, phaseForMonth, totalMonths } from '@envelope/models';
import { useAppStore } from '../store/appStore';
import { shell } from '../theme/theme';

const useStyles = makeStyles({
  root: {
    height: '24px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
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
  cursor: { minWidth: '196px' },
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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const BASEMAP_TEXT = {
  google: 'Google 3D tiles',
  'ion-fallback': 'World Terrain + OSM Buildings',
  osm: 'OpenStreetMap',
  none: 'No basemap',
} as const;

export function StatusBar() {
  const s = useStyles();
  const { hour, constructionMonth, weatherYear } = useAppStore((st) => st.scenario);
  const cursor = useAppStore((st) => st.cursor);
  const view = useAppStore((st) => st.view);
  const basemap = useAppStore((st) => st.basemap);
  const { phase } = phaseForMonth(constructionMonth);
  const calMonth = MONTHS[calendarMonthFor(constructionMonth) - 1];
  // Freshness per source is wired to the data layer in checkpoint 2; until then nothing is loaded.
  const state: FreshnessState = 'not-loaded';

  return (
    <footer className={s.root} data-testid="panel-statusbar">
      <span className={`${s.item} ${s.cursor}`} data-testid="status-cursor">
        {cursor ? `${cursor.lat.toFixed(5)}° N, ${cursor.lon.toFixed(5)}° E` : 'Cursor: –'}
      </span>
      <Tooltip content="Sun position and shadows use this date and hour" relationship="description">
        <span className={s.item} data-testid="status-hour" tabIndex={0}>
          15 {calMonth} {weatherYear}, {formatHour(hour)} IST
        </span>
      </Tooltip>
      <span className={s.item} data-testid="status-month">
        Month {constructionMonth}/{totalMonths()} · {phase.label}
      </span>
      <span className={s.item} data-testid="status-camera">
        {view ? `Camera ${view.rangeM.toLocaleString('en-IN')} m · ${view.headingDeg}°` : 'Camera –'}
      </span>
      <span className={s.spacer} />
      <span className={s.item} data-testid="status-basemap">
        {basemap.kind ? BASEMAP_TEXT[basemap.kind] : 'Basemap loading'}
      </span>
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
