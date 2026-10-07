import { makeStyles } from '@fluentui/react-components';
import { shell } from '../theme/theme';

const useStyles = makeStyles({
  root: {
    padding: '12px',
    fontSize: '12px',
    lineHeight: '17px',
    color: shell.textSubtle,
  },
  title: { color: shell.textMuted, fontWeight: 600, marginBottom: '2px' },
});

export function EmptyState({ title, text, testId }: { title: string; text: string; testId?: string }) {
  const s = useStyles();
  return (
    <div className={s.root} data-testid={testId}>
      <div className={s.title}>{title}</div>
      <div>{text}</div>
    </div>
  );
}
