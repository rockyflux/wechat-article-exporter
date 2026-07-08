import type { RowDataPacket } from 'mysql2/promise';
import { ensureMysqlSchema } from './schema';
import { getMysqlPool } from './pool';

export interface MpAccountRow {
  fakeid: string;
  completed: boolean;
  count: number;
  articles: number;
  nickname?: string;
  round_head_img?: string;
  total_count: number;
  create_time?: number;
  update_time?: number;
  last_update_time?: number;
}

async function withMysql<T>(fn: () => Promise<T>): Promise<T> {
  await ensureMysqlSchema();
  return fn();
}

function rowToAccount(row: RowDataPacket): MpAccountRow {
  return {
    fakeid: row.fakeid,
    completed: !!row.completed,
    count: row.count,
    articles: row.articles,
    nickname: row.nickname ?? undefined,
    round_head_img: row.round_head_img ?? undefined,
    total_count: row.total_count,
    create_time: row.create_time ?? undefined,
    update_time: row.update_time ?? undefined,
    last_update_time: row.last_update_time ?? undefined,
  };
}

function rowToArticle(row: RowDataPacket): Record<string, unknown> {
  const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
  const createTime = Number(row.create_time);
  const publishTime = row.publish_time != null ? Number(row.publish_time) : createTime;
  return {
    ...data,
    fakeid: row.fakeid,
    aid: row.aid,
    link: row.link,
    title: row.title ?? data.title ?? '',
    create_time: createTime,
    publish_time: publishTime,
    is_deleted: !!row.is_deleted,
    _status: row.status,
    _single: !!row.is_single,
  };
}

function extractArticleFields(article: Record<string, unknown>) {
  const {
    fakeid: _fakeid,
    aid: _aid,
    link,
    title,
    create_time,
    publish_time,
    is_deleted,
    _status,
    _single,
    ...rest
  } = article;
  const publishTime = Number(publish_time ?? create_time ?? 0);

  return {
    link: String(link),
    title: String(title ?? ''),
    publishTime,
    createTime: Number(create_time ?? publishTime),
    is_deleted,
    _status,
    _single,
    rest,
  };
}

export async function mysqlGetAllAccounts(): Promise<MpAccountRow[]> {
  return withMysql(async () => {
    const pool = getMysqlPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM wx_accounts');
    return rows.map(rowToAccount);
  });
}

export async function mysqlGetAccount(fakeid: string): Promise<MpAccountRow | undefined> {
  return withMysql(async () => {
    const pool = getMysqlPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM wx_accounts WHERE fakeid = ?', [fakeid]);
    return rows[0] ? rowToAccount(rows[0]) : undefined;
  });
}

export async function mysqlUpsertAccount(account: MpAccountRow): Promise<void> {
  await withMysql(async () => {
    const pool = getMysqlPool();
    await pool.query(
      `INSERT INTO wx_accounts
        (fakeid, completed, count, articles, nickname, round_head_img, total_count, create_time, update_time, last_update_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        completed = VALUES(completed),
        count = VALUES(count),
        articles = VALUES(articles),
        nickname = VALUES(nickname),
        round_head_img = VALUES(round_head_img),
        total_count = VALUES(total_count),
        create_time = COALESCE(wx_accounts.create_time, VALUES(create_time)),
        update_time = VALUES(update_time),
        last_update_time = VALUES(last_update_time)`,
      [
        account.fakeid,
        account.completed ? 1 : 0,
        account.count,
        account.articles,
        account.nickname ?? null,
        account.round_head_img ?? null,
        account.total_count,
        account.create_time ?? null,
        account.update_time ?? null,
        account.last_update_time ?? null,
      ]
    );
  });
}

export async function mysqlUpdateLastUpdateTime(fakeid: string, lastUpdateTime: number): Promise<void> {
  await withMysql(async () => {
    const pool = getMysqlPool();
    await pool.query('UPDATE wx_accounts SET last_update_time = ? WHERE fakeid = ?', [lastUpdateTime, fakeid]);
  });
}

export async function mysqlGetArticles(fakeid: string, beforeCreateTime: number): Promise<Record<string, unknown>[]> {
  return withMysql(async () => {
    const pool = getMysqlPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM wx_articles WHERE fakeid = ? AND create_time < ? ORDER BY create_time DESC',
      [fakeid, beforeCreateTime]
    );
    return rows.map(rowToArticle);
  });
}

export interface ArticleDownloadStatus {
  html: boolean;
  comment: boolean;
  metadata?: Record<string, unknown>;
}

