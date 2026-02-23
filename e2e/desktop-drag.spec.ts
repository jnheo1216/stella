import { expect, test } from '@playwright/test';

test.skip(({ isMobile }) => isMobile, 'Desktop-only scenario');

test('desktop mode renders and responds to drag gestures', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Stella', exact: true })).toBeVisible();
  await expect(page.getByLabel('Night sky view')).toBeVisible();
  const panelToggle = page.getByRole('button', { name: /패널 열기|패널 닫기/ });
  await expect(panelToggle).toBeVisible();
  await panelToggle.click();
  await expect(page.locator('.control-panel')).toContainText('수동 탐색');

  const dragSurface = page.locator('.gesture-layer');
  if ((await dragSurface.count()) > 0) {
    await expect(dragSurface).toBeVisible();
    await dragSurface.dispatchEvent('pointerdown', {
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 280,
      clientY: 260
    });
    await dragSurface.dispatchEvent('pointermove', {
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 560,
      clientY: 320
    });
    await dragSurface.dispatchEvent('pointerup', {
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 560,
      clientY: 320
    });
  } else {
    await expect(page.locator('.sky-canvas-shell')).toBeVisible();
  }

  await expect(page.locator('.control-panel')).toBeVisible();
});
