import { test, expect } from '@playwright/test';

async function startGame(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /新しい試合/ }).click();
  await page.getByRole('button', { name: '試合開始' }).click();
  await expect(page.locator('text=回')).toBeVisible();
}

test.describe('投手記録', () => {
  test('投手パネルが表示される', async ({ page }) => {
    await startGame(page);
    await expect(page.getByText('投球数')).toBeVisible();
    await expect(page.getByRole('button', { name: '交代' })).toBeVisible();
  });

  test('投球タブで球種とストライクを記録できる', async ({ page }) => {
    await startGame(page);
    await expect(page.getByRole('button', { name: /投球/ })).toBeVisible();
    await page.getByRole('button', { name: '直球' }).click();
    await page.getByRole('button', { name: 'ストライク' }).click();
    await expect(page.getByText('S').first()).toBeVisible();
  });

  test('投球数が累積される', async ({ page }) => {
    await startGame(page);
    await page.getByRole('button', { name: 'ボール' }).click();
    await page.getByRole('button', { name: 'ストライク' }).click();
    await page.getByRole('button', { name: 'ファウル' }).click();
    await expect(page.getByText(/投球 \(3\)/)).toBeVisible();
  });

  test('投手交代ダイアログが開く', async ({ page }) => {
    await startGame(page);
    await page.getByRole('button', { name: '交代' }).click();
    await expect(page.getByText('投手交代')).toBeVisible();
    await expect(page.getByRole('button', { name: 'キャンセル' })).toBeVisible();
  });

  test('投手交代で選手を選んで確定できる', async ({ page }) => {
    await startGame(page);
    await page.getByRole('button', { name: '交代' }).click();
    await page.locator('[class*="playerBtn"]').first().click();
    await page.getByRole('button', { name: '交代する' }).click();
    await expect(page.getByText('投手交代')).not.toBeVisible();
  });
});

test.describe('観戦コード', () => {
  test('試合開始後に観戦コードが表示できる', async ({ page }) => {
    await startGame(page);
    // ShareCodeボタンをクリックして展開
    await page.locator('[class*="statusBtn"]').click();
    await expect(page.getByText('観戦コード')).toBeVisible();
    await expect(page.getByRole('button', { name: /URLコピー/ })).toBeVisible();
  });
});
