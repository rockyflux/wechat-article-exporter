import { setAuthCookie, isAppAuthEnabled } from '~/server/utils/app-auth';

interface LoginBody {
  key?: string;
}

export default defineEventHandler(async event => {
  const config = useRuntimeConfig();
  const accessKey = config.appAccessKey as string;

  if (!isAppAuthEnabled(accessKey)) {
    throw createError({
      statusCode: 503,
      statusMessage: 'App access key is not configured',
    });
  }

  const { key } = await readBody<LoginBody>(event);
  if (!key || key !== accessKey) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid access key',
    });
  }

  setAuthCookie(event, accessKey);

  return {
    success: true,
  };
});
