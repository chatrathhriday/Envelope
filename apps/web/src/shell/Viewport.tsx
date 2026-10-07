import { makeStyles } from '@fluentui/react-components';
import { shell } from '../theme/theme';

const useStyles = makeStyles({
  root: {
    position: 'relative',
    flexGrow: 1,
    minHeight: 0,
    backgroundColor: shell.viewportBg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: { fontSize: '12px', color: shell.textMuted },
});

export function Viewport() {
  const s = useStyles();
  return (
    <main className={s.root} data-testid="panel-viewport" aria-label="3D viewport">
      <span className={s.note}>The 3D site view is not available in this build yet.</span>
    </main>
  );
}
