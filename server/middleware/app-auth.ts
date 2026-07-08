import { getRequestURL } from 'h3';
import { isAppAuthEnabled, isAuthenticated } from '~/server/utils/app-auth';

export default defineEventHandler(event => {
  const config = useRuntimeConfig();
  const accessKey = config.appAccessKey as string;

  if (!isAppAuthEnabled(accessKey)) {
    return;
  }

  const pathname = getRequestURL(event).pathname;

  // 白名单路径：认证相关和登录相关
  if (pathname.startsWith('/api/auth/')) {
    return;
  }

  // 登录流程相关接口不需要认证
  if (pathname.startsWith('/api/web/login/')) {
    return;
  }

  // 获取公众号信息接口（登录流程内部调用）
  if (pathname === '/api/web/mp/info') {
    return;
  }

  if (!pathname.startsWith('/api/')) {
    return;
  }

  if (!isAuthenticated(event, accessKey)) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    });
  }
});
