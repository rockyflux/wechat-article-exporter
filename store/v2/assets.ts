import { db } from './db';
import { base64ToBlob, blobToBase64, isMysqlStorage, storageGet, storagePut } from './storage-client';

interface Asset {
  url: string;
  file: Blob;
  fakeid: string;
}

export type { Asset };

/**
 * 更新 asset 缓存
 * @param asset
 */
export async function updateAssetCache(asset: Asset): Promise<boolean> {
  if (isMysqlStorage()) {
    await storagePut('/api/storage/cache', {
      type: 'asset',
      payload: {
        ...asset,
        file: await blobToBase64(asset.file),
      },
    });
    return true;
  }

  return db.transaction('rw', 'asset', () => {
    db.asset.put(asset);
    return true;
  });
}

/**
 * 获取 asset 缓存
 * @param url
 */
export async function getAssetCache(url: string): Promise<Asset | undefined> {
  if (isMysqlStorage()) {
    const row = await storageGet<{ fakeid: string; url: string; file: string } | null>('/api/storage/cache', {
      type: 'asset',
      url,
    });

    if (!row) {
      return undefined;
    }

    return {
      fakeid: row.fakeid,
      url: row.url,
      file: base64ToBlob(row.file),
    };
  }

  db.transaction('r', 'asset', () => {});
  return db.asset.get(url);
}
