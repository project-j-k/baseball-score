#!/usr/bin/env node
// 合言葉のSHA-256ハッシュを生成する
// 使い方: node scripts/gen-passcode-hash.mjs <合言葉>
import { createHash } from 'crypto';

const passcode = process.argv[2];
if (!passcode) {
  console.error('使い方: node scripts/gen-passcode-hash.mjs <合言葉>');
  process.exit(1);
}

const hash = createHash('sha256').update(passcode).digest('hex');
console.log('\n合言葉のSHA-256ハッシュ:');
console.log(hash);
console.log('\n以下のどちらかに設定してね:');
console.log(`  ローカル開発用: frontend/.env.local に VITE_STATS_PASSCODE_HASH=${hash}`);
console.log(`  本番用: GitHubリポジトリの Secrets → Actions に VITE_STATS_PASSCODE_HASH = ${hash}\n`);
