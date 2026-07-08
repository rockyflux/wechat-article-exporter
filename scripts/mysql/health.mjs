import mysql from 'mysql2/promise';
import { getMysqlConfig } from './load-env.mjs';

const EXPECTED_TABLES = [
  'wx_accounts',
  'wx_articles',
  'wx_html',
  'wx_metadata',
  'wx_comments',
  'wx_comment_replies',
  'wx_assets',
  'wx_resources',
  'wx_resource_maps',
  'wx_debug',
];

async function main() {
  const config = getMysqlConfig();

  console.log(`[mysql:health] 连接 ${config.user}@${config.host}:${config.port}/${config.database}`);

  const connection = await mysql.createConnection({
    ...config,
    connectTimeout: 10_000,
    charset: 'utf8mb4',
  });

  try {
    const [pingRows] = await connection.query('SELECT 1 AS ok');
    console.log('[mysql:health] 连接成功:', pingRows[0]);

    const [tables] = await connection.query('SHOW TABLES');
    const tableNames = tables.map(row => Object.values(row)[0]);
    console.log('[mysql:health] 已存在表:', tableNames.length ? tableNames.join(', ') : '(无)');

    const missing = EXPECTED_TABLES.filter(name => !tableNames.includes(name));
    if (missing.length > 0) {
      console.warn('[mysql:health] 缺少表:', missing.join(', '));
      console.warn('[mysql:health] 请执行: npm run mysql:init');
      process.exit(2);
    }

    console.log('[mysql:health] 所有业务表已就绪');
  } finally {
    await connection.end();
  }
}

main().catch(error => {
  console.error('[mysql:health] 失败:', error.message);
  process.exit(1);
});
