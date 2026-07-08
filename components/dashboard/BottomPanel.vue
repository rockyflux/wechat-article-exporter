<script setup lang="ts">
import { request } from '#shared/utils/request';
import LoginModal from '~/components/modal/Login.vue';
import StorageUsage from '~/components/StorageUsage.vue';
import { IMAGE_PROXY } from '~/config';
import type { LogoutResponse } from '~/types/types';

interface AuthKeyStatus {
  code: number;
  valid: boolean;
  authKey?: string;
  createTime?: string;
  expireTime?: string;
  remainingHours?: string;
  isExpired?: boolean;
  message?: string;
}

const loginAccount = useLoginAccount();
const modal = useModal();

const now = ref(new Date());

/**
 * 计算剩余时间，格式：X天 HH:mm
 */
const remainingTime = computed(() => {
  if (!loginAccount.value) {
    return '';
  }

  const expires = new Date(loginAccount.value.expires);
  const diff = expires.getTime() - now.value.getTime();

  if (diff <= 0) {
    window.clearInterval(timer);
    setTimeout(() => {
      loginAccount.value = null;
    }, 0);
    return '已过期';
  }

  // 计算天、时、分
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  // 格式化显示
  const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  if (days > 0) {
    return `${days}天 ${timeStr}`;
  }
  return timeStr;
});

const warning = computed(() => {
  if (!loginAccount.value) {
    return false;
  }
  const expires = new Date(loginAccount.value.expires);
  const diff = expires.getTime() - now.value.getTime();
  // 小于 1 小时显示警告
  return diff > 0 && diff < 60 * 60 * 1000;
});

function login() {
  modal.open(LoginModal);
}

const logoutBtnLoading = ref(false);

async function logout() {
  logoutBtnLoading.value = true;
  const { statusCode, statusText } = await request<LogoutResponse>('/api/web/mp/logout');
  // 接口调用失败时，提示消息，但是不阻止前端退出
  if (statusCode !== 200) {
    alert(statusText);
  }
  loginAccount.value = null;
  logoutBtnLoading.value = false;
}

/**
 * 从服务器获取最新的登录状态
 * @description 用于同步服务端 MySQL 存储的 auth-key 过期时间
 */
async function refreshAuthKeyStatus() {
  if (!loginAccount.value) {
    return;
  }

  try {
    const status = await $fetch<AuthKeyStatus>('/api/public/v1/authkey');
    if (status.code === 0 && status.valid && status.expireTime) {
      // 更新本地存储的过期时间
      loginAccount.value = {
        ...loginAccount.value,
        expires: status.expireTime,
      };
    } else if (status.code !== 0 || !status.valid) {
      // auth-key 无效，清除本地登录状态
      loginAccount.value = null;
    }
  } catch (error) {
    console.error('获取 auth-key 状态失败:', error);
  }
}

let timer: number;
onMounted(async () => {
  // 从服务器获取最新的登录状态
  await refreshAuthKeyStatus();

  // 启动定时器更新显示（每秒）
  timer = window.setInterval(() => {
    now.value = new Date();
  }, 1000);

  // 每 5 分钟刷新一次服务器状态
  window.setInterval(() => {
    refreshAuthKeyStatus();
  }, 5 * 60 * 1000);
});
onUnmounted(() => {
  window.clearInterval(timer);
});
</script>

<template>
  <footer class="flex flex-col space-y-2 pt-3 border-t dark:border-slate-600">
    <div v-if="loginAccount" class="space-y-3">
      <div class="flex items-center space-x-2">
        <img
          v-if="loginAccount.avatar"
          :src="IMAGE_PROXY + loginAccount.avatar"
          alt=""
          class="rounded-full size-10 ring-1 ring-gray-300"
        />
        <UTooltip
          v-if="loginAccount.nickname"
          class="flex-1 overflow-hidden"
          :popper="{ placement: 'top-start', offsetDistance: 16 }"
        >
          <template #text>
            <span>{{ loginAccount.nickname }}</span>
          </template>
          <span class="whitespace-nowrap text-ellipsis overflow-hidden">{{ loginAccount.nickname }}</span>
        </UTooltip>

        <UButton
          icon="i-heroicons-arrow-left-start-on-rectangle-16-solid"
          :loading="logoutBtnLoading"
          class="bg-slate-10 hover:bg-rose-500 disabled:bg-rose-500"
          @click="logout"
          >退出
        </UButton>
      </div>
      <div class="text-sm">
        <span>登录信息过期时间还剩: </span>
        <span class="font-mono" :class="warning ? 'text-rose-500' : 'text-green-500'">{{ remainingTime }}</span>
      </div>
    </div>
    <div v-else>
      <UButton color="gray" variant="solid" @click="login">登录公众号</UButton>
    </div>
    <StorageUsage />
  </footer>
</template>