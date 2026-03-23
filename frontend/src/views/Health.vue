<template>
  <div class="health-container">
    <el-card class="page-card">
      <template #header>
        <div class="card-header">
          <div>
            <div class="page-title">健康度与监控分析</div>
            <div class="page-subtitle">用多维图表查看评分、成功率与响应时间变化</div>
          </div>
          <div class="header-actions">
            <el-select
              v-model="timeRange"
              style="width: 160px"
              @change="handleTimeRangeChange"
            >
              <el-option label="最近 1 小时" :value="1" />
              <el-option label="最近 6 小时" :value="6" />
              <el-option label="最近 24 小时" :value="24" />
              <el-option label="最近 7 天" :value="168" />
            </el-select>
            <el-button type="primary" @click="loadData" :loading="overviewLoading">
              刷新数据
            </el-button>
          </div>
        </div>
      </template>

      <el-skeleton :loading="overviewLoading" animated :rows="6">
        <div class="overview-grid">
          <el-card
            v-for="item in healthOverview"
            :key="item.taskId"
            shadow="hover"
            class="overview-item"
            :class="`level-${item.level}`"
            @click="selectTask(item.taskId)"
          >
            <div class="overview-top">
              <span class="overview-name">{{ item.taskName }}</span>
              <el-tag :type="getLevelTagType(item.level)" effect="dark">
                {{ getLevelText(item.level) }}
              </el-tag>
            </div>
            <div class="overview-score">{{ item.score }}</div>
            <div class="overview-meta">
              <span>成功率 {{ item.successRate }}%</span>
              <span>平均 {{ item.avgResponseTime }}ms</span>
            </div>
            <el-progress
              :percentage="Number(item.validationPassRate || 0)"
              :show-text="false"
              status="success"
              class="overview-progress"
            />
          </el-card>
        </div>
      </el-skeleton>

      <div class="toolbar">
        <el-select
          v-model="selectedTaskId"
          placeholder="选择任务查看详情"
          filterable
          style="width: 320px"
          @change="loadTaskDetails"
        >
          <el-option
            v-for="task in tasks"
            :key="task.id"
            :label="task.name"
            :value="task.id"
          />
        </el-select>
      </div>

      <div v-if="selectedTaskId" class="details-section" v-loading="detailLoading">
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :lg="6">
            <el-card class="metric-card">
              <div class="metric-label">健康评分</div>
              <div class="metric-value">{{ taskHealth.score }}</div>
              <el-tag :type="getLevelTagType(taskHealth.level)">
                {{ getLevelText(taskHealth.level) }}
              </el-tag>
            </el-card>
          </el-col>
          <el-col :xs="24" :sm="12" :lg="6">
            <el-card class="metric-card">
              <div class="metric-label">成功率</div>
              <div class="metric-value">{{ taskHealth.successRate }}%</div>
              <div class="metric-help">校验通过率 {{ taskHealth.validationPassRate }}%</div>
            </el-card>
          </el-col>
          <el-col :xs="24" :sm="12" :lg="6">
            <el-card class="metric-card">
              <div class="metric-label">平均响应时间</div>
              <div class="metric-value">{{ stats.avg }}ms</div>
              <div class="metric-help">样本 {{ stats.count }} 次</div>
            </el-card>
          </el-col>
          <el-col :xs="24" :sm="12" :lg="6">
            <el-card class="metric-card">
              <div class="metric-label">极值范围</div>
              <div class="metric-value">{{ stats.min }} - {{ stats.max }}</div>
              <div class="metric-help">单位 ms</div>
            </el-card>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :xs="24" :xl="16">
            <el-card class="chart-card">
              <template #header>
                <div class="panel-title">多指标趋势</div>
              </template>
              <div ref="trendChartRef" class="chart-host"></div>
            </el-card>
          </el-col>

          <el-col :xs="24" :xl="8">
            <el-card class="chart-card">
              <template #header>
                <div class="panel-title">响应时间分位对比</div>
              </template>
              <div ref="percentileChartRef" class="chart-host chart-host-small"></div>
            </el-card>
          </el-col>
        </el-row>

        <el-card class="panel-card">
          <template #header>
            <div class="panel-title">健康评分历史</div>
          </template>
          <el-table :data="healthHistory" stripe>
            <el-table-column label="计算时间" min-width="180">
              <template #default="{ row }">
                {{ formatTime(row.calculatedAt) }}
              </template>
            </el-table-column>
            <el-table-column label="评分" width="100" prop="score" />
            <el-table-column label="等级" width="120">
              <template #default="{ row }">
                <el-tag :type="getLevelTagType(row.level)">
                  {{ getLevelText(row.level) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="成功率" width="120">
              <template #default="{ row }">{{ row.successRate }}%</template>
            </el-table-column>
            <el-table-column label="平均响应" width="140">
              <template #default="{ row }">{{ row.avgResponseTime }}ms</template>
            </el-table-column>
            <el-table-column label="校验通过率" width="140">
              <template #default="{ row }">{{ row.validationPassRate }}%</template>
            </el-table-column>
            <el-table-column label="统计窗口" min-width="220">
              <template #default="{ row }">
                {{ formatTime(row.timeRangeStart) }} - {{ formatTime(row.timeRangeEnd) }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import * as echarts from 'echarts';
import { healthApi } from '../api/health';
import { taskApi } from '../api/task';

interface HealthOverviewItem {
  taskId: string;
  taskName: string;
  score: number;
  level: string;
  successRate: number;
  avgResponseTime: number;
  validationPassRate: number;
  calculatedAt: string;
}

interface TaskItem {
  id: string;
  name: string;
}

interface HealthDetail {
  score: number;
  level: string;
  successRate: number;
  avgResponseTime: number;
  validationPassRate: number;
}

interface ResponseTimeStats {
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  count: number;
}

interface HealthHistoryItem {
  id: string;
  taskId: string;
  score: number;
  level: string;
  successRate: number;
  avgResponseTime: number;
  validationPassRate: number;
  calculatedAt: string;
  timeRangeStart: string;
  timeRangeEnd: string;
}

const tasks = ref<TaskItem[]>([]);
const healthOverview = ref<HealthOverviewItem[]>([]);
const selectedTaskId = ref('');
const timeRange = ref(24);
const overviewLoading = ref(false);
const detailLoading = ref(false);

const taskHealth = ref<HealthDetail>({
  score: 0,
  level: 'critical',
  successRate: 0,
  avgResponseTime: 0,
  validationPassRate: 0,
});

const stats = ref<ResponseTimeStats>({
  avg: 0,
  p50: 0,
  p95: 0,
  p99: 0,
  min: 0,
  max: 0,
  count: 0,
});

const healthHistory = ref<HealthHistoryItem[]>([]);
const trendChartRef = ref<HTMLDivElement>();
const percentileChartRef = ref<HTMLDivElement>();
let trendChart: echarts.ECharts | null = null;
let percentileChart: echarts.ECharts | null = null;

const getLevelText = (level: string) => {
  const map: Record<string, string> = {
    excellent: '优秀',
    good: '良好',
    warning: '预警',
    critical: '严重',
  };
  return map[level] || level;
};

const getLevelTagType = (level: string) => {
  const map: Record<string, '' | 'success' | 'warning' | 'danger' | 'info'> = {
    excellent: 'success',
    good: '',
    warning: 'warning',
    critical: 'danger',
  };
  return map[level] || 'info';
};

const formatTime = (time: string | Date) => new Date(time).toLocaleString('zh-CN');

const getHistoryRangeParams = () => {
  const endTime = new Date(Date.now() + 60 * 1000);
  const startTime = new Date(endTime.getTime() - timeRange.value * 60 * 60 * 1000);
  return {
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
  };
};

const selectTask = async (taskId: string) => {
  selectedTaskId.value = taskId;
  await loadTaskDetails();
};

const loadData = async () => {
  overviewLoading.value = true;
  try {
    const [tasksData, overviewData] = await Promise.all([
      taskApi.getTasks(),
      healthApi.getAllTasksHealth(timeRange.value),
    ]);

    tasks.value = Array.isArray(tasksData) ? tasksData : [];
    healthOverview.value = Array.isArray(overviewData) ? overviewData : [];

    if (!selectedTaskId.value && healthOverview.value.length > 0) {
      selectedTaskId.value = healthOverview.value[0].taskId;
    }

    if (!selectedTaskId.value && tasks.value.length > 0) {
      selectedTaskId.value = tasks.value[0].id;
    }

    if (selectedTaskId.value) {
      await loadTaskDetails();
    }
  } catch {
    ElMessage.error('加载健康度数据失败');
  } finally {
    overviewLoading.value = false;
  }
};

const loadTaskDetails = async () => {
  if (!selectedTaskId.value) {
    return;
  }

  detailLoading.value = true;
  try {
    const [healthData, statsData] = await Promise.all([
      healthApi.getTaskHealth(selectedTaskId.value, timeRange.value),
      healthApi.getResponseTimeStats(selectedTaskId.value, timeRange.value),
    ]);
    const historyParams = getHistoryRangeParams();
    const historyData = await healthApi.getHealthHistory(
      selectedTaskId.value,
      historyParams.startTime,
      historyParams.endTime
    );

    taskHealth.value = healthData as unknown as HealthDetail;
    stats.value = statsData as unknown as ResponseTimeStats;
    healthHistory.value = Array.isArray(historyData) ? (historyData as unknown as HealthHistoryItem[]) : [];

    const overviewIndex = healthOverview.value.findIndex((item) => item.taskId === selectedTaskId.value);
    if (overviewIndex >= 0) {
      healthOverview.value[overviewIndex] = {
        ...healthOverview.value[overviewIndex],
        score: taskHealth.value.score,
        level: taskHealth.value.level,
        successRate: taskHealth.value.successRate,
        avgResponseTime: taskHealth.value.avgResponseTime,
        validationPassRate: taskHealth.value.validationPassRate,
      };
    }

    await nextTick();
    renderCharts();
  } catch {
    ElMessage.error('加载任务健康详情失败');
  } finally {
    detailLoading.value = false;
  }
};

const renderCharts = () => {
  renderTrendChart();
  renderPercentileChart();
};

const renderTrendChart = () => {
  if (!trendChartRef.value) {
    return;
  }

  if (!trendChart) {
    trendChart = echarts.init(trendChartRef.value);
  }

  const history = [...healthHistory.value].reverse();
  const labels = history.map((item) =>
    new Date(item.calculatedAt).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  );

  trendChart.setOption({
    backgroundColor: 'transparent',
    color: ['#1d4ed8', '#059669', '#f97316'],
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(17, 24, 39, 0.9)',
      borderWidth: 0,
      textStyle: { color: '#f9fafb' },
    },
    legend: {
      top: 0,
      textStyle: { color: '#4b5563' },
      data: ['健康评分', '成功率', '平均响应时间'],
    },
    grid: {
      top: 48,
      left: 72,
      right: 86,
      bottom: 52,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: labels,
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      axisLabel: {
        color: '#64748b',
        margin: 14,
      },
    },
    yAxis: [
      {
        type: 'value',
        name: '评分 / 成功率',
        min: 0,
        max: 100,
        nameLocation: 'end',
        nameGap: 18,
        axisLabel: {
          color: '#64748b',
          margin: 12,
        },
        splitLine: { lineStyle: { color: '#e5e7eb' } },
      },
      {
        type: 'value',
        name: '响应时间(ms)',
        nameLocation: 'end',
        nameGap: 18,
        axisLabel: {
          color: '#64748b',
          margin: 12,
        },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '健康评分',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(29, 78, 216, 0.25)' },
            { offset: 1, color: 'rgba(29, 78, 216, 0.02)' },
          ]),
        },
        data: history.map((item) => item.score),
      },
      {
        name: '成功率',
        type: 'line',
        smooth: true,
        symbol: 'diamond',
        symbolSize: 7,
        data: history.map((item) => item.successRate),
      },
      {
        name: '平均响应时间',
        type: 'bar',
        yAxisIndex: 1,
        barMaxWidth: 22,
        itemStyle: {
          borderRadius: [8, 8, 0, 0],
        },
        data: history.map((item) => item.avgResponseTime),
      },
    ],
  });
};

