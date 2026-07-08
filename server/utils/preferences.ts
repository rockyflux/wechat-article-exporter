import type { Preferences } from '~/types/preferences';
import { ensureMysqlSchema } from '~/server/utils/mysql/schema';
import { getMysqlPool, isMysqlEnabled } from '~/server/utils/mysql/pool';

export async function getServerPreferences(): Promise<Partial<Preferences>> {
  if (!isMysqlEnabled()) {
    return {};
  }

  await ensureMysqlSchema();
  const pool = getMysqlPool();
  const [rows] = await pool.query<Array<{ data: string | Preferences }>>('SELECT data FROM wx_preferences WHERE id = 1');

  if (!rows[0]?.data) {
    return {};
  }

  return typeof rows[0].data === 'string' ? JSON.parse(rows[0].data) : rows[0].data;
}
