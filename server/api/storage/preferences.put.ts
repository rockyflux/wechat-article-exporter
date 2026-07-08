import { getMysqlPool, isMysqlEnabled } from '~/server/utils/mysql/pool';

export default defineEventHandler(async event => {
  if (!isMysqlEnabled()) {
    throw createError({
      statusCode: 503,
      statusMessage: 'MySQL storage is not enabled',
    });
  }

  const body = await readBody(event);
  const pool = getMysqlPool();
  const updateTime = Math.floor(Date.now() / 1000);

  // 使用 INSERT ... ON DUPLICATE KEY UPDATE
  await pool.query(
    `INSERT INTO wx_preferences (id, data, update_time) VALUES (1, ?, ?)
     ON DUPLICATE KEY UPDATE data = VALUES(data), update_time = VALUES(update_time)`,
    [JSON.stringify(body), updateTime]
  );

  return { success: true };
});
