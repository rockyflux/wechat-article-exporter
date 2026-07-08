import { isMysqlEnabled } from '~/server/utils/mysql/pool';
import { mysqlGetArticleList, type ArticleListQuery } from '~/server/utils/mysql/repository';

export default defineEventHandler(async event => {
  if (!isMysqlEnabled()) {
    throw createError({ statusCode: 400, statusMessage: 'MySQL storage is not enabled' });
  }

  const query = getQuery(event);
  
  const page = Number(query.page) || 1;
  const pageSize = Number(query.pageSize) || 20;
  const fakeid = query.fakeid ? String(query.fakeid) : undefined;
  const startTime = query.startTime ? Number(query.startTime) : undefined;
  const endTime = query.endTime ? Number(query.endTime) : undefined;
  const title = query.title ? String(query.title) : undefined;
  const tag = query.tag ? String(query.tag) : undefined;

  const result = await mysqlGetArticleList({
    fakeid,
    startTime,
    endTime,
    title,
    tag,
    page,
    pageSize,
  });

  return result;
});