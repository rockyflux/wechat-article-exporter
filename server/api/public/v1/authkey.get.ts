import { isMysqlEnabled } from '~/server/utils/mysql/pool';
import { mysqlGetLatestAuthKey, mysqlGetAuthKey } from '~/server/utils/mysql/repository';
import { getAuthKeyFromRequest } from '~/server/utils/proxy-request';
import dayjs from 'dayjs';

/**
 * 获取当前 auth-key 状态
 * @description 返回 auth-key 是否有效、过期时间等信息
 *
 * 使用方式：
 * GET /api/public/v1/authkey - 获取最新的 auth-key 状态
 * GET /api/public/v1/authkey (带 X-Auth-Key header) - 验证指定的 auth-key
 */
export default defineEventHandler(async event => {
  const authKey = getAuthKeyFromRequest(event);

  if (!isMysqlEnabled()) {
    // MySQL 未启用时，只做简单验证
    if (authKey) {
      return {
        code: 0,
        valid: true,
        authKey,
        message: 'auth-key 有效（非 MySQL 存储，无法获取过期时间）',
      };
    }
    return {
      code: -1,
      valid: false,
      message: 'auth-key 无效',
    };
  }

  // 如果请求中指定了 auth-key，验证该 auth-key
  if (authKey) {
    const row = await mysqlGetAuthKey(authKey);
    if (row) {
      const expireDate = dayjs.unix(row.expire_time);
      const now = dayjs();
      const remainingHours = expireDate.diff(now, 'hour', true);

      return {
        code: 0,
        valid: true,
        authKey: row.auth_key,
        createTime: dayjs.unix(row.create_time).format('YYYY-MM-DD HH:mm:ss'),
        expireTime: expireDate.format('YYYY-MM-DD HH:mm:ss'),
        remainingHours: Math.max(0, remainingHours).toFixed(1),
        isExpired: remainingHours <= 0,
        message: `auth-key 有效，将在 ${expireDate.format('YYYY-MM-DD HH:mm')} 过期`,
      };
    }
    return {
      code: -1,
      valid: false,
      message: 'auth-key 无效或已过期',
    };
  }

  // 获取最新的 auth-key 状态
  const row = await mysqlGetLatestAuthKey();
  if (row) {
    const expireDate = dayjs.unix(row.expire_time);
    const now = dayjs();
    const remainingHours = expireDate.diff(now, 'hour', true);

    return {
      code: 0,
      valid: true,
      authKey: row.auth_key,
      createTime: dayjs.unix(row.create_time).format('YYYY-MM-DD HH:mm:ss'),
      expireTime: expireDate.format('YYYY-MM-DD HH:mm:ss'),
      remainingHours: Math.max(0, remainingHours).toFixed(1),
      isExpired: remainingHours <= 0,
      message: remainingHours > 0
        ? `当前登录有效，将在 ${expireDate.format('YYYY-MM-DD HH:mm')} 过期（剩余 ${remainingHours.toFixed(1)} 小时）`
        : '登录已过期，请重新扫码登录',
    };
  }

  return {
    code: -1,
    valid: false,
    message: '未找到有效的 auth-key，请先扫码登录',
  };
});