export async function mysqlGetArticlesDownloadStatus(
  urls: string[]
): Promise<Record<string, ArticleDownloadStatus>> {
  if (urls.length === 0) {
    return {};
  }

  return withMysql(async () => {
    const pool = getMysqlPool();
    const placeholders = urls.map(() => '?').join(', ');
    const [htmlRows, commentRows, metadataRows] = await Promise.all([
      pool.query<RowDataPacket[]>(`SELECT url FROM wx_html WHERE url IN (${placeholders})`, urls),
      pool.query<RowDataPacket[]>(`SELECT url FROM wx_comments WHERE url IN (${placeholders})`, urls),
      pool.query<RowDataPacket[]>(`SELECT url, data FROM wx_metadata WHERE url IN (${placeholders})`, urls),
    ]);

    const htmlSet = new Set(htmlRows[0].map(row => String(row.url)));
    const commentSet = new Set(commentRows[0].map(row => String(row.url)));
    const metadataMap = new Map<string, Record<string, unknown>>(
      metadataRows[0].map(row => {
        const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
        return [String(row.url), data as Record<string, unknown>];
      })
    );

    const result: Record<string, ArticleDownloadStatus> = {};
    for (const url of urls) {
      const metadata = metadataMap.get(url);
      result[url] = {
        html: htmlSet.has(url),
        comment: commentSet.has(url),
        metadata: metadata ?? undefined,
      };
    }
    return result;
  });
}

export async function mysqlHitArticleCache(fakeid: string, createTime: number): Promise<boolean> {
  return withMysql(async () => {
    const pool = getMysqlPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS count FROM wx_articles WHERE fakeid = ? AND create_time < ?',
      [fakeid, createTime]
    );
    return Number(rows[0]?.count ?? 0) > 0;
  });
}

export async function mysqlGetArticleByLink(url: string, singleOnly = false): Promise<Record<string, unknown> | undefined> {
  return withMysql(async () => {
    const pool = getMysqlPool();
    const sql = singleOnly
      ? 'SELECT * FROM wx_articles WHERE link = ? AND fakeid = ? LIMIT 1'
      : 'SELECT * FROM wx_articles WHERE link = ? LIMIT 1';
    const params = singleOnly ? [url, 'SINGLE_ARTICLE_FAKEID'] : [url];
    const [rows] = await pool.query<RowDataPacket[]>(sql, params);
    return rows[0] ? rowToArticle(rows[0]) : undefined;
  });
}

export async function mysqlUpsertArticles(
  fakeid: string,
  articles: Record<string, unknown>[],
  existingKeys: string[]
): Promise<{ newKeys: string[]; msgCount: number; articleCount: number }> {
  return withMysql(async () => {
    const pool = getMysqlPool();
    const newKeys: string[] = [];
    let msgCount = 0;
    let articleCount = 0;
    const msgIds = new Set<string>();

    for (const article of articles) {
      const aid = String(article.aid);
      const id = `${fakeid}:${aid}`;
      const { link, title, publishTime, createTime, is_deleted, _status, _single, rest } = extractArticleFields(article);

      await pool.query(
        `INSERT INTO wx_articles
          (id, fakeid, aid, link, title, publish_time, create_time, data, is_deleted, status, is_single)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          link = VALUES(link),
          title = VALUES(title),
          publish_time = VALUES(publish_time),
          create_time = VALUES(create_time),
          data = VALUES(data),
          is_deleted = VALUES(is_deleted),
          status = VALUES(status),
          is_single = VALUES(is_single)`,
        [
          id,
          fakeid,
          aid,
          link,
          title,
          publishTime,
          createTime,
          JSON.stringify(rest),
          is_deleted ? 1 : 0,
          String(_status ?? ''),
          _single ? 1 : 0,
        ]
      );

      if (!existingKeys.includes(id)) {
        newKeys.push(id);
        articleCount++;
        const msgid = String(rest.msgid ?? '');
        if (msgid && !msgIds.has(msgid)) {
          msgIds.add(msgid);
          msgCount++;
        }
      }
    }

    return { newKeys, msgCount, articleCount };
  });
}

export async function mysqlGetArticleKeys(): Promise<string[]> {
  return withMysql(async () => {
    const pool = getMysqlPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT id FROM wx_articles');
    return rows.map(row => String(row.id));
  });
}

