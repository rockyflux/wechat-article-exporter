import { db } from './db';
import { isMysqlStorage, storageGet, storagePut } from './storage-client';

export interface CommentAsset {
  fakeid: string;
  url: string;
  title: string;
  data: any;
}

/**
 * 更新 comment 缓存
 * @param comment 缓存
 */
export async function updateCommentCache(comment: CommentAsset): Promise<boolean> {
  if (isMysqlStorage()) {
    await storagePut('/api/storage/cache', {
      type: 'comment',
      payload: comment,
    });
    return true;
  }

  return db.transaction('rw', 'comment', async () => {
    await db.comment.put(comment);
    return true;
  });
}

/**
 * 获取 comment 缓存
 * @param url
 */
export async function getCommentCache(url: string): Promise<CommentAsset | undefined> {
  if (isMysqlStorage()) {
    const row = await storageGet<CommentAsset | null>('/api/storage/cache', { type: 'comment', url });
    return row ?? undefined;
  }

  return db.comment.get(url);
}
