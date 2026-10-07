import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  makeStyles,
} from '@fluentui/react-components';
import { CheckmarkCircle16Regular } from '@fluentui/react-icons';
import { useState } from 'react';
import { buildPayload } from '../analysis/payload';
import type { ImpactLayerId } from '../store/appStore';
import { useAppStore } from '../store/appStore';
import { shell } from '../theme/theme';
import { viewerCommands } from '../viewer/controller';

const useStyles = makeStyles({
  surface: { width: '880px', maxWidth: '95vw' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' },
  steps: { listStyle: 'none', padding: 0, margin: '8px 0', fontSize: '12px' },
  step: { display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 0', color: shell.textSubtle },
  done: { color: '#237A45' },
  active: { color: '#242424', fontWeight: 600 },
  preview: { width: '100%', height: '52vh', border: `1px solid ${shell.border}` },
  meta: { fontSize: '12px', color: shell.textMuted, margin: '6px 0' },
  err: { fontSize: '12px', color: '#B3261E' },
});

const STEPS = [
  'Building payload',
  'Capturing maps',
  'Writing narrative',
  'Validating figures',
  'Rendering PDF',
];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function ReportDialog() {
  const s = useStyles();
  const open = useAppStore((st) => st.ui.reportOpen);
  const setOpen = useAppStore((st) => st.setReportOpen);
  const results = useAppStore((st) => st.results);
  const projectName = useAppStore((st) => st.projectName);
  const [title, setTitle] = useState('Environmental Sustainability Assessment Report');
  const [company, setCompany] = useState('Demo Developers Pvt. Ltd.');
  const [preparedBy, setPreparedBy] = useState('Envelope assessment team');
  const [step, setStep] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<{ id: string; narrativeSource: string; dropped: number } | null>(null);

  const run = async () => {
    const st = useAppStore.getState();
    if (!st.results) return;
    setError(null);
    setReport(null);
    try {
      setStep(0);
      const payload = buildPayload({
        results: st.results,
        mitigations: st.mitigations,
        assumptions: st.assumptions,
        siteData: st.siteData,
        projectName,
        title,
        company,
        preparedBy,
      });
      setStep(1);
      const prev = { layer: st.impactLayer, show: st.showScenario, metric: st.dustMetric };
      st.setDustMetric('day');
      if (st.showScenario !== 'mitigated') st.toggleShowScenario();
      viewerCommands.fitToSite();
      await wait(1400);
      const images: Record<string, string> = {};
      const keys: [string, ImpactLayerId][] = [
        ['dust', 'dust'],
        ['heat', 'ts'],
        ['utci', 'utci'],
        ['ghg', 'ghg'],
      ];
      for (const [key, id] of keys) {
        useAppStore.getState().setImpactLayer(id);
        await wait(900);
        const img = viewerCommands.capture();
        if (img) images[key] = img;
      }
      const after = useAppStore.getState();
      after.setImpactLayer(prev.layer);
      after.setDustMetric(prev.metric);
      if (after.showScenario !== prev.show) after.toggleShowScenario();
      setStep(2);
      const req = fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload, images }),
      });
      const res = await req;
      setStep(3);
      if (!res.ok) throw new Error(`Report service returned ${res.status}`);
      const body = (await res.json()) as { id: string; narrativeSource: string; dropped: number };
      setStep(4);
      await wait(300);
      setReport(body);
      setStep(5);
    } catch (e) {
      setError((e as Error).message);
      setStep(-1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(_, d) => setOpen(d.open)}>
      <DialogSurface className={s.surface} data-testid="dialog-report">
        <DialogBody>
          <DialogTitle>Export assessment report</DialogTitle>
          <DialogContent>
            <div className={s.grid}>
              <Field label="Report title">
                <Input value={title} onChange={(_, d) => setTitle(d.value)} data-testid="ctl-report-title" />
              </Field>
              <Field label="Company">
                <Input
                  value={company}
                  onChange={(_, d) => setCompany(d.value)}
                  data-testid="ctl-report-company"
                />
              </Field>
              <Field label="Prepared by">
                <Input
                  value={preparedBy}
                  onChange={(_, d) => setPreparedBy(d.value)}
                  data-testid="ctl-report-preparedby"
                />
              </Field>
            </div>
            <div className={s.meta}>
              Scenario: baseline and mitigated, PDF (A4). Numbers, tables and maps come from the model
              results; the narrative is checked so that every figure in it appears in the tables.
            </div>
            {step >= 0 && (
              <ul className={s.steps} data-testid="report-steps">
                {STEPS.map((label, i) => (
                  <li key={label} className={`${s.step} ${i < step ? s.done : i === step ? s.active : ''}`}>
                    {i < step ? <CheckmarkCircle16Regular /> : <span style={{ width: 16 }} />}
                    {label}
                    {i === step && step < 5 ? '…' : ''}
                  </li>
                ))}
              </ul>
            )}
            {error && <div className={s.err}>Export failed: {error}</div>}
            {report && (
              <>
                <div className={s.meta} data-testid="report-ready">
                  Narrative: {report.narrativeSource}. Sentences removed by the figure check: {report.dropped}
                  .
                </div>
                <iframe className={s.preview} title="Report preview" src={`/api/report/${report.id}.html`} />
              </>
            )}
          </DialogContent>
          <DialogActions>
            {report && (
              <Button
                as="a"
                href={`/api/report/${report.id}.pdf`}
                target="_blank"
                appearance="primary"
                data-testid="ctl-report-download"
              >
                Open PDF
              </Button>
            )}
            <Button
              appearance={report ? 'secondary' : 'primary'}
              disabled={!results || (step >= 0 && step < 5)}
              onClick={run}
              data-testid="ctl-report-generate"
            >
              {report ? 'Generate again' : 'Generate report'}
            </Button>
            <Button onClick={() => setOpen(false)} data-testid="ctl-report-close">
              Close
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
