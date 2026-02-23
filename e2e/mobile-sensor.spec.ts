import { expect, test } from '@playwright/test';

test.skip(({ isMobile }) => !isMobile, 'Mobile-only scenario');

test('mobile shows sensor permission and fallback controls', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Stella', exact: true })).toBeVisible();
  await expect(page.getByLabel('Night sky view')).toBeVisible();
  const permissionGate = page.locator('.permission-gate');
  if ((await permissionGate.count()) > 0) {
    await expect(permissionGate).toBeVisible();
    await expect(permissionGate.getByRole('button', { name: '센서 권한 요청' })).toBeVisible();
  }

  const dragSurface = page.locator('.gesture-layer');
  if ((await dragSurface.count()) > 0) {
    await dragSurface.dispatchEvent('pointerdown', {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 220,
      clientY: 320
    });
    await dragSurface.dispatchEvent('pointermove', {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 260,
      clientY: 360
    });
    await dragSurface.dispatchEvent('pointerup', {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 260,
      clientY: 360
    });
  } else {
    await expect(page.locator('.sky-canvas-shell')).toBeVisible();
  }

  const panelToggle = page.getByRole('button', { name: /패널 열기|패널 닫기/ });
  await expect(panelToggle).toBeVisible();
  await panelToggle.click();
  await expect(page.locator('.control-panel')).toBeVisible();
});
