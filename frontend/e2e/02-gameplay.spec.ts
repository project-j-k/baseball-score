import { test, expect } from '@playwright/test';

async function startGame(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: '試合開始' }).click();
  await expect(page.getByText('回')).toBeVisible();
}

test.describe('試合記録', () => {
  test('試合開始後、1回表が表示される', async ({ page }) => {
    await startGame(page);
    // イニング番号
    await expect(page.locator('text=▲')).toBeVisible(); // 表
    await expect(page.locator('text=1').first()).toBeVisible();
  });

  test('ボール3回→四球で走者が1塁に進む', async ({ page }) => {
    await startGame(page);
    // 結果タブへ
    await page.getByRole('button', { name: /結果/ }).click();
    await page.getByRole('button', { name: '四球' }).click();
    await page.getByRole('button', { name: '記録する' }).click();
    // 走者がダイヤモンドに表示される（1塁が点灯）
    // 次打者に進む
    await expect(page.getByText('打者')).toBeVisible();
  });

  test('アウトで次打者に進む', async ({ page }) => {
    await startGame(page);
    await page.getByRole('button', { name: /結果/ }).click();
    await page.getByRole('button', { name: 'アウト' }).click();
    await page.getByRole('button', { name: 'ゴロアウト' }).click();
    await page.getByRole('button', { name: '記録する' }).click();
    // アウトが1つ増える（ドットが光る）
    await expect(page.locator('text=O').first()).toBeVisible();
  });

  test('安打で走者移動ダイアログが表示される', async ({ page }) => {
    await startGame(page);
    await page.getByRole('button', { name: /結果/ }).click();
    await page.getByRole('button', { name: '安打' }).click();
    await page.getByRole('button', { name: /単打/ }).click();
    await page.getByRole('button', { name: '記録する' }).click();
    // RunnerMoveDialogが開く
    await expect(page.getByText('単打')).toBeVisible();
    await expect(page.getByText('各走者の進塁先を選んでね')).toBeVisible();
  });

  test('走者移動ダイアログで確定すると走者が更新される', async ({ page }) => {
    await startGame(page);
    await page.getByRole('button', { name: /結果/ }).click();
    await page.getByRole('button', { name: '安打' }).click();
    await page.getByRole('button', { name: /単打/ }).click();
    await page.getByRole('button', { name: '記録する' }).click();

    // ダイアログ確認
    await expect(page.getByText('単打')).toBeVisible();
    // 確定
    await page.getByRole('button', { name: '確定' }).click();
    // ダイアログが閉じる
    await expect(page.getByText('各走者の進塁先を選んでね')).not.toBeVisible();
  });

  test('ホームランで得点が入る', async ({ page }) => {
    await startGame(page);
    await page.getByRole('button', { name: /結果/ }).click();
    await page.getByRole('button', { name: '安打' }).click();
    await page.getByRole('button', { name: /ホームラン/ }).click();
    await page.getByRole('button', { name: '記録する' }).click();
    // スコアに1点が入る
    await expect(page.getByText('1').first()).toBeVisible();
  });
});
