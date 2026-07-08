import { isMysqlEnabled } from '~/server/utils/mysql/pool';
import { mysqlPing } from '~/server/utils/mysql/repository';

export default defineEventHandler(async () => {
  if (!isMysqlEnabled()) {
    return {
      enabled: false,
      ok: false,
      driver: 'indexeddb',
    };
  }

  try {
    await Promise.race([
      mysqlPing(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('MySQL connection timeout')), 10_000);
      }),
    ]);

    return {
      enabled: true,
      ok: true,
      driver: 'mysql',
    };
  } catch (error) {
    return {
      enabled: true,
      ok: false,
      driver: 'mysql',
      error: error instanceof Error ? error.message : String(error),
    };
  }
});
