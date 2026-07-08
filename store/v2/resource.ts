import { db } from './db';
import { base64ToBlob, blobToBase64, isMysqlStorage, storageGet, storagePut } from './storage-client';

export interface ResourceAsset {
  fakeid: string;
  url: string;
  file: Blob;
}

/**
 * 更新 resource 缓存
 * @param resource 缓存
 */
export async function updateResourceCache(resource: ResourceAsset): Promise<boolean> {
  if (isMysqlStorage()) {
    await storagePut('/api/storage/cache', {
      type: 'resource',
      payload: {
        ...resource,
        file: await blobToBase64(resource.file),
      },
    });
    return true;
  }

  return db.transaction('rw', 'resource', async () => {
    await db.resource.put(resource);
    return true;
  });
}

/**
 * 获取 resource 缓存
 * @param url
 */
export async function getResourceCache(url: string): Promise<ResourceAsset | undefined> {
  if (isMysqlStorage()) {
    const row = await storageGet<{ fakeid: string; url: string; file: string } | null>('/api/storage/cache', {
      type: 'resource',
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

  return db.resource.get(url);
}
