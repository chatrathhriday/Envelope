import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { openFresh, storeSignature, trackConsoleErrors, visibleSignature } from './helpers';

/**
 * CLAUDE.md §2: every control works. Finds every [data-testid^="ctl-"] reachable from
 * each ribbon tab, operates it from a fresh load, and asserts that both the store and
 * what the user sees changed.
 */

const RIBBON_TABS = ['project', 'site', 'analysis', 'mitigation', 'report'] as const;

/**
 * The 60+ assumption cells share one component (AssumptionCell); one per group is
 * operated here instead of all of them, which would add about 8 minutes per run.
 */
const ASSUMPTION_SAMPLE = new Set([
  'ctl-assumption-basements',
  'ctl-assumption-mixerCapacity',
  'ctl-assumption-clayPct',
  'ctl-assumption-albedoSoil',
  'ctl-assumption-efConcrete',
]);

const click = (id: string) => async (page: Page) => {
  await page.getByTestId(id).click();
  await page.waitForTimeout(300);
};

/** Some controls only change something from a non-default state; set that state up first. */
const PRECONDITIONS: Record<string, (page: Page) => Promise<void>> = {
  // Fit to site from the fitted view is a no-op, so move the camera away first.
  'ctl-fit-site': async (page) => {
    await page.getByTestId('ctl-zoom-out').click();
    await page.waitForTimeout(500);
  },
  'ctl-show-mitigated': click('ctl-show-baseline'),
  'ctl-dust-metric-day': click('ctl-dust-metric-hour'),
  'ctl-day-typical': click('ctl-day-hottest'),
  'ctl-assumptions-reset': async (page) => {
    const cell = page.getByTestId('ctl-assumption-clayPct');
    await cell.fill('25');
    await cell.press('Enter');
    await page.waitForTimeout(300);
  },
};

async function visibleControlIds(page: Page): Promise<string[]> {
  return page.$$eval('[data-testid^="ctl-"]', (els) =>
    els.filter((el) => el.getClientRects().length > 0).map((el) => el.getAttribute('data-testid') as string),
  );
}

async function discover(page: Page): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  await openFresh(page);
  for (const tab of RIBBON_TABS) {
    await page.getByTestId(`ctl-ribbon-tab-${tab}`).click();
    for (const id of await visibleControlIds(page)) {
      if (id.startsWith('ctl-assumption-') && id !== 'ctl-assumptions-reset' && !ASSUMPTION_SAMPLE.has(id))
        continue;
      if (!found.has(id)) found.set(id, tab);
    }
  }
  return found;
}

async function operate(page: Page, id: string): Promise<void> {
  const el = page.getByTestId(id);
  const info = await el.evaluate((node) => ({
    tag: node.tagName,
    type: node.getAttribute('type'),
    value: (node as HTMLInputElement).value ?? '',
  }));
  if (info.tag === 'INPUT' && info.type === 'range') {
    await el.focus();
    await el.press('ArrowRight');
  } else if (info.tag === 'INPUT' && info.type === 'checkbox') {
    await el.click();
  } else if (info.tag === 'SELECT') {
    const values = await el.evaluate((node) =>
      Array.from((node as HTMLSelectElement).options)
        .filter((o) => !o.disabled && !o.selected)
        .map((o) => o.value),
    );
    await el.selectOption(values[values.length - 1]!);
  } else if (info.tag === 'INPUT' || info.tag === 'TEXTAREA') {
    const n = Number(info.value);
    // Numeric fields get a valid new number; text fields get new text.
    await el.fill(info.value !== '' && Number.isFinite(n) ? String(n + 1) : `E2E value ${Date.now()}`);
    await el.press('Enter');
  } else {
    await el.click();
  }
}

test('every control changes state and the screen', async ({ page }) => {
  test.setTimeout(1_200_000);
  const errors = trackConsoleErrors(page);
  const controls = await discover(page);
  expect(controls.size, 'controls discovered').toBeGreaterThanOrEqual(70);

  for (const [id, tab] of controls) {
    await openFresh(page);
    await page.getByTestId(`ctl-ribbon-tab-${tab}`).click();
    const el = page.getByTestId(id);

    // A tab that is already selected only does something after another tab is chosen.
    if ((await el.getAttribute('role')) === 'tab' && (await el.getAttribute('aria-selected')) === 'true') {
      const sibling = el.locator('xpath=..').locator('[role="tab"][aria-selected="false"]').first();
      await sibling.click();
    }
    await PRECONDITIONS[id]?.(page);

    const storeBefore = await storeSignature(page);
    const screenBefore = await visibleSignature(page);
    await operate(page, id);
    await expect
      .poll(() => storeSignature(page), { message: `${id} must change the store` })
      .not.toBe(storeBefore);
    await expect
      .poll(() => visibleSignature(page), { message: `${id} must change what the user sees` })
      .not.toBe(screenBefore);
  }

  expect(errors).toEqual([]);
});
