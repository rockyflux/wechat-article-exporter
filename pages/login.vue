<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-1 dark:bg-slate-900 p-4">
    <UCard class="w-full max-w-md">
      <template #header>
        <div class="text-center space-y-1">
          <h1 class="text-2xl font-bold">{{ websiteName }}</h1>
          <p class="text-sm text-gray-500">请输入访问密钥登录</p>
        </div>
      </template>

      <form class="space-y-4" @submit.prevent="handleLogin">
        <UFormGroup label="访问密钥">
          <UInput
            v-model="key"
            type="password"
            placeholder="请输入密钥"
            autocomplete="current-password"
            :disabled="loading"
          />
        </UFormGroup>

        <UAlert v-if="error" color="red" variant="soft" :title="error" />

        <UButton type="submit" block color="primary" :loading="loading">登录</UButton>
      </form>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { websiteName } from '~/config';

definePageMeta({
  layout: false,
});

useHead({
  title: `登录 | ${websiteName}`,
});

const key = ref('');
const loading = ref(false);
const error = ref('');

async function handleLogin() {
  if (!key.value.trim()) {
    error.value = '请输入访问密钥';
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: {
        key: key.value.trim(),
      },
    });
    await navigateTo('/dashboard/account');
  } catch (err: any) {
    error.value = err?.data?.statusMessage || err?.statusMessage || '登录失败，请检查密钥是否正确';
  } finally {
    loading.value = false;
  }
}
</script>
