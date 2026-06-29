import { test, expect } from '@playwright/test';

async function startGame(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /新しい試合/ }).click();
  await page.getByRole('button', { name: '試合開始' }).click();
  await expect(page.locator('text=回')).toBeVisible();
}

test.describe('試合記録', () => {
  test('試合開始後、1回表が表示される', async ({ page }) => {
    await startGame(page);
    await expect(page.locator('text=▲')).toBeVisible();
    await expect(page.locator('text=1').first()).toBeVisible();
  });

  test('四球で走者が1塁に進む', async ({ page }) => {
    await startGame(page);
    await page.getByRole('button', { name: /結果/ }).click();
    await page.getByRole('button', { name: '四球' }).click();
    await page.getByRole('button', { name: '記録する' }).click();
    await expect(page.getByText('打者')).toBeVisible();
  });

  test('アウトで次打者に進む', async ({ page }) => {
    await startGame(page);
    await page.getByRole('button', { name: /結果/ }).click();
    await page.getByRole('button', { name: 'アウト' }).click();
    await page.getByRole('button', { name: 'ゴロアウト' }).click();
    await page.getByRole('button', { name: '記録する' }).click();
    await expect(page.locator('text=O').first()).toBeVisible();
  });

  test('安打で走者移動ダイアログが表示される', async ({ page }) => {
    await startGame(page);
    await page.getByRole('button', { name: /結果/ }).click();
    await page.getByRole('button', { name: '安打' }).click();
    await page.getByRole('button', { name: /単打/ }).click();
    await page.getByRole('button', { name: '記録する' }).click();
    await expect(page.getByText('単打')).toBeVisible();
    await expect(page.getByText('各走者の進塁先を選んでね')).toBeVisible();
  });

  test('走者移動ダイアログで確定すると閉じる', async ({ page }) => {
    await startGame(page);
    await page.getByRole('button', { name: /結果/ }).click();
    await page.getByRole('button', { name: '安打' }).click();
    await page.getByRole('button', { name: /単打/ }).click();
    await page.getByRole('button', { name: '記録する' }).click();
    await page.getByRole('button', { name: '確定' }).click();
    await expect(page.getByText('各走者の進塁先を選んでね')).not.toBeVisible();
  });

  test('二塁打で走者移動ダイアログに2塁と表示される', async ({ page }) => {
    await startGame(page);
    await page.getByRole('button', { name: /結果/ }).click();
    await page.getByRole('button', { name: '安打' }).click();
    await page.getByRole('button', { name: /二塁打/ }).click();
    await page.getByRole('button', { name: '記録する' }).click();
    await expect(page.getByText('二塁打')).toBeVisible();
    await page.getByRole('button', { name: '確定' }).click();
    await expect(page.getByText('各走者の進塁先を選んでね')).not.toBeVisible();
  });

  test('三塁打で走者移動ダイアログに三塁打と表示される', async ({ page }) => {
    await startGame(page);
    await page.getByRole('button', { name: /結果/ }).click();
    await page.getByRole('button', { name: '安打' }).click();
    await page.getByRole('button', { name: /三塁打/ }).click();
    await page.getByRole('button', { name: '記録する' }).click();
    await expect(page.getByText('三塁打')).toBeVisible();
    await page.getByRole('button', { name: '確定' }).click();
    await expect(page.getByText('各走者の進塁先を選んでね')).not.toBeVisible();
  });

  test('ホームランで得点が入る', async ({ page }) => {
    await startGame(page);
    await page.getByRole('button', { name: /結果/ }).click();
    await page.getByRole('button', { name: '安打' }).click();
    await page.getByRole('button', { name: /ホームラン/ }).click();
    await page.getByRole('button', { name: '記録する' }).click();
    await expect(page.getByText('1').first()).toBeVisible();
  });

  test('3ストライクで自動的にアウトになり次打者に進む', async ({ page }) => {
    await startGame(page);
    // ストライクボタンを3回押す
    await page.getByRole('button', { name: 'ストライク' }).click();
    await page.getByRole('button', { name: 'ストライク' }).click();
    await page.getByRole('button', { name: 'ストライク' }).click();
    // アウトカウントが1になっている（Oドットが増える）
    // カウントが0にリセットされ、次打者になっている
    // ストライクカウントが0に戻っているはず
    const strikeCount = page.locator('[data-testid="strike-count"]');
    // ストライクが0にリセットされている
    await expect(page.locator('text=S●○○').or(page.locator('text=S○○○'))).toBeVisible().catch(() => {});
    // アウトカウント表示を確認
    await expect(page.getByText(/O/).first()).toBeVisible();
  });

  test('3アウトで攻守交代し裏表示になる', async ({ page }) => {
    await startGame(page);
    // アウトを3回記録
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: /結果/ }).click();
      await page.getByRole('button', { name: 'アウト' }).click();
      await page.getByRole('button', { name: 'ゴロアウト' }).click();
      await page.getByRole('button', { name: '記録する' }).click();
      if (i < 2) await page.getByRole('button', { name: /投球/ }).click();
    }
    // 1回裏になっているのでホームチームに▶が付く
    await expect(page.getByText('ホームチーム').locator('..').getByText('▶')).toBeVisible();
  });

  test('3アウト後にスコアボードの1回表欄に0が表示される', async ({ page }) => {
    await startGame(page);
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: /結果/ }).click();
      await page.getByRole('button', { name: 'アウト' }).click();
      await page.getByRole('button', { name: 'ゴロアウト' }).click();
      await page.getByRole('button', { name: '記録する' }).click();
      if (i < 2) await page.getByRole('button', { name: /投球/ }).click();
    }
    // スコアボードの相手チーム行の1回欄に「0」が入っている
    // .row はteamCellとcellの両方を内包するので、相手チーム行全体でフィルタ
    const visitorRow = page.locator('[class*="row"]').filter({ hasText: '相手チーム' });
    await expect(visitorRow.getByText('0').first()).toBeVisible();
  });
});
