<template>
  <UCard class="mx-4 mt-10 flex-1">
    <template #header>
      <h3 class="text-2xl font-semibold">自动入库标签</h3>
      <p class="text-sm text-slate-10 font-serif">
        文章入库时，根据标题或摘要中的关键词自动设置 <code class="font-mono">tag</code> 字段。每条规则内关键词为「或」关系，命中任一关键词即应用对应标签。
      </p>
    </template>

    <div class="space-y-4">
      <div
        v-if="preferences.autoTagRules.length === 0"
        class="rounded-md border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500"
      >
        暂无规则，点击下方按钮添加
      </div>

      <div
        v-for="(rule, index) in preferences.autoTagRules"
        :key="index"
        class="flex flex-wrap items-start gap-3 rounded-md border border-slate-200 p-4"
      >
        <div class="w-40">
          <p class="mb-1 text-sm text-slate-600">标签名</p>
          <UInput v-model="rule.tag" placeholder="例如：湘超" />
        </div>
        <div class="min-w-[320px] flex-1">
          <p class="mb-1 text-sm text-slate-600">匹配关键词</p>
          <UInput
            :model-value="keywordInputs[index]"
            placeholder="例如：进球,点球,湘超,足球,VS，vs"
            @update:model-value="value => updateKeywords(index, value)"
          />
          <p class="mt-1 text-xs text-slate-400">支持中英文逗号分隔；匹配时忽略空格，英文不区分大小写</p>
        </div>
        <UButton
          class="mt-6"
          color="red"
          variant="ghost"
          icon="i-lucide:trash-2"
          @click="removeRule(index)"
        />
      </div>

      <div class="flex items-center gap-3">
        <UButton color="black" icon="i-lucide:plus" @click="addRule">添加规则</UButton>
        <p class="text-xs text-slate-400">修改后会自动保存，新同步或入库的文章将按规则自动打标签</p>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { formatKeywords, parseKeywords } from '~/shared/utils/auto-tag';
import type { Preferences } from '~/types/preferences';

const preferences = usePreferences() as unknown as Ref<Preferences>;

const keywordInputs = computed(() =>
  preferences.value.autoTagRules.map(rule => formatKeywords(rule.keywords))
);

function addRule() {
  preferences.value.autoTagRules.push({
    tag: '',
    keywords: [],
  });
}

function removeRule(index: number) {
  preferences.value.autoTagRules.splice(index, 1);
}

function updateKeywords(index: number, value: string) {
  const rule = preferences.value.autoTagRules[index];
  if (!rule) {
    return;
  }

  rule.keywords = parseKeywords(value);
}
</script>
