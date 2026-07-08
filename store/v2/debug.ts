import { db } from './db';
import { base64ToBlob, blobToBase64, isMysqlStorage, storageGet, storagePut } from './storage-client';

export interface DebugAsset {
  type: string;
  url: string;
  file: Blob;
  title: string;
  fakeid: string;
}

/**
 * 更新 html 缓存
 * @param html 缓存
 */
export async function updateDebugCache(html: DebugAsset): Promise<boolean> {
  if (isMysqlStorage()) {
    await storagePut('/api/storage/cache', {
      type: 'debug',
      payload: {
        ...html,
        file: await blobToBase64(html.file),
      },
    });
    return true;
  }

  return db.transaction('rw', 'debug', async () => {
    await db.debug.put(html);
    return true;
  });
}

/**
 * 获取 asset 缓存
 * @param url
 */
export async function getDebugCache(url: string): Promise<DebugAsset | undefined> {
  if (isMysqlStorage()) {
    const row = await storageGet<{
      fakeid: string;
      url: string;
      type: string;
      title: string;
      file: string;
    } | null>('/api/storage/cache', { type: 'debug', url });

    if (!row) {
      return undefined;
    }

    return {
      fakeid: row.fakeid,
      url: row.url,
      type: row.type,
      title: row.title,
      file: base64ToBlob(row.file, 'text/html'),
    };
  }

  return db.debug.get(url);
}

export async function getDebugInfo(): Promise<DebugAsset[]> {
  if (isMysqlStorage()) {
    const rows = await storageGet<
      Array<{
        fakeid: string;
        url: string;
        type: string;
        title: string;
        file: string;
      }>
    >('/api/storage/cache', { type: 'debug-all' });

    return rows.map(row => ({
      fakeid: row.fakeid,
      url: row.url,
      type: row.type,
      title: row.title,
      file: base64ToBlob(row.file, 'text/html'),
    }));
  }

  return db.debug.toArray();
}
