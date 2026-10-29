import { test, expect } from '@playwright/test';

async function openShell(page, meta = {}) {
  await page.goto('/');
  if (meta.emptyRoster) {
    await page.evaluate(() => {
      window.__syncNuiMock?.resetCharacters([]);
    });
  }
  await page.evaluate((m) => {
    window.postMessage(
      {
        action: 'openCharacters',
        isNewAccount: !!m.isNewAccount,
        mustSelect: !!m.mustSelect,
        forceCreate: !!m.forceCreate,
      },
      '*',
    );
  }, meta);
}

test('SyncRP brand and character shell render in mock mode', async ({ page }) => {
  await openShell(page);
  await expect(page.getByText('SyncRP')).toBeVisible();
  await expect(page.getByText('Вход в город')).toBeVisible();
  await expect(page.getByText('Персонажи')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Создать' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Войти' })).toBeVisible();
});

test('create form opens from list', async ({ page }) => {
  await openShell(page);
  await page.getByRole('button', { name: 'Создать' }).click();
  await expect(page.getByText('Новый персонаж')).toBeVisible();
  await expect(page.getByLabel('Имя')).toBeVisible();
});

test('registration mode forces create for new account', async ({ page }) => {
  await openShell(page, {
    emptyRoster: true,
    isNewAccount: true,
    mustSelect: true,
    forceCreate: true,
  });
  await expect(page.getByText('Регистрация персонажа')).toBeVisible();
  await expect(page.getByText('Создание персонажа')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Создать и войти' })).toBeVisible();
  await expect(page.getByText(/Закрыть экран нельзя/)).toBeVisible();
});
