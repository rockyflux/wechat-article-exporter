import { isMysqlEnabled } from '~/server/utils/mysql/pool';
import { mysqlDeleteAccountData } from '~/server/utils/mysql/repository';

export default defineEventHandler(async event => {
  if (!isMysqlEnabled()) {
    throw createError({ statusCode: 400, statusMessage: 'MySQL storage is not enabled' });
  }

  const body = await readBody(event);
  await mysqlDeleteAccountData(body.fakeids ?? []);
  return { ok: true };
});
