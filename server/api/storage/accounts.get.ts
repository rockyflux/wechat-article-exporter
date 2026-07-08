import { isMysqlEnabled } from '~/server/utils/mysql/pool';
import { mysqlGetAccount, mysqlGetAllAccounts } from '~/server/utils/mysql/repository';

export default defineEventHandler(async event => {
  if (!isMysqlEnabled()) {
    throw createError({ statusCode: 400, statusMessage: 'MySQL storage is not enabled' });
  }

  const query = getQuery(event);
  if (query.fakeid) {
    const account = await mysqlGetAccount(String(query.fakeid));
    return account ?? null;
  }

  return mysqlGetAllAccounts();
});
