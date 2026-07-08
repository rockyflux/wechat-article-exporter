import { createHmac, timingSafeEqual } from 'node:crypto';
import type { H3Event } from 'h3';
import { deleteCookie, getCookie, setCookie } from 'h3';

export const APP_AUTH_COOKIE = 'app-auth';
const AUTH_TOKEN_SALT = 'wechat-article-exporter-app-auth';
const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export function isAppAuthEnabled(accessKey: string): boolean {
  return Boolean(accessKey);
}

export function createAuthToken(accessKey: string): string {
  return createHmac('sha256', accessKey).update(AUTH_TOKEN_SALT).digest('hex');
}

export function verifyAuthToken(token: string, accessKey: string): boolean {
  const expected = createAuthToken(accessKey);
  if (token.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export function isAuthenticated(event: H3Event, accessKey: string): boolean {
  const token = getCookie(event, APP_AUTH_COOKIE);
  if (!token) {
    return false;
  }
  return verifyAuthToken(token, accessKey);
}

export function setAuthCookie(event: H3Event, accessKey: string): void {
  setCookie(event, APP_AUTH_COOKIE, createAuthToken(accessKey), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: AUTH_COOKIE_MAX_AGE,
  });
}

export function clearAuthCookie(event: H3Event): void {
  deleteCookie(event, APP_AUTH_COOKIE, {
    path: '/',
  });
}
