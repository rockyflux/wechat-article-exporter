import { type CookieEntity } from '~/server/utils/CookieStore';
import { isMysqlEnabled } from '~/server/utils/mysql/pool';
import { mysqlGetAuthKey, mysqlSetAuthKey } from '~/server/utils/mysql/repository';

export type CookieKVKey = string;

export interface CookieKVValue {
  token: string;
  cookies: CookieEntity[];
}

// 默认过期时间：4 天（秒）
const DEFAULT_EXPIRE_TTL = 60 * 60 * 24 * 4;

/**
 * 存储 auth-key 数据
 * @description 优先使用 MySQL 存储，否则降级到 KV 存储
 */
export async function setMpCookie(key: CookieKVKey, data: CookieKVValue): Promise<boolean> {
  // 优先使用 MySQL 存储
  if (isMysqlEnabled()) {
    try {
      const expireTime = Math.floor(Date.now() / 1000) + DEFAULT_EXPIRE_TTL;
      await mysqlSetAuthKey(key, data.token, data.cookies, expireTime);
      return true;
    } catch (err) {
      console.error('mysqlSetAuthKey failed:', err);
      // 降级到 KV 存储
    }
  }

  // 使用 KV 存储（原有逻辑）
  const kv = useStorage('kv');
  try {
    await kv.set<CookieKVValue>(`cookie:${key}`, data, {
      expirationTtl: DEFAULT_EXPIRE_TTL,
    });
    return true;
  } catch (err) {
    console.error('kv.set call failed:', err);
    return false;
  }
}

/**
 * 获取 auth-key 数据
 * @description 优先从 MySQL 读取，否则从 KV 存储
 */
export async function getMpCookie(key: CookieKVKey): Promise<CookieKVValue | null> {
  // 优先从 MySQL 读取
  if (isMysqlEnabled()) {
    try {
      const row = await mysqlGetAuthKey(key);
      if (row) {
        return {
          token: row.token,
          cookies: row.cookies as CookieEntity[],
        };
      }
    } catch (err) {
      console.error('mysqlGetAuthKey failed:', err);
      // 降级到 KV 存储
    }
  }

  // 从 KV 存储读取（原有逻辑）
  const kv = useStorage('kv');
  return await kv.get<CookieKVValue>(`cookie:${key}`);
}
