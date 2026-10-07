import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import {
  ArrowReset24Regular,
  CalendarDay24Regular,
  DocumentPdf24Regular,
  ShieldCheckmark24Regular,
  WeatherDuststorm24Regular,
  WeatherSunny24Regular,
} from '@fluentui/react-icons';
import type { ProgrammeMonths } from '@envelope/models';
import { checkProgramme, programmeTotal, scaleProgramme } from '@envelope/models';
import { useEffect, useState } from 'react';
import type { PresetId } from '../store/appStore';
import { useAppStore } from '../store/appStore';
import { shell } from '../theme/theme';
import { RibbonButton, RibbonGroup } from './RibbonParts';

const useStyles = makeStyles({
  block: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '3px',
    padding: '0 6px',
    fontSize: '12px',
  },
  row: { display: 'flex', alignItems: 'center', gap: '4px', color: shell.textMuted },
  num: {
    width: '38px',
    fontFamily: 'inherit',
    fontSize: '12px',
    textAlign: 'right',
    border: `1px solid ${shell.border}`,
    borderRadius: '2px',
    padding: '1px 3px',
    fontVariantNumeric: 'tabular-nums',
    ':focus': { border: `1px solid ${tokens.colorBrandStroke1}`, outlineStyle: 'none' },
  },
  user: { backgroundColor: '#FFF4CE' },
  status: { fontSize: '11px', color: shell.textMuted },
  warn: { fontSize: '11px', color: '#8A6100', maxWidth: '260px', whiteSpace: 'normal', lineHeight: '13px' },
  select: {
    fontFamily: 'inherit',
    fontSize: '12px',
    padding: '2px 4px',
    border: `1px solid ${shell.border}`,
    borderRadius: '2px',
  },
});

function NumField({
  value,
  onCommit,
  testId,
  label,
  user,
}: {
  value: number;
  onCommit: (v: number) => void;
  testId: string;
  label: string;
  user: boolean;
}) {
  const s = useStyles();
  const [draft, setDraft] = useState(String(value));
  const [bad, setBad] = useState(false);
  useEffect(() => {
    setDraft(String(value));
    setBad(false);
  }, [value]);
  const commit = () => {
    const v = Math.round(Number(draft));
    if (!Number.isFinite(v) || v <= 0) {
      setBad(true); // rejected: zero or negative
      setDraft(String(value));
      return;
    }
    onCommit(v);
  };
  return (
    <input
      className={mergeClasses(s.num, user && s.user)}
      aria-label={label}
      aria-invalid={bad}
      value={draft}
      data-testid={testId}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  );
}

/** Construction programme: auto-derived default, user override (D-020). */
export function ProgrammeGroup({ compact = false }: { compact?: boolean }) {
  const s = useStyles();
  const results = useAppStore((st) => st.results);
  const override = useAppStore((st) => st.programmeOverride);
  const setOverride = useAppStore((st) => st.setProgrammeOverride);
  if (!results)
    return (
      <RibbonGroup label="Construction programme">
        <div className={s.status}>Deriving programme…</div>
      </RibbonGroup>
    );
  const { auto, effective } = results.baseline.programme;
  const current = override ?? effective;
  const check = override ? checkProgramme(override, auto) : { errors: [], warnings: [] };
  const set = (p: ProgrammeMonths) => setOverride(p);
  const isUser = override !== null;
  return (
    <RibbonGroup label="Construction programme">
      <div className={s.block}>
        {!compact && (
          <div className={s.row}>
            Excav.
            <NumField
              value={current.excavation}
              label="Excavation months"
              testId="ctl-prog-excavation"
              user={isUser}
              onCommit={(v) => set({ ...current, excavation: v })}
            />
            Struct.
            <NumField
              value={current.structure}
              label="Structure months"
              testId="ctl-prog-structure"
              user={isUser}
              onCommit={(v) => set({ ...current, structure: v })}
            />
            Finish.
            <NumField
              value={current.finishing}
              label="Finishing months"
              testId="ctl-prog-finishing"
              user={isUser}
              onCommit={(v) => set({ ...current, finishing: v })}
            />
          </div>
        )}
        <div className={s.row}>
          Total
          <NumField
            value={programmeTotal(current)}
            label="Total programme months"
            testId={compact ? 'ctl-prog-total-analysis' : 'ctl-prog-total'}
            user={isUser}
            onCommit={(v) => set(scaleProgramme(current, v))}
          />
          months ·{' '}
          <span className={s.status} data-testid={compact ? undefined : 'txt-prog-status'}>
            {isUser ? 'User-set' : `Auto: ${programmeTotal(auto)} months`}
          </span>
        </div>
        {!compact && check.warnings.length > 0 && <div className={s.warn}>{check.warnings[0]}</div>}
      </div>
      {!compact && isUser && (
        <RibbonButton
          testId="ctl-prog-reset"
          label="Reset to auto"
          tooltip={`Return to the derived ${programmeTotal(auto)}-month programme`}
          icon={<ArrowReset24Regular />}
          onClick={() => setOverride(null)}
        />
      )}
    </RibbonGroup>
  );
}

