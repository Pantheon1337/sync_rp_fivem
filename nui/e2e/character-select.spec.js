import { test, expect } from '@playwright/test';

async function openShell(page) {
  await page.goto('/');
  await page.evaluate(() => {
    window.postMessage({ action: 'openCharacters' }, '*');
  });
}

test('SyncRP brand and character shell render in mock mode', async ({ page }) => {
  await openShell(page);
  await expect(page.getByText('SyncRP')).toBeVisible();
  await expect(page.getByText('Персонажи')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Создать' })).toBeVisible();
});

test('create form opens from list', async ({ page }) => {
  await openShell(page);
  await page.getByRole('button', { name: 'Создать' }).click();
  await expect(page.getByText('Новый персонаж')).toBeVisible();
  await expect(page.getByLabel('Имя')).toBeVisible();
});
