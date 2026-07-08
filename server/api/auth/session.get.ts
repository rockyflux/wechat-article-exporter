import { isAppAuthEnabled, isAuthenticated } from '~/server/utils/app-auth';

export default defineEventHandler(event => {
  const config = useRuntimeConfig();
  const accessKey = config.appAccessKey as string;
  const enabled = isAppAuthEnabled(accessKey);

  return {
    enabled,
    authenticated: enabled ? isAuthenticated(event, accessKey) : true,
  };
});
