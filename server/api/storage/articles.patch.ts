import { isMysqlEnabled } from '~/server/utils/mysql/pool';
import { mysqlUpdateArticleByLink } from '~/server/utils/mysql/repository';

export default defineEventHandler(async event => {
  if (!isMysqlEnabled()) {
    throw createError({ statusCode: 400, statusMessage: 'MySQL storage is not enabled' });
  }

  const body = await readBody(event);
  await mysqlUpdateArticleByLink(String(body.url), body.patch ?? {}, body.singleOnly === true);
  return { ok: true };
});