export async function mysqlPutArticle(
  article: Record<string, unknown>,
  id?: string
): Promise<string> {
  return withMysql(async () => {
    const fakeid = String(article.fakeid);
    const aid = String(article.aid);
    const key = id ?? `${fakeid}:${aid}`;
    const { link, title, publishTime, createTime, is_deleted, _status, _single, rest } = extractArticleFields(article);

    const pool = getMysqlPool();
    await pool.query(
      `INSERT INTO wx_articles
        (id, fakeid, aid, link, title, publish_time, create_time, data, is_deleted, status, is_single)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        link = VALUES(link),
        title = VALUES(title),
        publish_time = VALUES(publish_time),
        create_time = VALUES(create_time),
        data = VALUES(data),
        is_deleted = VALUES(is_deleted),
        status = VALUES(status),
        is_single = VALUES(is_single)`,
      [
        key,
        fakeid,
        aid,
        link,
        title,
        publishTime,
        createTime,
        JSON.stringify(rest),
        is_deleted ? 1 : 0,
        String(_status ?? ''),
        _single ? 1 : 0,
      ]
    );

    return key;
  });
}

export async function mysqlDeleteArticle(id: string): Promise<void> {
  await withMysql(async () => {
    const pool = getMysqlPool();
    await pool.query('DELETE FROM wx_articles WHERE id = ?', [id]);
  });
}

export async function mysqlUpdateArticleByLink(
  url: string,
  patch: Record<string, unknown>,
  singleOnly = false
): Promise<void> {
  await withMysql(async () => {
    const article = await mysqlGetArticleByLink(url, singleOnly);
    if (!article) {
      return;
    }

    const oldFakeid = String(article.fakeid);
    const aid = String(article.aid);
    const oldId = `${oldFakeid}:${aid}`;
    const merged = { ...article, ...patch };
    const newFakeid = String(merged.fakeid);
    const newId = `${newFakeid}:${aid}`;

    if (newId !== oldId) {
      const pool = getMysqlPool();
      await pool.query('DELETE FROM wx_articles WHERE id = ?', [oldId]);
    }

    await mysqlPutArticle(merged, newId);
  });
}

export async function mysqlDeleteAccountData(fakeids: string[]): Promise<void> {
  await withMysql(async () => {
    const pool = getMysqlPool();
    const placeholders = fakeids.map(() => '?').join(', ');
    const tables = [
      'wx_articles',
      'wx_assets',
      'wx_comments',
      'wx_comment_replies',
      'wx_debug',
      'wx_html',
      'wx_accounts',
      'wx_metadata',
      'wx_resources',
      'wx_resource_maps',
    ];

    for (const table of tables) {
      await pool.query(`DELETE FROM ${table} WHERE fakeid IN (${placeholders})`, fakeids);
    }
  });
}

