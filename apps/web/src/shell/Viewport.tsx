import { makeStyles } from '@fluentui/react-components';
import { shell } from '../theme/theme';
import { SiteViewer } from '../viewer/SiteViewer';
import { ViewportOverlays } from '../viewer/ViewportOverlays';

const useStyles = makeStyles({
  root: {
    position: 'relative',
    flexGrow: 1,
    minHeight: 0,
    overflow: 'hidden',
    backgroundColor: shell.viewportBg,
  },
});

export function Viewport() {
  const s = useStyles();
  return (
    <main className={s.root} data-testid="panel-viewport" aria-label="3D viewport">
      <SiteViewer />
      <ViewportOverlays />
    </main>
  );
}
