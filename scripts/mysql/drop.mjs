import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { getMysqlConfig } from './load-env.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dropPath = path.join(__dirname, 'drop.sql');

async function main() {
  if (!process.argv.includes('--confirm')) {
    console.error('[mysql:drop] 危险操作，请添加 --confirm 参数后执行');
    console.error('示例: npm run mysql:drop -- --confirm');
    process.exit(1);
  }

  const config = getMysqlConfig();
  const sql = fs.readFileSync(dropPath, 'utf8');

  console.log(`[mysql:drop] 连接 ${config.user}@${config.host}:${config.port}/${config.database}`);
  console.log('[mysql:drop] 即将删除所有 wx_* 业务表...');

  const connection = await mysql.createConnection({
    ...config,
    connectTimeout: 10_000,
    multipleStatements: true,
    charset: 'utf8mb4',
  });

  try {
    await connection.query(sql);
    console.log('[mysql:drop] 删除完成');
  } finally {
    await connection.end();
  }
}

main().catch(error => {
  console.error('[mysql:drop] 失败:', error.message);
  process.exit(1);
});
