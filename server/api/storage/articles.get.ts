import { isMysqlEnabled } from '~/server/utils/mysql/pool';
import {
  mysqlGetArticleByLink,
  mysqlGetArticleKeys,
  mysqlGetArticles,
  mysqlHitArticleCache,
} from '~/server/utils/mysql/repository';

export default defineEventHandler(async event => {
  if (!isMysqlEnabled()) {
    throw createError({ statusCode: 400, statusMessage: 'MySQL storage is not enabled' });
  }

  const query = getQuery(event);

  if (query.action === 'keys') {
    return mysqlGetArticleKeys();
  }

  if (query.action === 'hit-cache') {
    return mysqlHitArticleCache(String(query.fakeid), Number(query.create_time));
  }

  if (query.link) {
    return (
      (await mysqlGetArticleByLink(String(query.link), query.singleOnly === 'true')) ?? null
    );
  }

  if (query.fakeid && query.before) {
    return mysqlGetArticles(String(query.fakeid), Number(query.before));
  }

  throw createError({ statusCode: 400, statusMessage: 'Invalid article query' });
});
