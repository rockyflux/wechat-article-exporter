interface AuthSession {
  enabled: boolean;
  authenticated: boolean;
}

export default defineNuxtRouteMiddleware(async to => {
  let session: AuthSession;
  try {
    session = await $fetch<AuthSession>('/api/auth/session');
  } catch {
    if (to.path !== '/login') {
      return navigateTo('/login');
    }
    return;
  }

  if (!session.enabled) {
    if (to.path === '/login') {
      return navigateTo('/dashboard/account');
    }
    return;
  }

  if (to.path === '/login') {
    if (session.authenticated) {
      return navigateTo('/dashboard/account');
    }
    return;
  }

  if (!session.authenticated) {
    return navigateTo('/login');
  }
});
