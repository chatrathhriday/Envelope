import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  makeStyles,
} from '@fluentui/react-components';
import { shell } from '../theme/theme';
import { EmptyState } from './EmptyState';
import { PanelHeader } from './PanelHeader';

const useStyles = makeStyles({
  root: {
    width: '340px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    borderLeft: `1px solid ${shell.border}`,
    overflowY: 'auto',
  },
  table: { fontSize: '12px' },
  num: { textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
  emptyCell: { color: shell.textSubtle },
});

export function Inspector() {
  const s = useStyles();
  return (
    <aside className={s.root} data-testid="panel-inspector" aria-label="Inspector">
      <PanelHeader>Key indicators</PanelHeader>
      <Table size="extra-small" className={s.table} aria-label="Key indicators" data-testid="kpi-table">
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Indicator</TableHeaderCell>
            <TableHeaderCell className={s.num}>Baseline</TableHeaderCell>
            <TableHeaderCell className={s.num}>Mitigated</TableHeaderCell>
            <TableHeaderCell className={s.num}>Δ</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={4} className={s.emptyCell}>
              No results yet. Indicators appear after the models have run.
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <PanelHeader>Assumptions</PanelHeader>
      <EmptyState
        testId="empty-assumptions"
        title="No assumptions"
        text="Model inputs and their sources appear here as editable cells."
      />
    </aside>
  );
}
