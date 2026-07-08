import { defu } from 'defu';
import { MP_ORIGIN_TIMESTAMP } from '~/config';
import type { Preferences } from '~/types/preferences';

const defaultOptions: Preferences = {
  hideDeleted: true,
  privateProxyList: [],
  privateProxyAuthorization: '',
  exportConfig: {
    dirname: '${title}',
    maxlength: 0,
    exportExcelIncludeContent: true,
    exportJsonIncludeComments: true,
    exportJsonIncludeContent: true,
    exportHtmlIncludeComments: true,
  },
  downloadConfig: {
    forceDownloadContent: false,
    metadataOverrideContent: false,
  },
  accountSyncSeconds: 3,
  syncDateRange: 'all',
  syncDatePoint: MP_ORIGIN_TIMESTAMP,
};

// 全局状态变量（模块级，确保跨调用共享）
const preferencesState = ref<Preferences>({ ...defaultOptions });
const loadingState = ref(false);
const initializedState = ref(false);
const watchSetup = ref(false);

// 防抖保存
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

async function saveToDatabase(data: Preferences) {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(async () => {
    try {
      await $fetch('/api/storage/preferences', {
        method: 'PUT',
        body: data,
      });
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }, 500);
}

async function loadFromDatabase() {
  if (loadingState.value || initializedState.value) return;

  loadingState.value = true;
  try {
    const data = await $fetch<Partial<Preferences> | null>('/api/storage/preferences');
    if (data) {
      preferencesState.value = defu(data, defaultOptions) as Preferences;
    }
    initializedState.value = true;
  } catch (error) {
    console.error('Failed to load preferences:', error);
  } finally {
    loadingState.value = false;
  }
}

// 设置 watch（只在客户端执行一次）
if (import.meta.client && !watchSetup.value) {
  watchSetup.value = true;
  watch(
    preferencesState,
    newValue => {
      // 只有初始化完成后才保存
      if (initializedState.value) {
        saveToDatabase(newValue);
      }
    },
    { deep: true }
  );
}

export default function usePreferences(): Ref<Preferences> {
  // 服务端返回默认值（不访问数据库）
  if (import.meta.server) {
    return ref<Preferences>({ ...defaultOptions });
  }

  // 客户端：只初始化一次
  if (!initializedState.value && !loadingState.value) {
    loadFromDatabase();
  }

  return preferencesState;
}