<template>
  <div class="flex items-center gap-2 flex-wrap">
    <USelectMenu
      :class="selectClass"
      v-model="preferences.syncDateRange"
      :options="DURATION_OPTIONS"
      value-attribute="value"
      option-attribute="label"
    />
    <UPopover v-if="showSyncDatePicker()" :popper="{ placement: 'bottom-start' }">
      <UButton color="gray" size="sm" icon="i-heroicons-calendar-days-20-solid" :label="formatSyncDatePoint()" />

      <template #panel="{ close }">
        <BaseDatePicker v-model="preferences.syncDatePoint" is-required @close="close" />
      </template>
    </UPopover>
    <span v-if="showRange" class="text-sm text-blue-500 font-medium whitespace-nowrap">
      同步范围: {{ getActualDateRange() }}
    </span>
  </div>
</template>

<script setup lang="ts">
import type { Preferences } from '~/types/preferences';

withDefaults(
  defineProps<{
    showRange?: boolean;
    selectClass?: string;
  }>(),
  {
    showRange: true,
    selectClass: 'w-36',
  },
);

const { getActualDateRange, getSelectOptions, showSyncDatePicker, formatSyncDatePoint } = useSyncDeadline();

const preferences = usePreferences() as unknown as Ref<Preferences>;

const DURATION_OPTIONS = getSelectOptions();
</script>
