import { isMysqlEnabled } from '~/server/utils/mysql/pool';
import { mysqlGetAllTags } from '~/server/utils/mysql/repository';

export default defineEventHandler(async event => {
  if (!isMysqlEnabled()) {
    throw createError({ statusCode: 400, statusMessage: 'MySQL storage is not enabled' });
  }

  const tags = await mysqlGetAllTags();
  return { tags };
});