// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-10-30',
  devtools: {
    enabled: false,
  },
  modules: ['@vueuse/nuxt', '@nuxt/ui', 'nuxt-monaco-editor', '@sentry/nuxt/module', 'nuxt-umami'],
  ssr: false,
  runtimeConfig: {
    public: {
      aggridLicense: process.env.NUXT_AGGRID_LICENSE,
      storageDriver: process.env.NUXT_STORAGE_DRIVER || 'indexeddb',
      sentry: {
        dsn: process.env.NUXT_SENTRY_DSN,
      },
    },
    storageDriver: process.env.NUXT_STORAGE_DRIVER || 'indexeddb',
    mysql: {
      host: process.env.MYSQL_HOST || '',
      port: process.env.MYSQL_PORT || '3306',
      database: process.env.MYSQL_DATABASE || '',
      user: process.env.MYSQL_USER || '',
      password: process.env.MYSQL_PASSWORD || '',
    },
    debugMpRequest: false,
    appAccessKey: process.env.APP_ACCESS_KEY || '',
  },
  app: {
    head: {
      meta: [
        {
          name: 'referrer',
          content: 'no-referrer',
        },
      ],
      script: [
        {
          src: '/vendors/html-docx-js@0.3.1/html-docx.js',
          defer: true,
        },
      ],
    },
  },
  sourcemap: {
    client: 'hidden',
  },
  nitro: {
    minify: process.env.NODE_ENV === 'production',
    rollupConfig: {
      external: ['puppeteer'],
    },
    storage: {
      kv: {
        driver: process.env.NITRO_KV_DRIVER || 'memory',
        base: process.env.NITRO_KV_BASE,
      },
    },
  },
  monacoEditor: {
    locale: 'en',
    componentName: {
      codeEditor: 'MonacoEditor', // 普通编辑器组件名
      diffEditor: 'MonacoDiffEditor', // 差异编辑器组件名
    },
  },

  // https://docs.sentry.io/platforms/javascript/guides/nuxt/manual-setup/
  sentry: {
    org: process.env.NUXT_SENTRY_ORG,
    project: process.env.NUXT_SENTRY_PROJECT,
    authToken: process.env.NUXT_SENTRY_AUTH_TOKEN,
    telemetry: false,
  },

  // https://umami.nuxt.dev/api/configuration
  umami: {
    enabled: true,
    id: process.env.NUXT_UMAMI_ID,
    host: process.env.NUXT_UMAMI_HOST,
    domains: ['down.mptext.top'],
    ignoreLocalhost: true,
    autoTrack: true,
    logErrors: true,
  },
});
