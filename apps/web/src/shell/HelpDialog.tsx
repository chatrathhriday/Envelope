import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  makeStyles,
} from '@fluentui/react-components';
import { useAppStore } from '../store/appStore';
import { shell } from '../theme/theme';

const useStyles = makeStyles({
  table: { borderCollapse: 'collapse', fontSize: '12px', width: '100%' },
  key: {
    fontFamily: 'Consolas, monospace',
    padding: '4px 8px',
    borderBottom: `1px solid ${shell.border}`,
    width: '90px',
  },
  desc: { padding: '4px 8px', borderBottom: `1px solid ${shell.border}` },
  note: { fontSize: '12px', color: shell.textMuted, marginTop: '12px' },
});

const SHORTCUTS: [string, string][] = [
  ['←', 'Previous hour'],
  ['→', 'Next hour'],
  ['F', 'Fit to site'],
];

export function HelpDialog() {
  const s = useStyles();
  const open = useAppStore((st) => st.ui.helpOpen);
  const setHelpOpen = useAppStore((st) => st.setHelpOpen);
  return (
    <Dialog open={open} onOpenChange={(_, d) => setHelpOpen(d.open)}>
      <DialogSurface data-testid="dialog-help">
        <DialogBody>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogContent>
            <table className={s.table}>
              <tbody>
                {SHORTCUTS.map(([k, d]) => (
                  <tr key={k}>
                    <td className={s.key}>{k}</td>
                    <td className={s.desc}>{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className={s.note}>
              Envelope is a screening-level tool. Its results are indicative and do not replace an EIA by an
              accredited consultant.
            </p>
          </DialogContent>
          <DialogActions>
            <Button appearance="primary" data-testid="ctl-help-close" onClick={() => setHelpOpen(false)}>
              Close
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
