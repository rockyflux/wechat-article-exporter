import type { AppMsgExWithFakeID, PublishInfo, PublishPage } from '~/types/types';
import { db } from './db';
import { type MpAccount, updateInfoCache } from './info';
import type { Metadata } from './metadata';
import { isMysqlStorage, storageDelete, storageGet, storagePatch, storagePut } from './storage-client';

export type ArticleAsset = AppMsgExWithFakeID;

export interface ArticleDownloadStatus {
  html: boolean;
  comment: boolean;
  metadata?: Partial<Metadata>;
}

/**
 * 更新文章缓存
 * @param account
 * @param publish_page
 */
export async function updateArticleCache(account: MpAccount, publish_page: PublishPage) {
  if (isMysqlStorage()) {
    const existingKeys = new Set(await storageGet<string[]>('/api/storage/articles', { action: 'keys' }));
    const publish_list = publish_page.publish_list.filter(entry => !!entry.publish_info);
    let msgCount = 0;
    let articleCount = 0;

    for (const item of publish_list) {
      const publish_info: PublishInfo = JSON.parse(item.publish_info);
      let newEntryCount = 0;
      const articles: Record<string, unknown>[] = [];

      for (const article of publish_info.appmsgex) {
        const key = `${account.fakeid}:${article.aid}`;
        articles.push({ ...article, fakeid: account.fakeid, _status: '' });
        if (!existingKeys.has(key)) {
          newEntryCount++;
          articleCount++;
          existingKeys.add(key);
        }
      }

      if (articles.length > 0) {
        await storagePut('/api/storage/articles', {
          batch: true,
          fakeid: account.fakeid,
          articles,
          existingKeys: [],
        });
      }

      if (newEntryCount > 0) {
        msgCount++;
      }
    }

    await updateInfoCache({
      fakeid: account.fakeid,
      completed: publish_list.length === 0,
      count: msgCount,
      articles: articleCount,
      nickname: account.nickname,
      round_head_img: account.round_head_img,
      total_count: publish_page.total_count,
    });
    return;
  }

  await db.transaction('rw', ['article', 'info'], async () => {
    const keys = await db.article.toCollection().keys();

    const fakeid = account.fakeid;
    const total_count = publish_page.total_count;
    const publish_list = publish_page.publish_list.filter(item => !!item.publish_info);

    // 统计本次缓存成功新增的数量
    let msgCount = 0;
    let articleCount = 0;

    for (const item of publish_list) {
      const publish_info: PublishInfo = JSON.parse(item.publish_info);
      let newEntryCount = 0;

      for (const article of publish_info.appmsgex) {
        const key = await db.article.put({ ...article, fakeid, _status: '' }, `${fakeid}:${article.aid}`);
        if (!keys.includes(key)) {
          newEntryCount++;
          articleCount++;
        }
      }

      if (newEntryCount > 0) {
        // 新增成功
        msgCount++;
      }
    }

    await updateInfoCache({
      fakeid: fakeid,
      completed: publish_list.length === 0,
      count: msgCount,
      articles: articleCount,
      nickname: account.nickname,
      round_head_img: account.round_head_img,
      total_count: total_count,
    });
  });
}

/**
 * 检查是否存在指定时间之前的缓存
 * @param fakeid 公众号id
 * @param create_time 创建时间
 */
export async function hitCache(fakeid: string, create_time: number): Promise<boolean> {
  if (isMysqlStorage()) {
    return storageGet<boolean>('/api/storage/articles', {
      action: 'hit-cache',
      fakeid,
      create_time: String(create_time),
    });
  }

  const count = await db.article
    .where('fakeid')
    .equals(fakeid)
    .and(article => article.create_time < create_time)
    .count();
  return count > 0;
}

/**
 * 读取缓存中的指定时间之前的历史文章
 * @param fakeid 公众号id
 * @param create_time 创建时间
 */
export async function getArticleCache(fakeid: string, create_time: number): Promise<AppMsgExWithFakeID[]> {
  if (isMysqlStorage()) {
    return storageGet<AppMsgExWithFakeID[]>('/api/storage/articles', {
      fakeid,
      before: String(create_time),
    });
  }

  return db.article
    .where('fakeid')
    .equals(fakeid)
    .and(article => article.create_time < create_time)
    .reverse()
    .sortBy('create_time');
}

/**
 * 批量查询文章下载状态（HTML / 留言 / 阅读量）
 */
