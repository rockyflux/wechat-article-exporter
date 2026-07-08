<script setup lang="ts">
import { isMysqlStorage } from '~/store/v2/storage-client';

const usage = ref('');
const storageMode = computed(() => (isMysqlStorage() ? 'MySQL 服务端' : '浏览器 IndexedDB'));

async function init() {
  if (isMysqlStorage()) {
    usage.value = '数据存储在服务端 MySQL';
    return;
  }

  const storageUsage = await navigator.storage.estimate();
  const bytes = storageUsage.usage!;
  if (bytes < 1000) {
    usage.value = `${bytes} B`;
  } else if (bytes < 1000 ** 2) {
    usage.value = `${(bytes / 1000).toFixed(0)} kB`;
  } else if (bytes < 1000 ** 3) {
    usage.value = `${(bytes / 1000 ** 2).toFixed(1)} M`;
  } else {
    usage.value = `${(bytes / 1000 ** 3).toFixed(1)} G`;
  }
}

let timer: number;
onMounted(() => {
  timer = window.setInterval(() => {
    init();
  }, 1000);
});
onUnmounted(() => {
  window.clearInterval(timer);
});
</script>

<template>
  <p class="text-sm">
    当前存储：<span class="text-slate-600">{{ storageMode }}</span>，
    <template v-if="isMysqlStorage()">占用由服务端数据库管理</template>
    <template v-else>本地数据库占用约为 <span class="text-rose-500">{{ usage }}</span></template>
  </p>
</template>