export async function mysqlGetJsonByUrl(table: 'wx_metadata' | 'wx_comments' | 'wx_resource_maps', url: string) {
  return withMysql(async () => {
    const pool = getMysqlPool();
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${table} WHERE url = ? LIMIT 1`, [url]);
    if (!rows[0]) {
      return undefined;
    }

    const row = rows[0];
    if (table === 'wx_resource_maps') {
      const resources = typeof row.resources === 'string' ? JSON.parse(row.resources) : row.resources;
      return {
        fakeid: row.fakeid,
        url: row.url,
        resources,
      };
    }

    const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    if (table === 'wx_metadata') {
      return {
        fakeid: row.fakeid,
        url: row.url,
        ...data,
      };
    }

    return {
      fakeid: row.fakeid,
      url: row.url,
      title: row.title ?? data.title ?? '',
      data,
    };
  });
}

export async function mysqlPutJsonByUrl(
  table: 'wx_metadata' | 'wx_comments' | 'wx_resource_maps',
  payload: Record<string, unknown>
): Promise<void> {
  await withMysql(async () => {
    const pool = getMysqlPool();
    const url = String(payload.url);
    const fakeid = String(payload.fakeid);

    if (table === 'wx_resource_maps') {
      await pool.query(
        `INSERT INTO wx_resource_maps (url, fakeid, resources) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE fakeid = VALUES(fakeid), resources = VALUES(resources)`,
        [url, fakeid, JSON.stringify(payload.resources ?? [])]
      );
      return;
    }

    if (table === 'wx_metadata') {
      const { fakeid: _fakeid, url: _url, ...data } = payload;
      await pool.query(
        `INSERT INTO wx_metadata (url, fakeid, data) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE fakeid = VALUES(fakeid), data = VALUES(data)`,
        [url, fakeid, JSON.stringify(data)]
      );
      return;
    }

    const { title, data, fakeid: _fakeid, url: _url } = payload;
    await pool.query(
      `INSERT INTO wx_comments (url, fakeid, title, data) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE fakeid = VALUES(fakeid), title = VALUES(title), data = VALUES(data)`,
      [url, fakeid, String(title ?? ''), JSON.stringify(data ?? {})]
    );
  });
}

export async function mysqlGetCommentReply(url: string, contentID: string) {
  return withMysql(async () => {
    const pool = getMysqlPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM wx_comment_replies WHERE url = ? AND content_id = ? LIMIT 1',
      [url, contentID]
    );
    if (!rows[0]) {
      return undefined;
    }

    const row = rows[0];
    const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    return {
      fakeid: row.fakeid,
      url: row.url,
      title: row.title,
      contentID: row.content_id,
      data,
    };
  });
}

export async function mysqlPutCommentReply(payload: Record<string, unknown>): Promise<void> {
  await withMysql(async () => {
    const pool = getMysqlPool();
    const url = String(payload.url);
    const contentID = String(payload.contentID);
    const { data, title, fakeid } = payload;

    await pool.query(
      `INSERT INTO wx_comment_replies (url, fakeid, title, content_id, data)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        fakeid = VALUES(fakeid),
        title = VALUES(title),
        data = VALUES(data)`,
      [url, String(fakeid), String(title ?? ''), contentID, JSON.stringify(data ?? {})]
    );
  });
}

export async function mysqlGetBlob(
  table: 'wx_html' | 'wx_assets' | 'wx_resources' | 'wx_debug',
  url: string
): Promise<Record<string, unknown> | undefined> {
  return withMysql(async () => {
    const pool = getMysqlPool();
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${table} WHERE url = ? LIMIT 1`, [url]);
    if (!rows[0]) {
      return undefined;
    }

    const row = rows[0];
    const file = Buffer.isBuffer(row.file) ? row.file : Buffer.from(row.file);
    const result: Record<string, unknown> = {
      fakeid: row.fakeid,
      url: row.url,
      file,
    };

    if (table === 'wx_html') {
      result.title = row.title;
      result.commentID = row.comment_id;
    } else if (table === 'wx_debug') {
      result.type = row.type;
      result.title = row.title;
    }

    return result;
  });
}

export async function mysqlPutBlob(
  table: 'wx_html' | 'wx_assets' | 'wx_resources' | 'wx_debug',
  payload: Record<string, unknown>
): Promise<void> {
  await withMysql(async () => {
    const pool = getMysqlPool();
    const url = String(payload.url);
    const fakeid = String(payload.fakeid);
    const file = Buffer.isBuffer(payload.file) ? payload.file : Buffer.from(payload.file as ArrayBuffer);

    if (table === 'wx_html') {
      await pool.query(
        `INSERT INTO wx_html (url, fakeid, title, comment_id, file) VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE fakeid = VALUES(fakeid), title = VALUES(title), comment_id = VALUES(comment_id), file = VALUES(file)`,
        [url, fakeid, String(payload.title ?? ''), payload.commentID ?? null, file]
      );
      return;
    }

    if (table === 'wx_debug') {
      await pool.query(
        `INSERT INTO wx_debug (url, fakeid, type, title, file) VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE fakeid = VALUES(fakeid), type = VALUES(type), title = VALUES(title), file = VALUES(file)`,
        [url, fakeid, String(payload.type ?? ''), String(payload.title ?? ''), file]
      );
      return;
    }

    await pool.query(
      `INSERT INTO ${table} (url, fakeid, file) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE fakeid = VALUES(fakeid), file = VALUES(file)`,
      [url, fakeid, file]
    );
  });
}

export async function mysqlDeleteBlob(
  table: 'wx_html' | 'wx_assets' | 'wx_resources' | 'wx_debug',
  url: string
): Promise<void> {
  await withMysql(async () => {
    const pool = getMysqlPool();
    await pool.query(`DELETE FROM ${table} WHERE url = ?`, [url]);
  });
}

export async function mysqlGetAllDebug(): Promise<Record<string, unknown>[]> {
  return withMysql(async () => {
    const pool = getMysqlPool();
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM wx_debug');
    return rows.map(row => ({
      fakeid: row.fakeid,
      url: row.url,
      type: row.type,
      title: row.title,
      file: Buffer.isBuffer(row.file) ? row.file : Buffer.from(row.file),
    }));
  });
}

export async function mysqlPing(): Promise<boolean> {
  await ensureMysqlSchema();
  const pool = getMysqlPool();
  await pool.query('SELECT 1');
  return true;
}
