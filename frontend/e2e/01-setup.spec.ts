import { test, expect } from '@playwright/test';

// ========== ヘルパー ==========
// トップ画面（GameJoin）から「新しい試合を作成」→「試合開始」まで進む
async function goToGameSetup(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: '＋ 新しい試合を作成' }).click();
  await expect(page.getByRole('heading', { name: /試合設定/ })).toBeVisible();
}

async function startGame(page: import('@playwright/test').Page) {
  await goToGameSetup(page);
  await page.getByRole('button', { name: '試合開始' }).click();
  await expect(page.locator('text=回')).toBeVisible();
}

test.describe('トップ画面', () => {
  test('ロゴと新規作成・参加ボタンが表示される', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('野球スコア')).toBeVisible();
    await expect(page.getByRole('button', { name: /新しい試合/ })).toBeVisible();
    await expect(page.getByRole('button', { name: '参加する' })).toBeVisible();
  });

  test('生涯成績ボタンと説明テキストが重なっていない', async ({ page }) => {
    await page.goto('/');
    const statsBtn = page.getByRole('button', { name: '生涯成績を見る' });
    const noteText = page.getByText(/個人情報は端末外/);
    await expect(statsBtn).toBeVisible();
    await expect(noteText).toBeVisible();

    const btnBox = await statsBtn.boundingBox();
    const noteBox = await noteText.boundingBox();
    if (!btnBox || !noteBox) throw new Error('要素のboundingBoxが取得できない');

    // ボタンとテキストが垂直方向に重なっていないことを確認
    const btnBottom = btnBox.y + btnBox.height;
    const noteBottom = noteBox.y + noteBox.height;
    const overlap = Math.min(btnBottom, noteBottom) - Math.max(btnBox.y, noteBox.y);
    expect(overlap, 'ボタンと説明テキストが重なっている').toBeLessThanOrEqual(0);
  });

  test('短いコードでエラーが出る', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="text"]').fill('ab');
    await page.getByRole('button', { name: '参加する' }).click();
    await expect(page.getByText(/短い/)).toBeVisible();
  });

  test('URLのゲームIDが自動入力される', async ({ page }) => {
    await page.goto('/?g=testcode123');
    const input = page.locator('input[type="text"]');
    await expect(input).toHaveValue('testcode123');
  });
});

test.describe('試合設定画面', () => {
  test.beforeEach(async ({ page }) => { await goToGameSetup(page); });

  test('試合設定画面が表示される', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /試合設定/ })).toBeVisible();
    await expect(page.getByRole('button', { name: '試合開始' })).toBeVisible();
  });

  test('デフォルトは7回制ボタンがアクティブ', async ({ page }) => {
    await expect(page.getByRole('button', { name: '7回制' })).toHaveClass(/btn-primary/);
  });

  test('9回制に切り替えできる', async ({ page }) => {
    await page.getByRole('button', { name: '9回制' }).click();
    await expect(page.getByRole('button', { name: '9回制' })).toHaveClass(/btn-primary/);
    await expect(page.getByRole('button', { name: '7回制' })).not.toHaveClass(/btn-primary/);
  });

  test('コールドゲーム設定の入力フィールドが読める', async ({ page }) => {
    const inningInput = page.locator('input[type="number"]').first();
    await expect(inningInput).toBeVisible();
    await expect(inningInput).toHaveCSS('color', 'rgb(255, 255, 255)');
  });

  test('得点差フィールドの値が表示できる', async ({ page }) => {
    const coldDiffInput = page.locator('input[type="number"]').nth(1);
    await expect(coldDiffInput).toHaveValue('10');
    await expect(coldDiffInput).toHaveCSS('color', 'rgb(255, 255, 255)');
  });

  test('試合開始で試合画面に遷移する', async ({ page }) => {
    await page.getByRole('button', { name: '試合開始' }).click();
    await expect(page.locator('text=回')).toBeVisible();
  });
});