export async function getArticlesDownloadStatus(urls: string[]): Promise<Record<string, ArticleDownloadStatus>> {
  if (urls.length === 0) {
    return {};
  }

  if (isMysqlStorage()) {
    return $fetch<Record<string, ArticleDownloadStatus>>('/api/storage/articles/status', {
      method: 'POST',
      body: { urls },
    });
  }

  const [htmlKeys, commentKeys, metadataRows] = await Promise.all([
    db.html.where('url').anyOf(urls).keys(),
    db.comment.where('url').anyOf(urls).keys(),
    db.metadata.where('url').anyOf(urls).toArray(),
  ]);

  const htmlSet = new Set(htmlKeys);
  const commentSet = new Set(commentKeys);
  const metadataMap = new Map(metadataRows.map(row => [row.url, row]));

  const result: Record<string, ArticleDownloadStatus> = {};
  for (const url of urls) {
    const metadata = metadataMap.get(url);
    result[url] = {
      html: htmlSet.has(url),
      comment: commentSet.has(url),
      metadata: metadata
        ? {
            readNum: metadata.readNum,
            oldLikeNum: metadata.oldLikeNum,
            shareNum: metadata.shareNum,
            likeNum: metadata.likeNum,
            commentNum: metadata.commentNum,
          }
        : undefined,
    };
  }
  return result;
}

/**
 * 根据 url 获取文章对象
 * @param url
 */
export async function getArticleByLink(url: string): Promise<AppMsgExWithFakeID> {
  if (isMysqlStorage()) {
    const article = await storageGet<AppMsgExWithFakeID | null>('/api/storage/articles', { link: url });
    if (!article) {
      throw new Error(`Article(${url}) does not exist`);
    }
    return article;
  }

  const article = await db.article.where('link').equals(url).first();
  if (!article) {
    throw new Error(`Article(${url}) does not exist`);
  }
  return article;
}

// 根据 url 获取 SINGLE_ARTICLE_FAKEID 文章对象
export async function getSingleArticleByLink(url: string): Promise<AppMsgExWithFakeID> {
  if (isMysqlStorage()) {
    const article = await storageGet<AppMsgExWithFakeID | null>('/api/storage/articles', {
      link: url,
      singleOnly: 'true',
    });
    if (!article) {
      throw new Error(`Article(${url}) does not exist`);
    }
    return article;
  }

  const article = await db.article
    .where('link')
    .equals(url)
    .and(article => article.fakeid === 'SINGLE_ARTICLE_FAKEID')
    .first();
  if (!article) {
    throw new Error(`Article(${url}) does not exist`);
  }

  return article;
}

export async function putArticle(article: AppMsgExWithFakeID, id?: string): Promise<string> {
  if (isMysqlStorage()) {
    const result = await storagePut<{ key: string }>('/api/storage/articles', { article, id });
    return result.key;
  }

  return db.article.put(article, id ?? `${article.fakeid}:${article.aid}`);
}

export async function deleteArticle(id: string): Promise<void> {
  if (isMysqlStorage()) {
    await storageDelete('/api/storage/articles', { id });
    return;
  }

  await db.article.delete(id);
}

/**
 * 文章被删除
 * @param url
 * @param is_deleted
 */
export async function articleDeleted(url: string, is_deleted = true): Promise<void> {
  if (isMysqlStorage()) {
    await storagePatch('/api/storage/articles', {
      url,
      patch: { is_deleted },
    });
    return;
  }

  await db.transaction('rw', 'article', async () => {
    await db.article
      .where('link')
      .equals(url)
      .modify(article => {
        article.is_deleted = is_deleted;
      });
  });
}

/**
 * 更新文章状态
 * @param url
 * @param status
 */
export async function updateArticleStatus(url: string, status: string): Promise<void> {
  if (isMysqlStorage()) {
    await storagePatch('/api/storage/articles', {
      url,
      patch: { _status: status },
    });
    return;
  }

  await db.transaction('rw', 'article', async () => {
    await db.article
      .where('link')
      .equals(url)
      .modify(article => {
        article._status = status;
      });
  });
}

/**
 * 更新文章的fakeid
 * @param url
 * @param fakeid
 */
export async function updateArticleFakeid(url: string, fakeid: string): Promise<void> {
  if (isMysqlStorage()) {
    await storagePatch('/api/storage/articles', {
      url,
      singleOnly: true,
      patch: {
        fakeid,
        _single: true,
      },
    });
    return;
  }

  await db.transaction('rw', 'article', async () => {
    await db.article
      .where('link')
      .equals(url)
      .and(article => article.fakeid === 'SINGLE_ARTICLE_FAKEID')
      .modify(article => {
        article.fakeid = fakeid;

        // 标记改数据是【单篇文章下载】添加的
        article._single = true;
      });
  });
}
