/**
 * 定时同步所有公众号文章接口
 * @description 通过 auth-key 鉴权，同步所有公众号的最新文章（最近24小时）
 *
 * 使用方式：
 * GET /api/public/v1/sync
 * Header: X-Auth-Key: <your-auth-key>
 * 或者 Cookie: auth-key=<your-auth-key>
 *
 * 可选参数：
 * - hours: 同步最近 N 小时的文章，默认 24
 */

import { getMpCookie } from '~/server/kv/cookie';
import { isMysqlEnabled } from '~/server/utils/mysql/pool';
import {
  mysqlGetAllAccounts,
  mysqlUpsertArticles,
  mysqlUpdateLastUpdateTime,
  mysqlUpsertAccount,
  type MpAccountRow,
} from '~/server/utils/mysql/repository';
import type { PublishPage, PublishInfo, AppMsgPublishResponse } from '~/types/types';

// 默认同步最近24小时的文章
const DEFAULT_SYNC_HOURS = 24;
// 每次请求的文章数量
const PAGE_SIZE = 5;
// 请求间隔（毫秒）
const REQUEST_INTERVAL = 500;

export default defineEventHandler(async event => {
  // 检查 MySQL 是否启用
  if (!isMysqlEnabled()) {
    return {
      success: false,
      code: -1,
      message: '此接口需要启用 MySQL 存储',
    };
  }

  // 从请求头或 cookie 获取 auth-key
  const authKey = getRequestHeader(event, 'X-Auth-Key') || getCookie(event, 'auth-key');

  if (!authKey) {
    return {
      success: false,
      code: -1,
      message: '缺少 auth-key，请先登录微信公众号平台',
    };
  }

  // 验证 auth-key 是否有效
  const cookieData = await getMpCookie(authKey);
  if (!cookieData) {
    return {
      success: false,
      code: -1,
      message: 'auth-key 无效或已过期，请重新登录',
    };
  }

  // 获取同步时间范围参数
  const query = getQuery(event);
  const syncHours = Number(query.hours) || DEFAULT_SYNC_HOURS;

  const { token, cookies } = cookieData;
  const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

  try {
    // 获取所有公众号
    const accounts = await mysqlGetAllAccounts();

    if (accounts.length === 0) {
      return {
        success: true,
        code: 0,
        message: '没有需要同步的公众号',
        data: {
          totalAccounts: 0,
          syncedAccounts: 0,
          totalArticles: 0,
          syncHours,
        },
      };
    }

    // 计算同步截止时间戳
    const syncDeadline = Math.floor(Date.now() / 1000) - syncHours * 3600;

    const results: Array<{
      fakeid: string;
      nickname: string;
      articlesSynced: number;
      status: 'success' | 'failed' | 'no_new_articles' | 'skipped';
      error?: string;
    }> = [];

    let totalArticlesSynced = 0;
    let successCount = 0;

    // 遍历每个公众号进行同步
    for (const account of accounts) {
      try {
        const result = await syncAccountArticles(account, token, cookieString, syncDeadline);
        results.push(result);

        if (result.status === 'success') {
          successCount++;
          totalArticlesSynced += result.articlesSynced;
        }
      } catch (error) {
        results.push({
          fakeid: account.fakeid,
          nickname: account.nickname || '',
          articlesSynced: 0,
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      success: true,
      code: 0,
      message: `同步完成，共同步 ${successCount} 个公众号，${totalArticlesSynced} 篇新文章`,
      data: {
        totalAccounts: accounts.length,
        syncedAccounts: successCount,
        totalArticles: totalArticlesSynced,
        syncHours,
        results,
      },
    };
  } catch (error) {
    console.error('同步失败:', error);
    return {
      success: false,
      code: -1,
      message: `同步失败: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
});

/**
 * 同步单个公众号的文章
 */
async function syncAccountArticles(
  account: MpAccountRow,
  token: string,
  cookieString: string,
  syncDeadline: number
): Promise<{
  fakeid: string;
  nickname: string;
  articlesSynced: number;
  status: 'success' | 'failed' | 'no_new_articles' | 'skipped';
  error?: string;
}> {
  const fakeid = account.fakeid;
  const nickname = account.nickname || '';
  let articlesSynced = 0;
  let begin = 0;
  let msgCount = 0;
  let hasNewArticles = false;

  // 循环获取文章直到超过同步时间范围
  while (true) {
    const params: Record<string, string | number> = {
      sub: 'list',
      search_field: 'null',
      begin: begin,
      count: PAGE_SIZE,
      query: '',
      fakeid: fakeid,
      type: '101_1',
      free_publish_type: 1,
      sub_action: 'list_ex',
      token: token,
      lang: 'zh_CN',
      f: 'json',
      ajax: 1,
    };

    const endpoint = 'https://mp.weixin.qq.com/cgi-bin/appmsgpublish?' + new URLSearchParams(params as Record<string, string>).toString();

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Cookie': cookieString,
        'Referer': 'https://mp.weixin.qq.com/',
        'Origin': 'https://mp.weixin.qq.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const resp = (await response.json()) as AppMsgPublishResponse;

    if (resp.base_resp.ret !== 0) {
      if (resp.base_resp.ret === 200003) {
        return {
          fakeid,
          nickname,
          articlesSynced: 0,
          status: 'failed',
          error: '登录已过期，请重新登录',
        };
      }
      return {
        fakeid,
        nickname,
        articlesSynced: 0,
        status: 'failed',
        error: `${resp.base_resp.ret}: ${resp.base_resp.err_msg}`,
      };
    }

    const publish_page: PublishPage = JSON.parse(resp.publish_page);
    const publish_list = publish_page.publish_list.filter(item => !!item.publish_info);

    // 没有更多文章了
    if (publish_list.length === 0) {
      break;
    }

    // 解析文章并检查时间
    let shouldStop = false;
    const articlesToSave: Record<string, unknown>[] = [];

    for (const item of publish_list) {
      const publish_info: PublishInfo = JSON.parse(item.publish_info);

      for (const article of publish_info.appmsgex) {
        // 检查文章是否在同步时间范围内
        if (article.create_time < syncDeadline) {
          shouldStop = true;
        } else {
          articlesToSave.push({ ...article, fakeid, _status: '' });
          articlesSynced++;
        }
      }
    }

    // 如果有新文章，保存到数据库
    if (articlesToSave.length > 0) {
      hasNewArticles = true;
      const { msgCount: newMsgCount, articleCount } = await mysqlUpsertArticles(fakeid, articlesToSave, []);
      msgCount += newMsgCount;
    }

    // 如果最早的文章已经超过同步范围，停止同步
    if (shouldStop) {
      break;
    }

    // 继续下一页
    begin += publish_list.length;

    // 避免请求过快
    await sleep(REQUEST_INTERVAL);
  }

  // 更新公众号统计信息
  if (hasNewArticles) {
    const now = Math.floor(Date.now() / 1000);
    await mysqlUpsertAccount({
      ...account,
      count: account.count + msgCount,
      articles: account.articles + articlesSynced,
      update_time: now,
      last_update_time: now,
    });
  }

  return {
    fakeid,
    nickname,
    articlesSynced,
    status: articlesSynced > 0 ? 'success' : 'no_new_articles',
  };
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
