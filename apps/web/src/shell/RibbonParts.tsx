import { Tooltip, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import type { ReactElement, ReactNode } from 'react';
import { shell } from '../theme/theme';

const useStyles = makeStyles({
  group: {
    display: 'flex',
    flexDirection: 'column',
    paddingLeft: '6px',
    paddingRight: '6px',
    borderRight: `1px solid ${shell.border}`,
    height: '100%',
    boxSizing: 'border-box',
  },
  groupBody: {
    flexGrow: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
  },
  groupLabel: {
    fontSize: '11px',
    lineHeight: '16px',
    color: shell.textMuted,
    textAlign: 'center',
    paddingBottom: '2px',
  },
  button: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: '2px',
    minWidth: '52px',
    height: '62px',
    paddingTop: '6px',
    paddingLeft: '4px',
    paddingRight: '4px',
    border: '1px solid transparent',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: 'transparent',
    color: tokens.colorNeutralForeground1,
    fontFamily: 'inherit',
    fontSize: '12px',
    lineHeight: '15px',
    cursor: 'pointer',
    ':hover': { backgroundColor: '#EBEBEB' },
    ':active': { backgroundColor: '#E0E0E0' },
    ':focus-visible': { outline: `2px solid ${tokens.colorBrandStroke1}`, outlineOffset: '-2px' },
    ':disabled': {
      color: tokens.colorNeutralForegroundDisabled,
      cursor: 'default',
      backgroundColor: 'transparent',
    },
  },
  pressed: {
    backgroundColor: tokens.colorBrandBackground2,
    border: `1px solid ${tokens.colorBrandStroke2}`,
    ':hover': { backgroundColor: tokens.colorBrandBackground2Hover },
  },
  icon: { fontSize: '24px', height: '24px', display: 'flex', color: '#3B3B3B' },
  label: { whiteSpace: 'nowrap' },
});

export function RibbonGroup({ label, children }: { label: string; children: ReactNode }) {
  const s = useStyles();
  return (
    <div className={s.group} role="group" aria-label={label}>
      <div className={s.groupBody}>{children}</div>
      <div className={s.groupLabel}>{label}</div>
    </div>
  );
}

interface RibbonButtonProps {
  testId: string;
  label: string;
  icon: ReactElement;
  onClick: () => void;
  /** Tooltip text; include the keyboard shortcut, e.g. "Next hour (→)". */
  tooltip: string;
  /** When set, the button is a toggle and reports aria-pressed. */
  pressed?: boolean;
}

export function RibbonButton({ testId, label, icon, onClick, tooltip, pressed }: RibbonButtonProps) {
  const s = useStyles();
  return (
    <Tooltip content={tooltip} relationship="description" withArrow>
      <button
        type="button"
        className={mergeClasses(s.button, pressed && s.pressed)}
        data-testid={testId}
        aria-pressed={pressed}
        onClick={onClick}
      >
        <span className={s.icon} aria-hidden>
          {icon}
        </span>
        <span className={s.label}>{label}</span>
      </button>
    </Tooltip>
  );
}
