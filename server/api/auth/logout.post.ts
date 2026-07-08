import { clearAuthCookie } from '~/server/utils/app-auth';

export default defineEventHandler(event => {
  clearAuthCookie(event);
  return {
    success: true,
  };
});
