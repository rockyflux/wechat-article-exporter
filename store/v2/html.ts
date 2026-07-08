import { db } from './db';
import { base64ToBlob, blobToBase64, isMysqlStorage, storageGet, storagePut } from './storage-client';

export interface HtmlAsset {
  fakeid: string;
  url: string;
  file: Blob;
  title: string;
  commentID: string | null;
}

/**
 * 更新 html 缓存
 * @param html 缓存
 */
export async function updateHtmlCache(html: HtmlAsset): Promise<boolean> {
  if (isMysqlStorage()) {
    await storagePut('/api/storage/cache', {
      type: 'html',
      payload: {
        ...html,
        file: await blobToBase64(html.file),
      },
    });
    return true;
  }

  return db.transaction('rw', 'html', async () => {
    await db.html.put(html);
    return true;
  });
}

/**
 * 获取 asset 缓存
 * @param url
 */
export async function getHtmlCache(url: string): Promise<HtmlAsset | undefined> {
  if (isMysqlStorage()) {
    const row = await storageGet<{
      fakeid: string;
      url: string;
      title: string;
      commentID: string | null;
      file: string;
    } | null>('/api/storage/cache', { type: 'html', url });

    if (!row) {
      return undefined;
    }

    return {
      fakeid: row.fakeid,
      url: row.url,
      title: row.title,
      commentID: row.commentID,
      file: base64ToBlob(row.file, 'text/html'),
    };
  }

  return db.html.get(url);
}

export async function deleteHtmlCache(url: string): Promise<void> {
  if (isMysqlStorage()) {
    await storagePut('/api/storage/cache', {
      type: 'html',
      action: 'delete',
      url,
    });
    return;
  }

  await db.html.delete(url);
}
