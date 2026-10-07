import type { NarrativeSection, ReportImages, ReportPayload } from '@envelope/report';
import { SECTION_IDS, renderReportHtml, templateNarrative, validateNarrative } from '@envelope/report';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { env } from './env';

const REPORT_DIR = resolve(env.cacheDir, 'reports');

const SYSTEM_PROMPT = `You are a senior Indian environmental consultant writing a construction-phase environmental assessment for submission to a regulator.
Write formal, concise prose in the third person. Use ONLY numbers that appear in the JSON payload, exactly as written there, with their units. Do not compute new numbers, totals, differences or percentages.
Refer to tables by number (Table 1 key indicators, Table 2 logistics, Table 3 climate, Table 4 receptors, Table 5 GHG, Table 6 data sources, Table 7 EMP, Table 8 compliance).
Say "indicative" for any comparison with limits. Never say "compliant" or "guaranteed". No marketing language. Do not mention AI or language models.
Return JSON {"sections":[{"id","title","paragraphs":[...]}]} with these sections in order: ${SECTION_IDS.map((s) => `${s.id} (${s.title})`).join(', ')}. Two or three short paragraphs per section.`;

const SECTIONS_SCHEMA = {
  type: 'OBJECT',
  properties: {
    sections: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING', enum: SECTION_IDS.map((s) => s.id) },
          title: { type: 'STRING' },
          paragraphs: { type: 'ARRAY', items: { type: 'STRING' } },
        },
        required: ['id', 'title', 'paragraphs'],
      },
    },
  },
  required: ['sections'],
};

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
}

function parseSections(text: string): NarrativeSection[] {
  const json = JSON.parse(text.replace(/^```json\s*|```$/g, '')) as { sections?: NarrativeSection[] };
  const secs = (json.sections ?? []).filter(
    (s) => s && typeof s.id === 'string' && Array.isArray(s.paragraphs),
  );
  if (secs.length < 5) throw new Error('too few sections');
  return secs.map((s) => ({ id: s.id, title: s.title ?? s.id, paragraphs: s.paragraphs.map(String) }));
}

async function geminiCall(model: string, userText: string): Promise<NarrativeSection[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.geminiApiKey ?? '' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: userText }] }],
      generationConfig: {
        temperature: 0.25,
        responseMimeType: 'application/json',
        responseSchema: SECTIONS_SCHEMA,
      },
    }),
  });
  if (!res.ok) throw new Error(`gemini ${model} ${res.status}`);
  const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return parseSections(body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '');
}

/** Model from env first, then a stable fallback model. */
async function gemini(userText: string): Promise<NarrativeSection[]> {
  // Models available to the key on 2026-10-07; 2.5 Flash is closed to new keys (404).
  const models = [
    ...new Set([
      env.geminiModel ?? 'gemini-3.5-flash',
      'gemini-3.5-flash',
      'gemini-3-flash-preview',
      'gemini-flash-latest',
    ]),
  ];
  let last: unknown = new Error('no model');
  for (const m of models) {
    try {
      return await geminiCall(m, userText);
    } catch (err) {
      last = err;
      console.warn('[report]', (err as Error).message);
    }
  }
  throw last;
}

async function groq(userText: string): Promise<NarrativeSection[]> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.groqApiKey ?? ''}` },
    body: JSON.stringify({
      model: env.groqModel ?? 'openai/gpt-oss-120b',
      temperature: 0.25,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userText },
      ],
    }),
  });
  if (!res.ok) throw new Error(`groq ${res.status}`);
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return parseSections(body.choices?.[0]?.message?.content ?? '');
}

/** Gemini → Groq; null when no LLM is reachable (CLAUDE.md §3). */
async function llm(userText: string): Promise<{ sections: NarrativeSection[]; source: string } | null> {
  if (env.geminiApiKey) {
    try {
      return { sections: await withTimeout(gemini(userText), 90_000), source: 'Gemini' };
    } catch (err) {
      console.warn('[report] Gemini failed:', (err as Error).message);
    }
  }
  if (env.groqApiKey) {
    try {
      return { sections: await withTimeout(groq(userText), 40_000), source: 'Groq' };
    } catch (err) {
      console.warn('[report] Groq failed:', (err as Error).message);
    }
  }
  return null;
}

/**
 * LLM narrative checked by the number validator (HANDOVER Appendix B): on failure, one retry
 * with the error list; anything still failing is dropped and logged. No LLM → template writer.
 */
async function narrative(payload: ReportPayload) {
  const first = await llm(JSON.stringify(payload));
  if (!first) {
    return {
      ...validateNarrative(templateNarrative(payload), payload),
      source: 'Deterministic template',
      retried: false,
    };
  }
  let checked = validateNarrative(first.sections, payload);
  let retried = false;
  if (checked.dropped.length) {
    retried = true;
    const errors = checked.dropped.map((d) => `- "${d.sentence}" (${d.reason})`).join('\n');
    const prompt = [
      JSON.stringify(payload),
      'Your previous draft contained sentences with numbers or wording that are not allowed:',
      errors,
      'Rewrite all sections using only numbers that appear in the payload, exactly as written.',
    ].join('\n\n');
    const second = await llm(prompt);
    if (second) {
      const again = validateNarrative(second.sections, payload);
      if (again.dropped.length <= checked.dropped.length) checked = again;
    }
  }
  for (const d of checked.dropped) console.warn(`[report] dropped sentence (${d.reason}): ${d.sentence}`);
  return { ...checked, source: `${first.source}, figures validated`, retried };
}

export async function buildReport(payload: ReportPayload, images: ReportImages) {
  const checked = await narrative(payload);
  // Any section the LLM omitted, or that validation emptied, comes from the template writer.
  const fallback = templateNarrative(payload);
  const merged = SECTION_IDS.map(({ id, title }) => {
    const s = checked.sections.find((x) => x.id === id);
    return s && s.paragraphs.length ? { ...s, title } : fallback.find((x) => x.id === id)!;
  });
  const html = renderReportHtml(payload, merged, images, checked.source);
  const id = randomUUID();
  await mkdir(REPORT_DIR, { recursive: true });
  await writeFile(resolve(REPORT_DIR, `${id}.html`), html, 'utf8');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const name = payload.project.name.replace(/[<>&]/g, '');
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `<div style="font-size:7pt;color:#888;width:100%;padding:0 16mm;font-family:Segoe UI,Arial">${name} · v${payload.meta.version}</div>`,
      footerTemplate:
        '<div style="font-size:7pt;color:#888;width:100%;padding:0 16mm;text-align:right;font-family:Segoe UI,Arial">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
      margin: { top: '18mm', bottom: '20mm', left: '16mm', right: '16mm' },
    });
    await writeFile(resolve(REPORT_DIR, `${id}.pdf`), pdf);
  } finally {
    await browser.close();
  }
  return { id, narrativeSource: checked.source, dropped: checked.dropped.length, retried: checked.retried };
}

export async function readReport(id: string, ext: 'pdf' | 'html'): Promise<Buffer | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  try {
    return await readFile(resolve(REPORT_DIR, `${id}.${ext}`));
  } catch {
    return null;
  }
}
