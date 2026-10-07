import { makeStyles } from '@fluentui/react-components';
import { shell } from '../theme/theme';

const useStyles = makeStyles({
  root: {
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    paddingLeft: '10px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#3B3B3B',
    backgroundColor: shell.chromeAlt,
    borderBottom: `1px solid ${shell.border}`,
    flexShrink: 0,
  },
});

export function PanelHeader({ children }: { children: string }) {
  const s = useStyles();
  return <div className={s.root}>{children}</div>;
}
