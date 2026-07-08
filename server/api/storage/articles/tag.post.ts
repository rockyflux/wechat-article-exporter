import { isMysqlEnabled } from '~/server/utils/mysql/pool';
import { mysqlBatchSetTag } from '~/server/utils/mysql/repository';

export default defineEventHandler(async event => {
  if (!isMysqlEnabled()) {
    throw createError({ statusCode: 400, statusMessage: 'MySQL storage is not enabled' });
  }

  const body = await readBody(event);
  const { ids, tag } = body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid article ids' });
  }

  if (!tag || typeof tag !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid tag name' });
  }

  const updatedCount = await mysqlBatchSetTag(ids, tag.trim());
  
  return {
    success: true,
    updatedCount,
    message: `成功为 ${updatedCount} 篇文章设置标签`,
  };
});