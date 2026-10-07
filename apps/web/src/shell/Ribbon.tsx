import { Slider, Tab, TabList, makeStyles } from '@fluentui/react-components';
import {
  ArrowNext24Regular,
  ArrowPrevious24Regular,
  PanelLeft24Regular,
  PanelRight24Regular,
  Pause24Regular,
  Play24Regular,
  Table24Regular,
  ZoomFit24Regular,
} from '@fluentui/react-icons';
import { formatHour, phaseForMonth, programmeTotal, toSchedule } from '@envelope/models';
import type { RibbonTab } from '../store/appStore';
import { useAppStore } from '../store/appStore';
import { shell } from '../theme/theme';
import { viewerCommands } from '../viewer/controller';
import { demoBuilding } from '../viewer/site';
import { DayGroup, PresetsGroup, ProgrammeGroup, ReportGroup } from './RibbonGroups';
import { RibbonButton, RibbonGroup } from './RibbonParts';

const useStyles = makeStyles({
  root: {
    flexShrink: 0,
    backgroundColor: shell.chrome,
    borderBottom: `1px solid ${shell.border}`,
  },
  tabs: { paddingLeft: '4px', height: '30px' },
  body: {
    height: '84px',
    display: 'flex',
    alignItems: 'stretch',
    backgroundColor: '#FFFFFF',
    borderTop: `1px solid ${shell.border}`,
    paddingTop: '2px',
    paddingBottom: '2px',
    paddingLeft: '4px',
    overflowX: 'auto',
  },
  empty: {
    alignSelf: 'center',
    paddingLeft: '8px',
    fontSize: '12px',
    color: shell.textSubtle,
  },
  sliderBlock: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '2px',
    paddingLeft: '6px',
    paddingRight: '6px',
    width: '196px',
  },
  sliderHead: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: shell.textMuted,
  },
  sliderValue: { color: '#242424', fontVariantNumeric: 'tabular-nums' },
  siteInfo: {
    alignSelf: 'center',
    paddingLeft: '6px',
    paddingRight: '10px',
    fontSize: '12px',
    lineHeight: '18px',
    color: shell.textMuted,
  },
});

const TABS: { id: RibbonTab; label: string }[] = [
  { id: 'project', label: 'Project' },
  { id: 'site', label: 'Site' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'mitigation', label: 'Mitigation' },
  { id: 'report', label: 'Report' },
];

function ProjectTab() {
  const ui = useAppStore((st) => st.ui);
  const toggleLeftPanel = useAppStore((st) => st.toggleLeftPanel);
  const toggleInspector = useAppStore((st) => st.toggleInspector);
  const toggleDataSheet = useAppStore((st) => st.toggleDataSheet);
  return (
    <>
      <ProgrammeGroup />
      <RibbonGroup label="Panels">
        <RibbonButton
          testId="ctl-toggle-left-panel"
          label="Layers"
          tooltip="Show or hide the Layers and Mitigation panel"
          icon={<PanelLeft24Regular />}
          pressed={ui.leftPanelOpen}
          onClick={toggleLeftPanel}
        />
        <RibbonButton
          testId="ctl-toggle-inspector"
          label="Inspector"
          tooltip="Show or hide the Inspector"
          icon={<PanelRight24Regular />}
          pressed={ui.inspectorOpen}
          onClick={toggleInspector}
        />
        <RibbonButton
          testId="ctl-toggle-datasheet"
          label="Data sheet"
          tooltip="Show or hide the Data sheet"
          icon={<Table24Regular />}
          pressed={ui.dataSheetOpen}
          onClick={toggleDataSheet}
        />
      </RibbonGroup>
    </>
  );
}

