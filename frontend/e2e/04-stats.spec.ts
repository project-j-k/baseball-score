import { test, expect } from '@playwright/test';

test.describe('生涯成績', () => {
  test('トップ画面に生涯成績ボタンがある', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: '生涯成績を見る' })).toBeVisible();
  });

  test('生涯成績画面に遷移できる', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '生涯成績を見る' }).click();
    await expect(page.getByText('生涯成績')).toBeVisible();
    await expect(page.getByRole('button', { name: '← 戻る' })).toBeVisible();
  });

  test('記録がない場合はガイドメッセージが表示される', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '生涯成績を見る' }).click();
    // LocalStorageが空の場合
    await expect(page.getByText(/記録がまだないわ/)).toBeVisible();
  });

  test('戻るボタンでトップに戻れる', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '生涯成績を見る' }).click();
    await page.getByRole('button', { name: '← 戻る' }).click();
    await expect(page.getByText('野球スコア')).toBeVisible();
  });

  test('エクスポートボタンが表示される', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '生涯成績を見る' }).click();
    await expect(page.getByRole('button', { name: 'エクスポート' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'インポート' })).toBeVisible();
  });

  test('打撃・投手・試合一覧タブが切り替わる', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '生涯成績を見る' }).click();
    await page.getByRole('button', { name: '投手' }).click();
    await expect(page.getByRole('button', { name: '投手' })).toHaveClass(/active/);
    await page.getByRole('button', { name: '試合一覧' }).click();
    await expect(page.getByRole('button', { name: '試合一覧' })).toHaveClass(/active/);
  });
});
