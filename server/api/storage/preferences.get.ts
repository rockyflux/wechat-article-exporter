import { getMysqlPool, isMysqlEnabled } from '~/server/utils/mysql/pool';

export default defineEventHandler(async () => {
  if (!isMysqlEnabled()) {
    throw createError({
      statusCode: 503,
      statusMessage: 'MySQL storage is not enabled',
    });
  }

  const pool = getMysqlPool();
  const [rows] = await pool.query<any[]>('SELECT data FROM wx_preferences WHERE id = 1');

  if (rows.length === 0) {
    return null;
  }

  return rows[0].data;
});
