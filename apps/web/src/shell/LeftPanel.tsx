import { makeStyles } from '@fluentui/react-components';
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
});

export function LeftPanel() {
  const s = useStyles();
  return (
    <aside className={s.root} data-testid="panel-left" aria-label="Layers and mitigation">
      <PanelHeader>Layers</PanelHeader>
      <EmptyState
        testId="empty-layers"
        title="No layers"
        text="Analysis layers appear here once the site and its data have loaded."
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
