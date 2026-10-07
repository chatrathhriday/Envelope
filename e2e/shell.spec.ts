import { expect, test } from '@playwright/test';
import { openFresh, trackConsoleErrors } from './helpers';

test.describe('app shell', () => {
  test('loads every shell region with no console errors', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await openFresh(page);
    for (const id of [
      'panel-titlebar',
      'panel-ribbon',
      'panel-left',
      'panel-viewport',
      'panel-inspector',
      'panel-datasheet',
      'panel-statusbar',
    ]) {
      await expect(page.getByTestId(id), id).toBeVisible();
    }
    await expect(page.getByLabel('Envelope', { exact: true })).toHaveText('Envelope');
    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
  });

  test('arrow keys step the hour and the status bar follows', async ({ page }) => {
    await openFresh(page);
    await expect(page.getByTestId('status-hour')).toHaveText('14:00 IST');
    await page.locator('body').press('ArrowRight');
    await expect(page.getByTestId('status-hour')).toHaveText('15:00 IST');
    await page.locator('body').press('ArrowLeft');
    await page.locator('body').press('ArrowLeft');
    await expect(page.getByTestId('status-hour')).toHaveText('13:00 IST');
  });

  test('project name is editable and survives a reload', async ({ page }) => {
    await openFresh(page);
    const name = page.getByTestId('ctl-project-name');
    await name.fill('Sector 65 tower');
    await name.press('Enter');
    await expect(page).toHaveTitle('Sector 65 tower · Envelope');
    await page.reload();
    await expect(page.getByTestId('ctl-project-name')).toHaveValue('Sector 65 tower');
  });

  test('help dialog opens and closes', async ({ page }) => {
    await openFresh(page);
    await page.getByTestId('ctl-help').click();
    await expect(page.getByTestId('dialog-help')).toBeVisible();
    await page.getByTestId('ctl-help-close').click();
    await expect(page.getByTestId('dialog-help')).toBeHidden();
  });

  test('visual snapshot of the shell', async ({ page }) => {
    await openFresh(page);
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot('shell.png');
  });
});
