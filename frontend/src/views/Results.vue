<template>
  <div class="results-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>执行历史</span>
        </div>
      </template>

      <div class="filter-bar">
        <el-select
          v-model="filters.taskId"
          placeholder="选择任务"
          clearable
          filterable
          style="width: 240px"
        >
          <el-option v-for="task in tasks" :key="task.id" :label="task.name" :value="task.id" />
        </el-select>

        <el-select
          v-model="filters.success"
          placeholder="执行状态"
          clearable
          style="width: 140px"
        >
          <el-option label="成功" :value="true" />
          <el-option label="失败" :value="false" />
        </el-select>

        <el-date-picker
          v-model="dateRange"
          type="datetimerange"
          range-separator="至"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          style="width: 380px"
        />

        <el-button type="primary" @click="handleSearch">查询</el-button>
        <el-button @click="resetFilters">重置</el-button>
      </div>

      <el-table :data="results" style="width: 100%; margin-top: 18px" v-loading="loading">
        <el-table-column prop="taskId" label="任务" width="200">
          <template #default="{ row }">
            {{ getTaskName(row.taskId) }}
          </template>
        </el-table-column>

        <el-table-column label="执行时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.executedAt) }}
          </template>
        </el-table-column>

        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.success ? 'success' : 'danger'">
              {{ row.success ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="状态码" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.statusCode" :type="getStatusCodeType(row.statusCode)">
              {{ row.statusCode }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column label="响应时间" width="120">
          <template #default="{ row }">
            {{ row.responseTime }}ms
          </template>
        </el-table-column>

        <el-table-column label="校验结果" width="120">
          <template #default="{ row }">
            <span v-if="row.validationResults && row.validationResults.length > 0">
              {{ getPassedCount(row.validationResults) }}/{{ row.validationResults.length }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column label="错误信息" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.error">{{ row.error.message }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handlePageSizeChange"
        @current-change="loadResults"
        style="margin-top: 18px; justify-content: flex-end"
      />
    </el-card>

    <el-dialog v-model="detailVisible" title="执行详情" width="800px">
      <div v-if="selectedResult">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="任务名称">
            {{ getTaskName(selectedResult.taskId) }}
          </el-descriptions-item>
          <el-descriptions-item label="执行时间">
            {{ formatTime(selectedResult.executedAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="执行状态">
            <el-tag :type="selectedResult.success ? 'success' : 'danger'">
              {{ selectedResult.success ? '成功' : '失败' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="HTTP 状态码">
            {{ selectedResult.statusCode || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="响应时间">
            {{ selectedResult.responseTime }}ms
          </el-descriptions-item>
          <el-descriptions-item label="环境">
            {{ selectedResult.environment || '-' }}
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="selectedResult.error" class="section-block">
          <h4>错误信息</h4>
          <el-alert :title="selectedResult.error.message" type="error" :closable="false" />
        </div>

        <div
          v-if="selectedResult.validationResults && selectedResult.validationResults.length > 0"
          class="section-block"
        >
          <h4>字段校验结果</h4>
          <el-table :data="selectedResult.validationResults" border>
            <el-table-column prop="ruleId" label="规则 ID" width="220" />
            <el-table-column label="结果" width="100">
              <template #default="{ row }">
                <el-tag :type="row.passed ? 'success' : 'danger'">
                  {{ row.passed ? '通过' : '失败' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="message" label="消息" />
          </el-table>
        </div>

        <div v-if="selectedResult.response" class="section-block">
          <h4>响应内容</h4>
          <el-input
            type="textarea"
            :value="JSON.stringify(selectedResult.response, null, 2)"
            :rows="10"
            readonly
          />
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { historyApi } from '../api/history';
import { taskApi } from '../api/task';

const tasks = ref<any[]>([]);
const results = ref<any[]>([]);
const loading = ref(false);
const detailVisible = ref(false);
const selectedResult = ref<any>(null);
const dateRange = ref<[Date, Date] | null>(null);

const filters = ref({
  taskId: '',
  success: undefined as boolean | undefined,
});

const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0,
});

const loadTasks = async () => {
  try {
    tasks.value = (await taskApi.getTasks()) as unknown as any[];
  } catch (error) {
    console.error('加载任务列表失败', error);
  }
};

const loadResults = async () => {
  loading.value = true;
  try {
    const params: any = {
      taskId: filters.value.taskId || undefined,
      success: filters.value.success,
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
    };

    if (dateRange.value) {
      params.startTime = dateRange.value[0].toISOString();
      params.endTime = dateRange.value[1].toISOString();
    }

    const data: any = await historyApi.queryHistory(params);
    results.value = data.results || [];
    pagination.value.total = data.pagination?.total || 0;
  } catch (error) {
    console.error('加载执行历史失败', error);
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pagination.value.page = 1;
  loadResults();
};

const handlePageSizeChange = () => {
  pagination.value.page = 1;
  loadResults();
};

const resetFilters = () => {
  filters.value = {
    taskId: '',
    success: undefined,
  };
  dateRange.value = null;
  pagination.value.page = 1;
  loadResults();
};

const viewDetail = (result: any) => {
  selectedResult.value = result;
  detailVisible.value = true;
};

const getTaskName = (taskId: string) => {
  const task = tasks.value.find((item) => item.id === taskId);
  return task ? task.name : taskId;
};

const getStatusCodeType = (statusCode: number) => {
  if (statusCode >= 200 && statusCode < 300) return 'success';
  if (statusCode >= 400 && statusCode < 500) return 'warning';
  if (statusCode >= 500) return 'danger';
  return 'info';
};

const getPassedCount = (validationResults: any[]) => {
  return validationResults.filter((item) => item.passed).length;
};

const formatTime = (time: string) => new Date(time).toLocaleString('zh-CN');

onMounted(() => {
  loadTasks();
  loadResults();
});
</script>

<style scoped>
.results-container {
  padding: 2px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-bar {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.section-block {
  margin-top: 20px;
}

:deep(.el-card) {
  border-radius: 18px;
}
</style>
