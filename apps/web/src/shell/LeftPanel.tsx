import { Tooltip, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { Eye16Regular, EyeOff16Regular } from '@fluentui/react-icons';
import type { SiteLayerId } from '../store/appStore';
import { useAppStore } from '../store/appStore';
import { shell } from '../theme/theme';
import { EmptyState } from './EmptyState';
import { PanelHeader } from './PanelHeader';

const useStyles = makeStyles({
  root: {
    width: '264px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    borderRight: `1px solid ${shell.border}`,
    overflowY: 'auto',
  },
  group: {
    fontSize: '11px',
    fontWeight: 600,
    color: shell.textMuted,
    padding: '8px 10px 2px',
    textTransform: 'none',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    height: '26px',
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
});

const SITE_LAYERS: { id: SiteLayerId; label: string; hint: string }[] = [
  { id: 'basemap', label: '3D basemap', hint: 'Google / OSM' },
  { id: 'building', label: 'Building and plot', hint: 'By month' },
  { id: 'shadows', label: 'Shadows', hint: 'Sun at hour' },
];

function LayerRow({ id, label, hint }: { id: SiteLayerId; label: string; hint: string }) {
  const s = useStyles();
  const on = useAppStore((st) => st.layers[id]);
  const toggle = useAppStore((st) => st.toggleLayer);
  return (
    <div className={mergeClasses(s.row, !on && s.rowOff)}>
      <Tooltip
        content={on ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        relationship="label"
      >
        <button
          type="button"
          className={mergeClasses(s.eye, !on && s.eyeOff)}
          aria-pressed={on}
          data-testid={`ctl-layer-${id}`}
          onClick={() => toggle(id)}
        >
          {on ? <Eye16Regular /> : <EyeOff16Regular />}
        </button>
      </Tooltip>
      <span>{label}</span>
      <span className={s.hint}>{hint}</span>
    </div>
  );
}

export function LeftPanel() {
  const s = useStyles();
  return (
    <aside className={s.root} data-testid="panel-left" aria-label="Layers and mitigation">
      <PanelHeader>Layers</PanelHeader>
      <div className={s.group}>Site</div>
      {SITE_LAYERS.map((l) => (
        <LayerRow key={l.id} {...l} />
      ))}
      <div className={s.group}>Impact</div>
      <EmptyState
        testId="empty-layers"
        title="No impact layers yet"
        text="Dust, heat and GHG layers appear here once site data has loaded."
      />
      <PanelHeader>Mitigation</PanelHeader>
      <EmptyState
        testId="empty-mitigation"
        title="No measures"
        text="Mitigation measures appear here once the impact models are available."
      />
    </aside>
  );
}
