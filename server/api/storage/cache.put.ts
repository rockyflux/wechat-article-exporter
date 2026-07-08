import { isMysqlEnabled } from '~/server/utils/mysql/pool';
import {
  mysqlPutBlob,
  mysqlPutCommentReply,
  mysqlPutJsonByUrl,
  mysqlDeleteBlob,
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

  const body = await readBody(event);
  const type = String(body.type);

  if (body.action === 'delete') {
    if (!(type in BLOB_TABLES)) {
      throw createError({ statusCode: 400, statusMessage: 'Delete is only supported for blob storage' });
    }
    await mysqlDeleteBlob(BLOB_TABLES[type as keyof typeof BLOB_TABLES], String(body.url));
    return { ok: true };
  }

  if (type === 'comment-reply') {
    await mysqlPutCommentReply(body.payload);
    return { ok: true };
  }

  if (type in JSON_TABLES) {
    await mysqlPutJsonByUrl(JSON_TABLES[type as keyof typeof JSON_TABLES], body.payload);
    return { ok: true };
  }

  if (type in BLOB_TABLES) {
    const payload = {
      ...body.payload,
      file: Buffer.from(String(body.payload.file), 'base64'),
    };
    await mysqlPutBlob(BLOB_TABLES[type as keyof typeof BLOB_TABLES], payload);
    return { ok: true };
  }

  throw createError({ statusCode: 400, statusMessage: 'Invalid storage type' });
});
