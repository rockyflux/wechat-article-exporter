<script setup lang="ts">
import type {
  ColDef,
  GetRowIdParams,
  GridApi,
  GridOptions,
  GridReadyEvent,
  ICellRendererParams,
} from 'ag-grid-community';
import { AgGridVue } from 'ag-grid-vue3';
import { defu } from 'defu';
import GridAlbum from '~/components/grid/Album.vue';
import GridCoverTooltip from '~/components/grid/CoverTooltip.vue';
import GridStatusBar from '~/components/grid/StatusBar.vue';
import { websiteName } from '~/config';
import { sharedGridOptions } from '~/config/shared-grid-options';
import { getAllInfo } from '~/store/v2/info';
import { formatTimeStamp } from '#shared/utils/helpers';
import { useToast } from '#imports';

useHead({
  title: `文章列表 | ${websiteName}`,
});

const toast = useToast();

interface ArticleRow {
  fakeid: string;
  aid: string;
  link: string;
  title: string;
  publish_time: number;
  db_time: number;
  create_time: number;
  cover: string;
  appmsg_album_infos: Array<{ title: string; album_id: number; id: string }>;
  author_name: string;
  is_deleted: boolean;
  _status: string;
  tag: string;
}

const columnDefs = ref<ColDef[]>([
  {
    headerName: '公众号',
    field: 'nickname',
    cellDataType: 'text',
    filter: 'agTextColumnFilter',
    minWidth: 120,
    valueGetter: (params) => {
      const fakeid = params.data?.fakeid;
      const account = accounts.value.find(a => a.fakeid === fakeid);
      return account?.nickname || fakeid || '';
    },
  },
  {
    headerName: '链接',
    field: 'link',
    cellRenderer: (params: ICellRendererParams) => {
      const url = params.value;
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: underline;">打开</a>`;
    },
    sortable: false,
    filter: false,
    minWidth: 80,
    cellClass: 'flex justify-center items-center',
  },
  {
    headerName: '标题',
    field: 'title',
    cellDataType: 'text',
    filter: 'agTextColumnFilter',
    tooltipField: 'title',
    minWidth: 300,
  },
  {
    headerName: '发布时间',
    field: 'publish_time',
    valueFormatter: p => formatTimeStamp(p.value),
    filter: 'agDateColumnFilter',
    minWidth: 160,
    sort: 'desc',
    cellClass: 'flex justify-center items-center font-mono',
  },
  {
    headerName: '入库时间',
    field: 'db_time',
    valueFormatter: p => formatTimeStamp(p.value),
    filter: 'agDateColumnFilter',
    minWidth: 160,
    initialHide: false,
    cellClass: 'flex justify-center items-center font-mono',
  },
  {
    headerName: '封面',
    field: 'cover',
    sortable: false,
    filter: false,
    cellRenderer: (params: ICellRendererParams) => {
      if (!params.value) return '';
      return `<img alt="" src="${params.value}" style="height: 40px; width: 40px; object-fit: cover;" />`;
    },
    tooltipField: 'cover',
    tooltipComponent: GridCoverTooltip,
    minWidth: 80,
    cellClass: 'flex justify-center items-center',
  },
  {
    headerName: '所属合集',
    field: 'appmsg_album_infos',
    cellRenderer: GridAlbum,
    sortable: false,
    filter: false,
    valueFormatter: p => p.value?.map((album: any) => album.title).join(',') || '',
    minWidth: 150,
    initialHide: false,
  },
  {
    headerName: '作者',
    field: 'author_name',
    cellDataType: 'text',
    filter: 'agTextColumnFilter',
    minWidth: 120,
    cellClass: 'flex justify-center items-center',
  },
  {
    headerName: '标签',
    field: 'tag',
    cellDataType: 'text',
    filter: 'agTextColumnFilter',
    minWidth: 100,
    cellClass: 'flex justify-center items-center',
  },
]);

const gridOptions: GridOptions = defu(
  {
    getRowId: (params: GetRowIdParams) => `${params.data.fakeid}:${params.data.aid}`,
    rowSelection: { mode: 'multiRow' },
    statusBar: {
      statusPanels: [
        {
          statusPanel: GridStatusBar,
          align: 'left',
        },
      ],
    },
  },
  sharedGridOptions
);

const gridApi = shallowRef<GridApi | null>(null);
function onGridReady(params: GridReadyEvent) {
  gridApi.value = params.api;
}

// 选中状态
const selectedRows = ref<ArticleRow[]>([]);
function onSelectionChanged() {
  selectedRows.value = gridApi.value?.getSelectedRows() || [];
}

// 加载状态
const loading = ref(false);

// 分页参数
const currentPage = ref(1);
const pageSize = ref(20);
const totalItems = ref(0);

// 篩选参数
const accounts = ref<Array<{ fakeid: string; nickname?: string }>>([]);
const selectedFakeid = ref<string | undefined>();