const renderPercentileChart = () => {
  if (!percentileChartRef.value) {
    return;
  }

  if (!percentileChart) {
    percentileChart = echarts.init(percentileChartRef.value);
  }

  percentileChart.setOption({
    color: ['#0f766e', '#0284c7', '#7c3aed', '#dc2626'],
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ms',
    },
    radar: {
      radius: '62%',
      center: ['50%', '54%'],
      splitNumber: 4,
      axisName: { color: '#475569' },
      splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.35)' } },
      splitArea: {
        areaStyle: {
          color: ['rgba(241, 245, 249, 0.45)', 'rgba(248, 250, 252, 0.75)'],
        },
      },
      axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.4)' } },
      indicator: [
        { name: '平均值', max: Math.max(stats.value.max, 100) || 100 },
        { name: 'P50', max: Math.max(stats.value.max, 100) || 100 },
        { name: 'P95', max: Math.max(stats.value.max, 100) || 100 },
        { name: 'P99', max: Math.max(stats.value.max, 100) || 100 },
      ],
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: [stats.value.avg, stats.value.p50, stats.value.p95, stats.value.p99],
            name: '响应时间分布',
            areaStyle: { color: 'rgba(15, 118, 110, 0.25)' },
            lineStyle: { width: 2 },
            symbolSize: 6,
          },
        ],
      },
    ],
  });
};

