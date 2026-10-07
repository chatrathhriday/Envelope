import { makeStyles } from '@fluentui/react-components';
import { useAnalysis } from './compute/useAnalysis';
import { usePlayback, useShortcuts } from './hooks/useShortcuts';
import { ReportDialog } from './shell/ReportDialog';
import { DataSheet } from './shell/DataSheet';
import { HelpDialog } from './shell/HelpDialog';
import { Inspector } from './shell/Inspector';
import { LeftPanel } from './shell/LeftPanel';
import { Ribbon } from './shell/Ribbon';
import { StatusBar } from './shell/StatusBar';
import { TitleBar } from './shell/TitleBar';
import { Viewport } from './shell/Viewport';
import { useAppStore } from './store/appStore';

const useStyles = makeStyles({
  root: { height: '100%', display: 'flex', flexDirection: 'column' },
  main: { flexGrow: 1, minHeight: 0, display: 'flex' },
  centre: { flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' },
});

export function App() {
  const s = useStyles();
  const leftPanelOpen = useAppStore((st) => st.ui.leftPanelOpen);
  const inspectorOpen = useAppStore((st) => st.ui.inspectorOpen);
  useShortcuts();
  useAnalysis();
  usePlayback();

  return (
    <div className={s.root}>
      <TitleBar />
      <Ribbon />
      <div className={s.main}>
        {leftPanelOpen && <LeftPanel />}
        <div className={s.centre}>
          <Viewport />
          <DataSheet />
        </div>
        {inspectorOpen && <Inspector />}
      </div>
      <StatusBar />
      <HelpDialog />
      <ReportDialog />
    </div>
  );
}
