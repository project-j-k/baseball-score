import { describe, it, expect } from 'vitest';
import { buildGameUrl, parseGameIdFromUrl } from '../socketUtils';

// ========== URLユーティリティのテスト ==========

describe('buildGameUrl', () => {
  it('ゲームIDからURLを生成できる', () => {
    const url = buildGameUrl('abc123', 'http://localhost:5173');
    expect(url).toBe('http://localhost:5173/?g=abc123');
  });

  it('既存クエリパラメータがあっても上書きする', () => {
    const url = buildGameUrl('xyz', 'http://localhost:5173/?g=old');
    expect(url).toBe('http://localhost:5173/?g=xyz');
  });
});

describe('parseGameIdFromUrl', () => {
  it('URLからゲームIDを取得できる', () => {
    const id = parseGameIdFromUrl('http://localhost:5173/?g=abc123');
    expect(id).toBe('abc123');
  });

  it('パラメータなしはnullを返す', () => {
    const id = parseGameIdFromUrl('http://localhost:5173/');
    expect(id).toBeNull();
  });

  it('他のパラメータが混在しても正しく取得', () => {
    const id = parseGameIdFromUrl('http://localhost:5173/?foo=bar&g=abc123&baz=1');
    expect(id).toBe('abc123');
  });
});