function AnalysisTab() {
  const s = useStyles();
  const { hour, constructionMonth } = useAppStore((st) => st.scenario);
  const playing = useAppStore((st) => st.ui.playing);
  const setHour = useAppStore((st) => st.setHour);
  const stepHour = useAppStore((st) => st.stepHour);
  const togglePlaying = useAppStore((st) => st.togglePlaying);
  const setConstructionMonth = useAppStore((st) => st.setConstructionMonth);
  const results = useAppStore((st) => st.results);
  const effective = results?.baseline.programme.effective;
  const total = effective ? programmeTotal(effective) : 24;
  const { phase } = phaseForMonth(constructionMonth, effective ? toSchedule(effective) : undefined);
  return (
    <>
      <RibbonGroup label="Hour of day">
        <RibbonButton
          testId="ctl-hour-prev"
          label="Previous"
          tooltip="Previous hour (←)"
          icon={<ArrowPrevious24Regular />}
          onClick={() => stepHour(-1)}
        />
        <RibbonButton
          testId="ctl-hour-play"
          label={playing ? 'Pause' : 'Play'}
          tooltip={playing ? 'Pause the hour animation' : 'Play through the day, one hour per second'}
          icon={playing ? <Pause24Regular /> : <Play24Regular />}
          pressed={playing}
          onClick={togglePlaying}
        />
        <RibbonButton
          testId="ctl-hour-next"
          label="Next"
          tooltip="Next hour (→)"
          icon={<ArrowNext24Regular />}
          onClick={() => stepHour(1)}
        />
        <div className={s.sliderBlock}>
          <div className={s.sliderHead}>
            <label htmlFor="hour-slider">Hour</label>
            <span className={s.sliderValue}>{formatHour(hour)} IST</span>
          </div>
          <Slider
            id="hour-slider"
            size="small"
            min={0}
            max={23}
            step={1}
            value={hour}
            data-testid="ctl-hour-slider"
            onChange={(_, d) => setHour(d.value)}
          />
        </div>
      </RibbonGroup>
      <RibbonGroup label="Construction programme">
        <div className={s.sliderBlock}>
          <div className={s.sliderHead}>
            <label htmlFor="month-slider">Month</label>
            <span className={s.sliderValue}>
              {Math.min(constructionMonth, total)} of {total} · {phase.label}
            </span>
          </div>
          <Slider
            id="month-slider"
            size="small"
            min={1}
            max={total}
            step={1}
            value={Math.min(constructionMonth, total)}
            data-testid="ctl-month-slider"
            onChange={(_, d) => setConstructionMonth(d.value)}
          />
        </div>
      </RibbonGroup>
      <ProgrammeGroup compact />
      <DayGroup />
    </>
  );
}

function SiteTab() {
  const s = useStyles();
  const geo = demoBuilding.site;
  return (
    <>
      <RibbonGroup label="View">
        <RibbonButton
          testId="ctl-fit-site"
          label="Fit to site"
          tooltip="Fit to site (F)"
          icon={<ZoomFit24Regular />}
          onClick={() => viewerCommands.fitToSite()}
        />
      </RibbonGroup>
      <RibbonGroup label="Site">
        <div className={s.siteInfo}>
          <div>{geo.label}</div>
          <div className={s.sliderValue}>
            {geo.lat.toFixed(5)}° N, {geo.lon.toFixed(5)}° E
          </div>
        </div>
      </RibbonGroup>
    </>
  );
}

export function Ribbon() {
  const s = useStyles();
  const tab = useAppStore((st) => st.ui.ribbonTab);
  const setRibbonTab = useAppStore((st) => st.setRibbonTab);
  return (
    <div className={s.root} data-testid="panel-ribbon">
      <TabList
        className={s.tabs}
        size="small"
        selectedValue={tab}
        onTabSelect={(_, d) => setRibbonTab(d.value as RibbonTab)}
      >
        {TABS.map((t) => (
          <Tab key={t.id} value={t.id} data-testid={`ctl-ribbon-tab-${t.id}`}>
            {t.label}
          </Tab>
        ))}
      </TabList>
      <div className={s.body} role="toolbar" aria-label={`${tab} ribbon`} data-testid="ribbon-body">
        {tab === 'project' && <ProjectTab />}
        {tab === 'site' && <SiteTab />}
        {tab === 'analysis' && <AnalysisTab />}
        {tab === 'mitigation' && <PresetsGroup />}
        {tab === 'report' && <ReportGroup onExport={() => useAppStore.getState().setReportOpen(true)} />}
      </div>
    </div>
  );
}
