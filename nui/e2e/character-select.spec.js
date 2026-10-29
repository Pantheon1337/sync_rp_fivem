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
  await expect(page.getByRole('button', { name: 'Далее: внешность' })).toBeVisible();
  await expect(page.getByText(/чат \(T\) недоступен/i)).toBeVisible();
});

test('appearance editor opens from NUI message', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.postMessage(
      {
        action: 'openAppearance',
        character: {
          id: 9,
          firstName: 'Анна',
          lastName: 'Смирнова',
          gender: 'female',
        },
        appearance: null,
      },
      '*',
    );
  });
  await expect(page.getByText('Редактор персонажа')).toBeVisible();
  await expect(page.getByText('Внешность')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Сохранить и войти' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Волосы' })).toBeVisible();
  await expect(page.getByText(/плитки стилей/i)).toBeVisible();
  await page.getByRole('button', { name: 'Волосы' }).click();
  await expect(page.getByText('Причёска')).toBeVisible();
  await expect(page.getByText('· всего 80')).toBeVisible();
  // Many hair tiles across pages (not a tiny 2–3 button set)
  await expect(page.getByRole('button', { name: 'Далее →' }).first()).toBeVisible();
  await expect(page.locator('input[type="range"]')).toHaveCount(0);
});
