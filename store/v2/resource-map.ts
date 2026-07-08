import { db } from './db';
import { isMysqlStorage, storageGet, storagePut } from './storage-client';

export interface ResourceMapAsset {
  fakeid: string;
  url: string;
  resources: string[];
}

/**
 * 更新 resource-map 缓存
 * @param resourceMap 缓存
 */
export async function updateResourceMapCache(resourceMap: ResourceMapAsset): Promise<boolean> {
  if (isMysqlStorage()) {
    await storagePut('/api/storage/cache', {
      type: 'resource-map',
      payload: resourceMap,
    });
    return true;
  }

  return db.transaction('rw', 'resource-map', async () => {
    await db['resource-map'].put(resourceMap);
    return true;
  });
}

/**
 * 获取 resource-map 缓存
 * @param url
 */
export async function getResourceMapCache(url: string): Promise<ResourceMapAsset | undefined> {
  if (isMysqlStorage()) {
    const row = await storageGet<ResourceMapAsset | null>('/api/storage/cache', { type: 'resource-map', url });
    return row ?? undefined;
  }

  return db['resource-map'].get(url);
}
