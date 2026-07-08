import { isMysqlEnabled } from '~/server/utils/mysql/pool';
import {
  mysqlGetBlob,
  mysqlGetCommentReply,
  mysqlGetJsonByUrl,
  mysqlGetAllDebug,
} from '~/server/utils/mysql/repository';

const JSON_TABLES = {
  metadata: 'wx_metadata',
  comment: 'wx_comments',
  'resource-map': 'wx_resource_maps',
} as const;

const BLOB_TABLES = {
  html: 'wx_html',
  asset: 'wx_assets',
  resource: 'wx_resources',
  debug: 'wx_debug',
} as const;

export default defineEventHandler(async event => {
  if (!isMysqlEnabled()) {
    throw createError({ statusCode: 400, statusMessage: 'MySQL storage is not enabled' });
  }

  const query = getQuery(event);
  const type = String(query.type);

  if (type === 'comment-reply') {
    return (
      (await mysqlGetCommentReply(String(query.url), String(query.contentID))) ?? null
    );
  }

  if (type === 'debug-all') {
    const rows = await mysqlGetAllDebug();
    return rows.map(row => ({
      ...row,
      file: Buffer.from(row.file as Buffer).toString('base64'),
    }));
  }

  if (type in JSON_TABLES) {
    const table = JSON_TABLES[type as keyof typeof JSON_TABLES];
    return (await mysqlGetJsonByUrl(table, String(query.url))) ?? null;
  }

  if (type in BLOB_TABLES) {
    const table = BLOB_TABLES[type as keyof typeof BLOB_TABLES];
    const row = await mysqlGetBlob(table, String(query.url));
    if (!row) {
      return null;
    }

    return {
      ...row,
      file: Buffer.from(row.file as Buffer).toString('base64'),
    };
  }

  throw createError({ statusCode: 400, statusMessage: 'Invalid storage type' });
});