// 获取当天日期字符串 (YYYY-MM-DD 格式)
function getTodayStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 将日期字符串转为 Date 对象
function parseDate(dateStr: string | undefined): Date | undefined {
  if (!dateStr) return undefined;
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// 开始时间和结束时间，默认为当天
const startTimeStr = ref<string>(getTodayStr());
const endTimeStr = ref<string>(getTodayStr());

// 标题搜索
const searchTitle = ref<string>('');

// 标签筛选
const selectedTag = ref<string | undefined>();
const filterTags = ref<string[]>([]);

// 计算属性，用于实际查询
const startTime = computed(() => parseDate(startTimeStr.value));
const endTime = computed(() => parseDate(endTimeStr.value));

// 初始化加载公众号列表和标签
onMounted(async () => {
  const accountList = await getAllInfo();
  accounts.value = accountList.map(a => ({
    fakeid: a.fakeid,
    nickname: a.nickname,
  }));
  // 加载标签列表
  try {
    const result = await $fetch<{ tags: string[] }>('/api/storage/articles/tags');
    filterTags.value = result.tags;
  } catch (error) {
    console.error('加载标签失败:', error);
  }
  // 初始加载文章列表
  loadArticles();
});

// 加载文章列表
async function loadArticles() {
  loading.value = true;
  try {
    const params: Record<string, any> = {
      page: currentPage.value,
      pageSize: pageSize.value,
    };

    if (selectedFakeid.value) {
      params.fakeid = selectedFakeid.value;
    }

    if (startTime.value) {
      params.startTime = Math.floor(startTime.value.getTime() / 1000);
    }

    if (endTime.value) {
      // 结束时间设置为当天的最后一秒
      const end = new Date(endTime.value);
      end.setHours(23, 59, 59, 999);
      params.endTime = Math.floor(end.getTime() / 1000);
    }

    if (searchTitle.value.trim()) {
      params.title = searchTitle.value.trim();
    }

    if (selectedTag.value) {
      params.tag = selectedTag.value;
    }

    const result = await $fetch<{
      items: ArticleRow[];
      total: number;
      page: number;
      pageSize: number;
    }>('/api/storage/articles/list', {
      params,
    });

    totalItems.value = result.total;
    gridApi.value?.setGridOption('rowData', result.items);
  } catch (error) {
    console.error('加载文章列表失败:', error);
  } finally {
    loading.value = false;
  }
}

// 监听分页变化
watch([currentPage, pageSize], () => {
  loadArticles();
});

// 查询按钮点击
function handleSearch() {
  currentPage.value = 1;
  loadArticles();
}

// 重置筛选
function resetFilters() {
  selectedFakeid.value = undefined;
  startTimeStr.value = getTodayStr();
  endTimeStr.value = getTodayStr();
  searchTitle.value = '';
  selectedTag.value = undefined;
  currentPage.value = 1;
  loadArticles();
}

// 计算总页数
const totalPages = computed(() => Math.ceil(totalItems.value / pageSize.value));

// 同步状态
const syncLoading = ref(false);
const syncResult = ref<{
  success: boolean;
  message: string;
  totalArticles?: number;
} | null>(null);

// 同步文章
async function handleSync() {
  syncLoading.value = true;
  syncResult.value = null;
  try {
    const result = await $fetch<{
      success: boolean;
      code: number;
      message: string;
      data?: {
        totalAccounts: number;
        syncedAccounts: number;
        totalArticles: number;
      };
    }>('/api/public/v1/sync');

    syncResult.value = {
      success: result.success,
      message: result.message,
      totalArticles: result.data?.totalArticles,
    };

    // 弹出提醒
    if (result.success) {
      toast.add({
        title: '同步完成',
        description: result.message,
        color: 'green',
      });
      loadArticles();
    } else {
      toast.add({
        title: '同步失败',
        description: result.message,
        color: 'red',
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '同步失败';
    syncResult.value = {
      success: false,
      message,
    };
    toast.add({
      title: '同步失败',
      description: message,
      color: 'red',
    });
  } finally {
    syncLoading.value = false;
  }
}

// 标签相关（批量归类）
const allTags = ref<string[]>([]);
const tagModalOpen = ref(false);
const batchTag = ref<string>('');
const tagLoading = ref(false);

// 加载已有标签
async function loadTags() {
  try {
    const result = await $fetch<{ tags: string[] }>('/api/storage/articles/tags');
    allTags.value = result.tags;
  } catch (error) {
    console.error('加载标签失败:', error);
  }
}

// 打开标签弹窗
function openTagModal() {
  if (selectedRows.value.length === 0) {
    toast.add({
      title: '提示',
      description: '请先选择文章',
      color: 'yellow',
    });
    return;
  }
  batchTag.value = '';
  tagModalOpen.value = true;
  loadTags();
}

// 确认设置标签
async function confirmSetTag() {
  if (!batchTag.value.trim()) {
    toast.add({
      title: '提示',
      description: '请输入或选择标签',
      color: 'yellow',
    });
    return;
  }

  tagLoading.value = true;
  try {
    const ids = selectedRows.value.map(row => `${row.fakeid}:${row.aid}`);
    const result = await $fetch<{ success: boolean; message: string }>('/api/storage/articles/tag', {
      method: 'POST',
      body: {
        ids,
        tag: batchTag.value.trim(),
      },
    });

    if (result.success) {
      toast.add({
        title: '成功',
        description: result.message,
        color: 'green',
      });
      tagModalOpen.value = false;
      loadArticles();
    }
  } catch (error) {
    toast.add({
      title: '失败',
      description: error instanceof Error ? error.message : '设置标签失败',
      color: 'red',
    });
  } finally {
    tagLoading.value = false;
  }
}
</script>

<template>
  <div class="h-full">
    <Teleport defer to="#title">
      <h1 class="text-[28px] leading-[34px] text-slate-12 dark:text-slate-50 font-bold">文章列表</h1>
    </Teleport>

    <div class="flex flex-col h-full divide-y divide-gray-200">
      <!-- 操作按钮区域 -->
      <div class="flex items-center gap-2 px-3 py-2 bg-slate-2 dark:bg-slate-800">
        <UButton
          :loading="syncLoading"
          color="green"
          label="同步"
          icon="i-lucide:refresh-cw"
          @click="handleSync"
        />
        <UButton
          :disabled="selectedRows.length === 0"
          color="blue"
          label="批量归类"
          icon="i-lucide:tag"
          @click="openTagModal"
        />
        <span v-if="selectedRows.length > 0" class="text-sm text-slate-11">
          已选择 {{ selectedRows.length }} 篇文章
        </span>
      </div>

      <!-- 筛选区域 -->
      <header class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 px-3 py-2">
        <div class="flex flex-wrap items-center gap-2">
          <USelectMenu
            v-model="selectedFakeid"
            :options="accounts"
            placeholder="选择公众号"
            value-attribute="fakeid"
            option-attribute="nickname"
            class="w-32"
            searchable
            clearable
          />
          <input
            v-model="searchTitle"
            type="text"
            placeholder="标题搜索"
            class="border border-slate-3 rounded px-2 py-1 text-sm dark:bg-slate-800 w-40"
          />
          <USelectMenu
            v-model="selectedTag"
            :options="filterTags"
            placeholder="选择标签"
            class="w-32"
            clearable
          />
          <div class="flex items-center gap-1">
            <span class="text-sm text-slate-11">发布时间：</span>
            <input
              v-model="startTimeStr"
              type="date"
              class="border border-slate-3 rounded px-2 py-1 text-sm dark:bg-slate-800"
            />
            <span class="text-sm text-slate-11">至</span>
            <input
              v-model="endTimeStr"
              type="date"
              class="border border-slate-3 rounded px-2 py-1 text-sm dark:bg-slate-800"
            />
          </div>
          <UButton color="primary" label="查询" icon="i-lucide:search" @click="handleSearch" />
          <UButton color="white" label="重置" icon="i-lucide:x" @click="resetFilters" />
        </div>
        <div class="text-sm text-slate-11">
          共 {{ totalItems }} 篇文章
        </div>
      </header>

      <!-- 表格区域 -->
      <div class="flex-1 overflow-hidden">
        <ag-grid-vue
          style="width: 100%; height: 100%"
          :loading="loading"
          :columnDefs="columnDefs"
          :gridOptions="gridOptions"
          @grid-ready="onGridReady"
          @selection-changed="onSelectionChanged"
        ></ag-grid-vue>
      </div>

      <!-- 分页区域 -->
      <footer class="flex items-center justify-between px-3 py-2 bg-slate-1 dark:bg-slate-900">
        <div class="flex items-center gap-2">
          <span class="text-sm text-slate-11">每页显示</span>
          <USelectMenu
            v-model="pageSize"
            :options="[10, 20, 50, 100]"
            class="w-20"
          />
          <span class="text-sm text-slate-11">条</span>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            :disabled="currentPage === 1"
            color="white"
            icon="i-lucide:chevron-left"
            @click="currentPage--"
          />
          <span class="text-sm text-slate-11">
            {{ currentPage }} / {{ totalPages || 1 }}
          </span>
          <UButton
            :disabled="currentPage >= totalPages"
            color="white"
            icon="i-lucide:chevron-right"
            @click="currentPage++"
          />
        </div>
      </footer>
    </div>

    <!-- 标签弹窗 -->
    <UModal v-model="tagModalOpen">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">批量设置标签</h3>
        </template>
        <div class="space-y-4">
          <p class="text-sm text-slate-11">
            为 {{ selectedRows.length }} 篇文章设置标签
          </p>
          <USelectMenu
            v-model="batchTag"
            :options="allTags"
            placeholder="选择已有标签或输入新标签"
            searchable
            clearable
            creatable
          />
        </div>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="white" label="取消" @click="tagModalOpen = false" />
            <UButton
              :loading="tagLoading"
              color="primary"
              label="确认"
              @click="confirmSetTag"
            />
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>