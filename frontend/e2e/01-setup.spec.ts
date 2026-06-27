import { test, expect } from '@playwright/test';

test.describe('試合設定画面', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('試合設定画面が表示される', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /試合設定/ })).toBeVisible();
    await expect(page.getByRole('button', { name: '試合開始' })).toBeVisible();
  });

  test('デフォルトは7回制ボタンがアクティブ', async ({ page }) => {
    const btn7 = page.getByRole('button', { name: '7回制' });
    // btn-primaryクラスが付いているか
    await expect(btn7).toHaveClass(/btn-primary/);
  });

  test('9回制に切り替えできる', async ({ page }) => {
    await page.getByRole('button', { name: '9回制' }).click();
    const btn9 = page.getByRole('button', { name: '9回制' });
    await expect(btn9).toHaveClass(/btn-primary/);
    // 7回制はghost系クラスに戻っているか
    await expect(page.getByRole('button', { name: '7回制' })).not.toHaveClass(/btn-primary/);
  });

  test('コールドゲーム設定の入力フィールドが読める', async ({ page }) => {
    // コールドゲームが有効な状態で発動イニングと得点差が読める
    const inningInput = page.locator('input[type="number"]').first();
    await expect(inningInput).toBeVisible();
    // テキストカラーが白系であること（コントラスト確認）
    await expect(inningInput).toHaveCSS('color', 'rgb(255, 255, 255)');
  });

  test('得点差フィールドの値が表示できる', async ({ page }) => {
    const inputs = page.locator('input[type="number"]');
    const coldDiffInput = inputs.nth(1);
    await expect(coldDiffInput).toHaveValue('10');
    // 白文字であること
    await expect(coldDiffInput).toHaveCSS('color', 'rgb(255, 255, 255)');
  });

  test('試合開始で試合画面に遷移する', async ({ page }) => {
    await page.getByRole('button', { name: '試合開始' }).click();
    await expect(page.getByText('回')).toBeVisible();
    // イニング表示（1回）
    await expect(page.locator('text=1').first()).toBeVisible();
  });
});
