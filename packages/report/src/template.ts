/** Deterministic narrative writer: used when no LLM is reachable, so export always works. */
import type { NarrativeSection, ReportPayload } from './payload';

const h = (p: ReportPayload, label: string) => p.headline.find((x) => x.label.startsWith(label));

export function templateNarrative(p: ReportPayload): NarrativeSection[] {
  const pm = h(p, 'PM10 emitted');
  const inc = h(p, 'P98 of 24 h PM10 increment');
  const exceed = h(p, 'Site-caused');
  const ts = h(p, 'Site surface temperature');
  const risk = h(p, 'Working hours at heat-stress risk');
  const ghg = h(p, 'Construction emissions');
  const per = h(p, 'Embodied intensity');
  const mits = p.mitigations.length ? p.mitigations.join('; ') : 'no mitigation measures';
  return [
    {
      id: 'executive',
      title: 'Executive summary',
      paragraphs: [
        `This report presents a screening-level assessment of construction-phase dust, heat and greenhouse-gas impacts for ${p.project.name} at ${p.project.site}. The assessment compares a baseline without mitigation against a mitigated scenario with the following measures: ${mits}.`,
        pm && inc
          ? `Site PM10 emissions over the construction programme are estimated at ${pm.baseline} ${pm.unit} in the baseline and ${pm.mitigated} ${pm.unit} with mitigation (${pm.deltaPct}). The 98th-percentile 24-hour PM10 increment at the site boundary, the statistic used by the NAAQS, is ${inc.baseline} ${inc.unit} in the baseline and ${inc.mitigated} ${inc.unit} with mitigation.`
          : 'Dust results are not available because weather data could not be loaded.',
        ghg && per
          ? `Construction-stage greenhouse-gas emissions (modules A1–A5) are estimated at ${ghg.baseline} ${ghg.unit} in the baseline and ${ghg.mitigated} ${ghg.unit} with mitigation, an intensity of ${per.mitigated} ${per.unit} of gross floor area.`
          : '',
        'Key indicators are summarised in Table 1. All comparisons with regulatory limits are indicative.',
      ].filter(Boolean),
    },
    {
      id: 'project',
      title: 'Project description',
      paragraphs: [
        `The project is a ${p.project.floors}-storey ${p.project.use} building with a ${p.project.structure} structure, a footprint of ${p.project.footprint} and a gross floor area of ${p.project.gfa}. The construction programme is ${p.project.programme} (${p.project.programmeSource}).`,
        'Material quantities and the vehicle movements derived from them are given in Table 2. Vehicle trips are calculated from quantities and vehicle capacities, not entered directly.',
      ],
    },
    {
      id: 'site',
      title: 'Site and baseline environment',
      paragraphs: [
        `The site lies at ${p.project.coordinates}. Hourly weather for the reference year was taken from the ERA5 reanalysis and background air quality from the CAMS global model, as summarised in Table 3.`,
        ...p.climate.slice(0, 1).map((c) => `The ${c.label.toLowerCase()} is ${c.value}.`),
      ],
    },
    {
      id: 'method',
      title: 'Methodology and data sources',
      paragraphs: [
        'Dust emissions follow the WRAP Fugitive Dust Handbook for general construction activity, AP-42 Section 13.2.4 for material handling, AP-42 Section 13.2.2 for haul traffic on unpaved roads, and a physically based wind-erosion scheme (Fécan, White, Marticorena and Bergametti). Dispersion uses a steady-state Gaussian plume with Pasquill–Turner stability classes and Briggs urban dispersion coefficients.',
        'Heat is assessed with a steady-state surface energy balance per grid cell, a simplified mean radiant temperature for a standing worker and the Universal Thermal Climate Index. Greenhouse-gas emissions cover modules A1–A5 of EN 15978 using ICE v3 emission factors and the CEA grid emission factor.',
        `Data sources and their fetch times are listed in Table 6. ${p.assumptionsUnverified} default parameters are marked as unverified in the assumptions register and should be confirmed before submission.`,
      ],
    },
    {
      id: 'dust',
      title: 'Dust impact assessment',
      paragraphs: [
        pm
          ? `Total PM10 emitted over the programme is ${pm.baseline} ${pm.unit} in the baseline and ${pm.mitigated} ${pm.unit} with mitigation. Concentrations at the site boundary and at sensitive receptors are given in Table 4.`
          : 'Dust results are not available.',
        exceed
          ? `The number of days on which site emissions are estimated to raise the 24-hour PM10 concentration above the NAAQS limit, on days when the background alone is below it, is ${exceed.baseline} in the baseline and ${exceed.mitigated} with mitigation at the most affected point.`
          : '',
      ].filter(Boolean),
    },
    {
      id: 'heat',
      title: 'Heat impact assessment',
      paragraphs: [
        ts
          ? `At the selected hour, the mean surface temperature of the cleared site is ${ts.baseline} ${ts.unit} in the baseline and ${ts.mitigated} ${ts.unit} with mitigation.`
          : 'Heat results are not available.',
        risk
          ? `Working hours with a UTCI above the strong heat-stress threshold total ${risk.baseline} ${risk.unit} in the baseline and ${risk.mitigated} ${risk.unit} with mitigation.`
          : '',
      ].filter(Boolean),
    },
    {
      id: 'ghg',
      title: 'Greenhouse-gas assessment',
      paragraphs: [
        ghg
          ? `Construction-stage emissions total ${ghg.baseline} ${ghg.unit} in the baseline and ${ghg.mitigated} ${ghg.unit} with mitigation. The breakdown by module and scope is given in Table 5.`
          : '',
      ].filter(Boolean),
    },
    {
      id: 'emp',
      title: 'Mitigation measures and Environmental Management Plan',
      paragraphs: [
        `The mitigated scenario includes: ${mits}. Responsibilities and monitoring for each measure are set out in Table 7.`,
      ],
    },
    {
      id: 'compliance',
      title: 'Indicative compliance matrix',
      paragraphs: [
        'Table 8 compares the project with the applicable requirements. The comparison is indicative and does not constitute a determination by a regulator.',
      ],
    },
    {
      id: 'monitoring',
      title: 'Monitoring plan',
      paragraphs: [
        'Continuous PM10 and PM2.5 monitoring at the site boundary on the downwind side, daily inspection of dust controls, and a record of water used for sprinkling are recommended. Worker heat stress should be tracked with a site wet-bulb globe temperature meter during the hot season.',
      ],
    },
    {
      id: 'limitations',
      title: 'Limitations and uncertainty',
      paragraphs: p.limitations,
    },
  ];
}
