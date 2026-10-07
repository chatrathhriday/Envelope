import { Tooltip, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { ChevronDown16Regular, ChevronUp16Regular } from '@fluentui/react-icons';
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
  body: { height: '200px', overflow: 'auto' },
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
});

const TABS: { id: DataSheetTab; label: string; empty: string }[] = [
  { id: 'climate', label: 'Climate', empty: 'Hourly weather for the site appears here once it has loaded.' },
  {
    id: 'dust',
    label: 'Dust',
    empty: 'Dust emissions and receptor concentrations appear here after a model run.',
  },
  {
    id: 'heat',
    label: 'Heat',
    empty: 'Surface temperature and worker heat stress appear here after a model run.',
  },
  { id: 'ghg', label: 'GHG', empty: 'Construction-stage emissions by source appear here after a model run.' },
  { id: 'assumptions', label: 'Assumptions', empty: 'All model inputs, their values and their sources.' },
];

export function DataSheet() {
  const s = useStyles();
  const open = useAppStore((st) => st.ui.dataSheetOpen);
  const active = useAppStore((st) => st.ui.dataSheetTab);
  const openTab = useAppStore((st) => st.openDataSheetTab);
  const toggle = useAppStore((st) => st.toggleDataSheet);
  const current = TABS.find((t) => t.id === active) ?? TABS[0]!;

  return (
    <section className={s.root} data-testid="panel-datasheet" aria-label="Data sheet">
      {open && (
        <div className={s.body} role="tabpanel" data-testid="datasheet-body">
          <EmptyState title={`No ${current.label.toLowerCase()} data`} text={current.empty} />
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
