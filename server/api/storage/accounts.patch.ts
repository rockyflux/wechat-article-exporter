import { isMysqlEnabled } from '~/server/utils/mysql/pool';
import { mysqlUpdateLastUpdateTime } from '~/server/utils/mysql/repository';

export default defineEventHandler(async event => {
  if (!isMysqlEnabled()) {
    throw createError({ statusCode: 400, statusMessage: 'MySQL storage is not enabled' });
  }

  const body = await readBody(event);
  await mysqlUpdateLastUpdateTime(String(body.fakeid), Number(body.last_update_time));
  return { ok: true };
});
