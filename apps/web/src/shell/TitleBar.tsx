import { Button, Tooltip, makeStyles } from '@fluentui/react-components';
import { Question20Regular } from '@fluentui/react-icons';
import { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { TITLE_BAR_BG, WORDMARK_GREEN } from '../theme/theme';

const useStyles = makeStyles({
  root: {
    height: '32px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    paddingLeft: '12px',
    paddingRight: '4px',
    backgroundColor: TITLE_BAR_BG,
    color: '#FFFFFF',
    userSelect: 'none',
  },
  wordmark: {
    fontSize: '15px',
    fontWeight: 600,
    letterSpacing: '0.2px',
    lineHeight: '32px',
  },
  env: { color: WORDMARK_GREEN },
  sep: { width: '1px', height: '16px', backgroundColor: '#3C4148' },
  name: {
    fontFamily: 'inherit',
    fontSize: '12px',
    color: '#E8E8E8',
    backgroundColor: 'transparent',
    border: '1px solid transparent',
    borderRadius: '2px',
    padding: '2px 6px',
    width: '320px',
    outlineStyle: 'none',
    ':hover': { border: '1px solid #4A5059' },
    ':focus': { border: `1px solid ${WORDMARK_GREEN}`, backgroundColor: '#2A2E33' },
  },
  saved: { fontSize: '11px', color: '#9AA0A6' },
  spacer: { flexGrow: 1 },
  help: {
    color: '#E8E8E8',
    minWidth: '28px',
    ':hover': { color: '#FFFFFF', backgroundColor: '#2F343A' },
    ':hover:active': { color: '#FFFFFF', backgroundColor: '#3A4047' },
  },
});

export function TitleBar() {
  const s = useStyles();
  const projectName = useAppStore((st) => st.projectName);
  const setProjectName = useAppStore((st) => st.setProjectName);
  const setHelpOpen = useAppStore((st) => st.setHelpOpen);
  const [draft, setDraft] = useState(projectName);

  useEffect(() => setDraft(projectName), [projectName]);
  useEffect(() => {
    document.title = `${projectName} · Envelope`;
  }, [projectName]);

  const commit = () => setProjectName(draft);

  return (
    <header className={s.root} data-testid="panel-titlebar">
      <span className={s.wordmark} aria-label="Envelope">
        <span className={s.env}>Env</span>elope
      </span>
      <span className={s.sep} />
      <input
        className={s.name}
        aria-label="Project name"
        data-testid="ctl-project-name"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') {
            setDraft(projectName);
            e.currentTarget.blur();
          }
        }}
      />
      <span className={s.saved} data-testid="txt-save-state">
        {draft === projectName ? 'Saved in this browser' : 'Unsaved name'}
      </span>
      <span className={s.spacer} />
      <Tooltip content="Help and keyboard shortcuts" relationship="label">
        <Button
          appearance="transparent"
          size="small"
          className={s.help}
          icon={<Question20Regular />}
          data-testid="ctl-help"
          onClick={() => setHelpOpen(true)}
        />
      </Tooltip>
    </header>
  );
}
