<template>
  <div class="alerts-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>告警管理</span>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="活跃告警" name="active">
          <el-table :data="activeAlerts" style="width: 100%" v-loading="loading">
            <el-table-column label="严重程度" width="120">
              <template #default="{ row }">
                <el-tag :type="getSeverityType(row.severity)">
                  {{ getSeverityText(row.severity) }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column prop="title" label="标题" min-width="220" />
            <el-table-column prop="message" label="消息" min-width="320" show-overflow-tooltip />

            <el-table-column label="触发时间" width="180">
              <template #default="{ row }">
                {{ formatTime(row.triggeredAt) }}
              </template>
            </el-table-column>

            <el-table-column label="操作" width="150" fixed="right">
              <template #default="{ row }">
                <el-button size="small" @click="viewDetail(row)">详情</el-button>
                <el-button size="small" type="success" @click="resolveAlert(row.id)">解决</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="告警历史" name="history">
          <div class="filter-bar">
            <el-select
              v-model="historyFilter.status"
              placeholder="状态"
              clearable
              style="width: 150px"
            >
              <el-option label="活跃" value="active" />
              <el-option label="已解决" value="resolved" />
              <el-option label="已抑制" value="suppressed" />
            </el-select>

            <el-date-picker
              v-model="dateRange"
              type="datetimerange"
              range-separator="至"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
              style="width: 380px"
            />

            <el-button type="primary" @click="handleHistorySearch">查询</el-button>
            <el-button @click="resetHistoryFilter">重置</el-button>
          </div>

          <el-table :data="historyAlerts" style="width: 100%; margin-top: 18px" v-loading="historyLoading">
            <el-table-column label="严重程度" width="120">
              <template #default="{ row }">
                <el-tag :type="getSeverityType(row.severity)">
                  {{ getSeverityText(row.severity) }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column prop="title" label="标题" min-width="220" />

            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)">
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column label="触发时间" width="180">
              <template #default="{ row }">
                {{ formatTime(row.triggeredAt) }}
              </template>
            </el-table-column>

            <el-table-column label="解决时间" width="180">
              <template #default="{ row }">
                {{ row.resolvedAt ? formatTime(row.resolvedAt) : '-' }}
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
            @current-change="loadHistory"
            style="margin-top: 18px; justify-content: flex-end"
          />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog v-model="detailVisible" title="告警详情" width="600px">
      <div v-if="selectedAlert">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="标题">
            {{ selectedAlert.title }}
          </el-descriptions-item>
          <el-descriptions-item label="消息">
            {{ selectedAlert.message }}
          </el-descriptions-item>
          <el-descriptions-item label="严重程度">
            <el-tag :type="getSeverityType(selectedAlert.severity)">
              {{ getSeverityText(selectedAlert.severity) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(selectedAlert.status)">
              {{ getStatusText(selectedAlert.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="触发时间">
            {{ formatTime(selectedAlert.triggeredAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="解决时间" v-if="selectedAlert.resolvedAt">
            {{ formatTime(selectedAlert.resolvedAt) }}
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="selectedAlert.details" class="section-block">
          <h4>详细信息</h4>
          <el-input
            type="textarea"
            :value="JSON.stringify(selectedAlert.details, null, 2)"
            :rows="8"
            readonly
          />
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { alertApi } from '../api/alert';

const activeTab = ref('active');
const activeAlerts = ref<any[]>([]);
const historyAlerts = ref<any[]>([]);
const loading = ref(false);
const historyLoading = ref(false);
const detailVisible = ref(false);
const selectedAlert = ref<any>(null);
const dateRange = ref<[Date, Date] | null>(null);

const historyFilter = ref({
  status: '',
});

const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0,
});

const loadActiveAlerts = async () => {
  loading.value = true;
  try {
    activeAlerts.value = (await alertApi.getActiveAlerts()) as unknown as any[];
  } catch (error) {
    console.error('加载活跃告警失败', error);
  } finally {
    loading.value = false;
  }
};

const loadHistory = async () => {
  historyLoading.value = true;
  try {
    const params: any = {
      status: historyFilter.value.status || undefined,
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
    };

    if (dateRange.value) {
      params.startTime = dateRange.value[0].toISOString();
      params.endTime = dateRange.value[1].toISOString();
    }

    const data: any = await alertApi.getAlertHistory(params);
    historyAlerts.value = data.alerts || [];
    pagination.value.total = data.total || 0;
  } catch (error) {
    console.error('加载告警历史失败', error);
  } finally {
    historyLoading.value = false;
  }
};

const handleHistorySearch = () => {
  pagination.value.page = 1;
  loadHistory();
};

const handlePageSizeChange = () => {
  pagination.value.page = 1;
  loadHistory();
};

const resetHistoryFilter = () => {
  historyFilter.value.status = '';
  dateRange.value = null;
  pagination.value.page = 1;
  loadHistory();
};

const resolveAlert = async (alertId: string) => {
  try {
    await alertApi.resolveAlert(alertId);
    ElMessage.success('告警已解决');
    loadActiveAlerts();
    loadHistory();
  } catch (error) {
    console.error('解决告警失败', error);
  }
};

const viewDetail = (alert: any) => {
  selectedAlert.value = alert;
  detailVisible.value = true;
};

const getSeverityType = (severity: string) => {
  const map: Record<string, 'info' | 'warning' | 'danger' | 'success'> = {
    info: 'info',
    warning: 'warning',
    error: 'danger',
    critical: 'danger',
  };
  return map[severity] || 'info';
};

const getSeverityText = (severity: string) => {
  const map: Record<string, string> = {
    info: '信息',
    warning: '警告',
    error: '错误',
    critical: '严重',
  };
  return map[severity] || severity;
};

const getStatusType = (status: string) => {
  const map: Record<string, 'info' | 'warning' | 'danger' | 'success'> = {
    active: 'danger',
    resolved: 'success',
    suppressed: 'info',
  };
  return map[status] || 'info';
};

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    active: '活跃',
    resolved: '已解决',
    suppressed: '已抑制',
  };
  return map[status] || status;
};

const formatTime = (time: string) => new Date(time).toLocaleString('zh-CN');

onMounted(() => {
  loadActiveAlerts();
  loadHistory();
});
</script>

<style scoped>
.alerts-container {
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
