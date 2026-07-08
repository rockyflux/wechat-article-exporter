import { isMysqlEnabled } from '~/server/utils/mysql/pool';
import { mysqlGetArticlesDownloadStatus } from '~/server/utils/mysql/repository';

export default defineEventHandler(async event => {
  if (!isMysqlEnabled()) {
    throw createError({ statusCode: 400, statusMessage: 'MySQL storage is not enabled' });
  }

  const body = await readBody<{ urls?: string[] }>(event);
  const urls = Array.isArray(body.urls) ? body.urls.map(String) : [];

  return mysqlGetArticlesDownloadStatus(urls);
});
