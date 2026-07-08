import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { getMysqlConfig } from './load-env.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, 'schema.sql');

async function main() {
  const config = getMysqlConfig();
  const sql = fs.readFileSync(schemaPath, 'utf8');

  console.log(`[mysql:init] 连接 ${config.user}@${config.host}:${config.port}/${config.database}`);

  const connection = await mysql.createConnection({
    ...config,
    connectTimeout: 10_000,
    multipleStatements: true,
    charset: 'utf8mb4',
  });

  try {
    await connection.query(sql);

    const [tables] = await connection.query('SHOW TABLES');
    console.log('[mysql:init] 建表完成，当前表列表:');
    for (const row of tables) {
      console.log(`  - ${Object.values(row)[0]}`);
    }
  } finally {
    await connection.end();
  }
}

main().catch(error => {
  console.error('[mysql:init] 失败:', error.message);
  process.exit(1);
});