export function DayGroup() {
  const results = useAppStore((st) => st.results);
  const goToDay = useAppStore((st) => st.goToDay);
  const b = results?.baseline;
  return (
    <RibbonGroup label="Day">
      <RibbonButton
        testId="ctl-day-typical"
        label="Mid-month"
        tooltip="Show the 15th of the current construction month"
        icon={<CalendarDay24Regular />}
        onClick={() => goToDay(useAppStore.getState().scenario.constructionMonth, 15)}
      />
      {b?.dust.worstDay && (
        <RibbonButton
          testId="ctl-day-worst-dust"
          label="Worst dust day"
          tooltip={`Day with the highest 24 h site PM10 increment: month ${b.dust.worstDay.month}, day ${b.dust.worstDay.dayOfMonth}`}
          icon={<WeatherDuststorm24Regular />}
          onClick={() => goToDay(b.dust.worstDay!.month, b.dust.worstDay!.dayOfMonth)}
        />
      )}
      {b?.heat.hottestDay && (
        <RibbonButton
          testId="ctl-day-hottest"
          label="Hottest day"
          tooltip={`Day with the highest air temperature in the programme (${b.heat.hottestDay.taMax.toFixed(1)} °C)`}
          icon={<WeatherSunny24Regular />}
          onClick={() => goToDay(b.heat.hottestDay!.month, b.heat.hottestDay!.dayOfMonth)}
        />
      )}
    </RibbonGroup>
  );
}

export function PresetsGroup() {
  const s = useStyles();
  const preset = useAppStore((st) => st.preset);
  const apply = useAppStore((st) => st.applyPreset);
  return (
    <RibbonGroup label="Presets">
      <div className={s.block}>
        <label className={s.row} htmlFor="preset">
          Mitigation preset
        </label>
        <select
          id="preset"
          className={s.select}
          value={preset}
          data-testid="ctl-preset"
          onChange={(e) => e.target.value !== 'custom' && apply(e.target.value as PresetId)}
        >
          <option value="none">None (baseline)</option>
          <option value="cpcb">CPCB minimum dust measures</option>
          <option value="best">Best practice</option>
          <option value="netzero">Net-zero ready</option>
          <option value="custom" disabled>
            Custom
          </option>
        </select>
      </div>
      <RibbonButton
        testId="ctl-preset-best"
        label="Best practice"
        tooltip="Apply the best-practice preset"
        icon={<ShieldCheckmark24Regular />}
        onClick={() => apply('best')}
      />
    </RibbonGroup>
  );
}

export function ReportGroup({ onExport }: { onExport: () => void }) {
  return (
    <RibbonGroup label="Report">
      <RibbonButton
        testId="ctl-export-report"
        label="Export report"
        tooltip="Export the assessment report as PDF (Ctrl+E)"
        icon={<DocumentPdf24Regular />}
        onClick={onExport}
      />
    </RibbonGroup>
  );
}
