import { isMysqlEnabled } from '~/server/utils/mysql/pool';
import { mysqlPutArticle, mysqlUpsertArticles } from '~/server/utils/mysql/repository';

export default defineEventHandler(async event => {
  if (!isMysqlEnabled()) {
    throw createError({ statusCode: 400, statusMessage: 'MySQL storage is not enabled' });
  }

  const body = await readBody(event);

  if (body.batch) {
    const result = await mysqlUpsertArticles(String(body.fakeid), body.articles, body.existingKeys ?? []);
    return result;
  }

  const key = await mysqlPutArticle(body.article, body.id);
  return { key };
});
