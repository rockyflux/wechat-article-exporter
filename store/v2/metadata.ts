import type { ArticleMetadata } from '~/utils/download/types';
import { db } from './db';
import { isMysqlStorage, storageGet, storagePut } from './storage-client';

export type Metadata = ArticleMetadata & {
  fakeid: string;
  url: string;
  title: string;
};

/**
 * 更新 metadata
 * @param metadata
 */
export async function updateMetadataCache(metadata: Metadata): Promise<boolean> {
  if (isMysqlStorage()) {
    await storagePut('/api/storage/cache', {
      type: 'metadata',
      payload: metadata,
    });
    return true;
  }

  return db.transaction('rw', 'metadata', async () => {
    await db.metadata.put(metadata);
    return true;
  });
}

/**
 * 获取 metadata
 * @param url
 */
export async function getMetadataCache(url: string): Promise<Metadata | undefined> {
  if (isMysqlStorage()) {
    const row = await storageGet<Metadata | null>('/api/storage/cache', { type: 'metadata', url });
    return row ?? undefined;
  }

  return db.metadata.get(url);
}