const resizeCharts = () => {
  trendChart?.resize();
  percentileChart?.resize();
};

const handleTimeRangeChange = async () => {
  await loadData();
};

onMounted(() => {
  loadData();
  window.addEventListener('resize', resizeCharts);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts);
  trendChart?.dispose();
  percentileChart?.dispose();
  trendChart = null;
  percentileChart = null;
});
</script>

<style scoped>
.health-container {
  padding: 2px;
}

.page-card {
  border-radius: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.header-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
}

.page-subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: #64748b;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.overview-item {
  cursor: pointer;
  border-radius: 18px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.overview-item:hover {
  transform: translateY(-3px);
}

.overview-item.level-excellent {
  background: linear-gradient(135deg, #ecfdf5 0%, #f8fffc 100%);
}

.overview-item.level-good {
  background: linear-gradient(135deg, #eff6ff 0%, #f8fbff 100%);
}

.overview-item.level-warning {
  background: linear-gradient(135deg, #fffbeb 0%, #fffdf7 100%);
}

.overview-item.level-critical {
  background: linear-gradient(135deg, #fef2f2 0%, #fff8f8 100%);
}

.overview-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.overview-name {
  font-size: 14px;
  color: #334155;
  font-weight: 600;
}

.overview-score {
  margin-top: 16px;
  font-size: 42px;
  font-weight: 800;
  color: #0f172a;
}

.overview-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  color: #64748b;
  font-size: 12px;
}

.overview-progress {
  margin-top: 14px;
}

.toolbar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

.details-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.metric-card,
.chart-card,
.panel-card {
  border-radius: 18px;
}

.metric-card {
  min-height: 152px;
}

.metric-label {
  font-size: 13px;
  color: #64748b;
}

.metric-value {
  margin: 14px 0 10px;
  font-size: 34px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.1;
}

.metric-help {
  font-size: 13px;
  color: #64748b;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
}

.chart-host {
  width: 100%;
  height: 380px;
}

.chart-host-small {
  height: 380px;
}

@media (max-width: 768px) {
  .health-container {
    padding: 12px;
  }

  .card-header {
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions :deep(.el-select) {
    width: 100% !important;
  }

  .chart-host,
  .chart-host-small {
    height: 300px;
  }

  .overview-meta {
    flex-direction: column;
    gap: 4px;
  }
}
</style>
