import { test, expect } from '@playwright/test';

async function startGame(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: '試合開始' }).click();
  await expect(page.getByText('回')).toBeVisible();
}

test.describe('投手記録', () => {
  test('投手パネルが表示される', async ({ page }) => {
    await startGame(page);
    // PitcherPanelのラベル（投球数）が表示されている
    await expect(page.getByText('投球数')).toBeVisible();
    await expect(page.getByRole('button', { name: '交代' })).toBeVisible();
  });

  test('投球タブで球種とストライクを記録できる', async ({ page }) => {
    await startGame(page);
    // 投球タブはデフォルト表示
    await expect(page.getByRole('button', { name: /投球/ })).toBeVisible();
    // 直球を選択してストライクを記録
    await page.getByRole('button', { name: '直球' }).click();
    await page.getByRole('button', { name: 'ストライク' }).click();
    // 投球ログにSが表示される
    await expect(page.getByText('S').first()).toBeVisible();
  });

  test('投球数が累積される', async ({ page }) => {
    await startGame(page);
    await page.getByRole('button', { name: 'ボール' }).click();
    await page.getByRole('button', { name: 'ストライク' }).click();
    await page.getByRole('button', { name: 'ファウル' }).click();
    // 投球数タブに3が表示される
    await expect(page.getByText(/投球 \(3\)/)).toBeVisible();
  });

  test('投手交代ダイアログが開く', async ({ page }) => {
    await startGame(page);
    await page.getByRole('button', { name: '交代' }).click();
    await expect(page.getByText('投手交代')).toBeVisible();
    await expect(page.getByRole('button', { name: 'キャンセル' })).toBeVisible();
  });

  test('投手交代で投手名が変わる', async ({ page }) => {
    await startGame(page);
    const initialPitcherText = await page.locator('[class*="name"]').first().textContent();
    await page.getByRole('button', { name: '交代' }).click();
    // リストの最初の選手を選択
    const playerBtns = page.locator('[class*="playerBtn"]');
    await playerBtns.first().click();
    await page.getByRole('button', { name: '交代する' }).click();
    // ダイアログが閉じる
    await expect(page.getByText('投手交代')).not.toBeVisible();
  });
});
