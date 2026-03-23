<template>
  <div class="tasks-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>任务列表</span>
          <el-button type="primary" @click="showCreateDialog">
            <el-icon><Plus /></el-icon>
            创建任务
          </el-button>
        </div>
      </template>

      <!-- 搜索栏 -->
      <div class="search-bar">
        <el-input
          v-model="searchName"
          placeholder="搜索任务名称"
          clearable
          style="width: 300px"
          @clear="loadTasks"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-select v-model="searchEnabled" placeholder="任务状态" clearable style="width: 150px">
          <el-option label="已启用" :value="true" />
          <el-option label="已禁用" :value="false" />
        </el-select>
        <el-button type="primary" @click="loadTasks">
          <el-icon><Search /></el-icon>
          查询
        </el-button>
        <el-button type="primary" plain class="btn-outline" @click="resetFilters">
          <el-icon><RefreshRight /></el-icon>
          重置
        </el-button>
        <el-button
          type="primary"
          plain
          class="btn-outline"
          :disabled="selectedTasks.length !== 1"
          @click="editSelectedTask"
        >
          <el-icon><Edit /></el-icon>
          修改
        </el-button>
      </div>

      <!-- 任务表格 -->
      <el-table
        ref="tableRef"
        :data="tasks"
        style="width: 100%; margin-top: 20px"
        v-loading="loading"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column type="index" label="序号" width="70" />
        <el-table-column prop="name" label="任务名称" min-width="200" />
        <el-table-column prop="apiEndpoint.url" label="API地址" min-width="250" show-overflow-tooltip />
        <el-table-column label="执行频率" width="150">
          <template #default="{ row }">
            {{ formatFrequency(row.frequency) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'">
              {{ row.enabled ? '已启用' : '已禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="最后执行" width="180">
          <template #default="{ row }">
            {{ row.lastExecutedAt ? formatTime(row.lastExecutedAt) : '未执行' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="350" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="executeTask(row)">立即执行</el-button>
            <el-button link type="primary" @click="toggleTask(row)">{{ row.enabled ? '禁用' : '启用' }}</el-button>
            <el-button link type="danger" @click="deleteTask(row)">删除</el-button>
            <el-button link type="primary" @click="viewTask(row)">查看详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 创建/编辑任务对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      @close="resetForm"
    >
      <el-form :model="taskForm" :rules="rules" ref="formRef" label-width="120px">
        <el-form-item label="任务名称" prop="name">
          <el-input v-model="taskForm.name" placeholder="请输入任务名称" />
        </el-form-item>

        <el-form-item label="任务描述">
          <el-input
            v-model="taskForm.description"
            type="textarea"
            :rows="2"
            placeholder="请输入任务描述"
          />
        </el-form-item>

        <el-form-item label="API地址" prop="apiEndpoint.url">
          <el-input v-model="taskForm.apiEndpoint.url" placeholder="https://api.example.com" />
        </el-form-item>

        <el-form-item label="HTTP方法" prop="apiEndpoint.method">
          <el-select v-model="taskForm.apiEndpoint.method" style="width: 100%">
            <el-option label="GET" value="GET" />
            <el-option label="POST" value="POST" />
            <el-option label="PUT" value="PUT" />
            <el-option label="DELETE" value="DELETE" />
          </el-select>
        </el-form-item>

        <el-form-item label="超时时间(ms)" prop="apiEndpoint.timeout">
          <el-input-number
            v-model="taskForm.apiEndpoint.timeout"
            :min="1000"
            :max="60000"
            :step="1000"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="执行频率" prop="frequency.type">
          <el-row :gutter="10">
            <el-col :span="12">
              <el-select v-model="taskForm.frequency.type" style="width: 100%">
                <el-option label="分钟" value="minute" />
                <el-option label="小时" value="hour" />
                <el-option label="天" value="day" />
              </el-select>
            </el-col>
            <el-col :span="12">
              <el-input-number
                v-model="taskForm.frequency.interval"
                :min="1"
                :max="getMaxInterval()"
                style="width: 100%"
              />
            </el-col>
          </el-row>
        </el-form-item>

        <el-form-item label="标签">
          <el-input v-model="tagsInput" placeholder="多个标签用逗号分隔" />
        </el-form-item>

        <el-form-item label="字段校验">
          <el-button size="small" @click="showValidationDialog">
            配置校验规则 ({{ taskForm.validationRules.length }})
          </el-button>
        </el-form-item>

        <el-form-item label="启用任务">
          <el-switch v-model="taskForm.enabled" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>

    <!-- 字段校验规则对话框 -->
    <el-dialog v-model="validationDialogVisible" title="配置字段校验规则" width="700px">
      <el-button type="primary" size="small" @click="addValidationRule" style="margin-bottom: 10px">
        <el-icon><Plus /></el-icon>
        添加规则
      </el-button>

      <el-table :data="taskForm.validationRules" style="width: 100%">
        <el-table-column label="字段路径" prop="fieldPath" width="150" />
        <el-table-column label="校验类型" width="100">
          <template #default="{ row }">
            {{ getValidationTypeLabel(row.ruleType) }}
          </template>
        </el-table-column>
        <el-table-column label="配置" min-width="150">
          <template #default="{ row }">
            {{ formatValidationConfig(row) }}
          </template>
        </el-table-column>
        <el-table-column label="必须" width="80">
          <template #default="{ row }">
            <el-tag :type="row.required ? 'danger' : 'info'" size="small">
              {{ row.required ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ $index }">
            <el-button size="small" type="danger" @click="removeValidationRule($index)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-dialog
        v-model="ruleFormVisible"
        title="添加校验规则"
        width="500px"
        append-to-body
      >
        <el-form :model="currentRule" label-width="100px">
          <el-form-item label="字段路径">
            <el-input
              v-model="currentRule.fieldPath"
              placeholder="例如: data.user.name"
            />
          </el-form-item>

          <el-form-item label="校验类型">
            <el-select v-model="currentRule.ruleType" style="width: 100%">
              <el-option label="存在性" value="exists" />
              <el-option label="类型" value="type" />
              <el-option label="范围" value="range" />
              <el-option label="正则" value="pattern" />
              <el-option label="枚举" value="enum" />
            </el-select>
          </el-form-item>

          <el-form-item label="数据类型" v-if="currentRule.ruleType === 'type'">
            <el-select v-model="currentRule.config.expectedType" style="width: 100%">
              <el-option label="字符串" value="string" />
              <el-option label="数字" value="number" />
              <el-option label="布尔" value="boolean" />
              <el-option label="对象" value="object" />
              <el-option label="数组" value="array" />
            </el-select>
          </el-form-item>

          <el-form-item label="最小值" v-if="currentRule.ruleType === 'range'">
            <el-input-number v-model="currentRule.config.min" style="width: 100%" />
          </el-form-item>

          <el-form-item label="最大值" v-if="currentRule.ruleType === 'range'">
            <el-input-number v-model="currentRule.config.max" style="width: 100%" />
          </el-form-item>

          <el-form-item label="正则表达式" v-if="currentRule.ruleType === 'pattern'">
            <el-input v-model="currentRule.config.pattern" placeholder="例如: ^\\d{11}$" />
          </el-form-item>

          <el-form-item label="枚举值" v-if="currentRule.ruleType === 'enum'">
            <el-input
              v-model="enumValuesInput"
              placeholder="多个值用逗号分隔"
            />
          </el-form-item>

          <el-form-item label="必须通过">
            <el-switch v-model="currentRule.required" />
          </el-form-item>
        </el-form>

        <template #footer>
          <el-button @click="ruleFormVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmAddRule">确定</el-button>
        </template>
      </el-dialog>

      <template #footer>
        <el-button @click="validationDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { taskApi, type Task } from '../api/task';
import { executorApi } from '../api/executor';
import dayjs from 'dayjs';

const loading = ref(false);
const tasks = ref<Task[]>([]);
const searchName = ref('');
const searchEnabled = ref<boolean | undefined>(undefined);

const tableRef = ref();
const selectedTasks = ref<Task[]>([]);

const dialogVisible = ref(false);
const dialogTitle = computed(() => (isEdit.value ? '编辑任务' : '创建任务'));
const isEdit = ref(false);
const editingId = ref('');

const formRef = ref<FormInstance>();
const taskForm = reactive<Task>({
  name: '',
  description: '',
  enabled: true,
  frequency: {
    type: 'minute',
    interval: 5,
  },
  apiEndpoint: {
    url: '',
    method: 'GET',
    timeout: 5000,
  },
  validationRules: [],
  alertRules: [],
  tags: [],
});

const tagsInput = ref('');

const validationDialogVisible = ref(false);
const ruleFormVisible = ref(false);
const currentRule = reactive<any>({
  id: '',
  fieldPath: '',
  ruleType: 'exists',
  config: {},
  required: false,
});
const enumValuesInput = ref('');

const rules: FormRules = {
  name: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  'apiEndpoint.url': [
    { required: true, message: '请输入API地址', trigger: 'blur' },
    {
      trigger: 'blur',
      validator: (_rule: any, value: string, callback: (error?: Error) => void) => {
        if (!value) {
          callback();
          return;
        }

        try {
          new URL(value);
          callback();
        } catch {
          callback(new Error('请输入正确的 URL 格式'));
        }
      },
    },
  ],
  'apiEndpoint.method': [{ required: true, message: '请选择HTTP方法', trigger: 'change' }],
  'frequency.type': [{ required: true, message: '请选择执行频率', trigger: 'change' }],
};

// 加载任务列表
const loadTasks = async () => {
  loading.value = true;
  try {
    const params: any = {};
    if (searchName.value) params.name = searchName.value;
    if (searchEnabled.value !== undefined) params.enabled = searchEnabled.value;

    const data: any = await taskApi.getTasks(params);
    tasks.value = data as Task[];
    selectedTasks.value = [];
    tableRef.value?.clearSelection?.();
  } catch (error) {
    console.error('加载任务列表失败', error);
  } finally {
    loading.value = false;
  }
};

const resetFilters = () => {
  searchName.value = '';
  searchEnabled.value = undefined;
  loadTasks();
};

const handleSelectionChange = (rows: Task[]) => {
  selectedTasks.value = rows;
};

const editSelectedTask = () => {
  if (selectedTasks.value.length !== 1) {
    ElMessage.warning('请选择一条任务进行编辑');
    return;
  }

  editTask(selectedTasks.value[0]);
};

// 显示创建对话框
const showCreateDialog = () => {
  isEdit.value = false;
  dialogVisible.value = true;
};

// 查看任务
const viewTask = (task: Task) => {
  ElMessageBox.alert(
    `<pre>${JSON.stringify(task, null, 2)}</pre>`,
    '任务详情',
    {
      dangerouslyUseHTMLString: true,
      confirmButtonText: '关闭',
    }
  );
};

// 编辑任务
const editTask = (task: Task) => {
  isEdit.value = true;
  editingId.value = task.id!;
  Object.assign(taskForm, task);
  tagsInput.value = task.tags.join(',');
  dialogVisible.value = true;
};

// 切换任务状态
const toggleTask = async (task: Task) => {
  try {
    await taskApi.toggleTask(task.id!, !task.enabled);
    ElMessage.success(task.enabled ? '任务已禁用' : '任务已启用');
    loadTasks();
  } catch (error) {
    console.error('切换任务状态失败', error);
  }
};

// 删除任务
const deleteTask = async (task: Task) => {
  try {
    await ElMessageBox.confirm(`确定要删除任务"${task.name}"吗？`, '提示', {
      type: 'warning',
    });
    await taskApi.deleteTask(task.id!);
    ElMessage.success('任务已删除');
    loadTasks();
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除任务失败', error);
    }
  }
};

// 执行任务
const executeTask = async (task: Task) => {
  const loadingMsg = ElMessage({
    message: '正在执行任务...',
    type: 'info',
    duration: 0,
  });

  try {
    const result: any = await executorApi.triggerTask(task.id!);
    loadingMsg.close();

    const status = result.result.success ? 'success' : 'error';
    const message = result.result.success
      ? `执行成功！响应时间: ${result.result.responseTime}ms`
      : `执行失败！状态码: ${result.result.statusCode || '无'}`;

    ElMessage({
      type: status,
      message,
      duration: 3000,
    });

    loadTasks();
  } catch (error) {
    loadingMsg.close();
    console.error('执行任务失败', error);
  }
};

// 提交表单
const submitForm = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid: boolean) => {
    if (!valid) return;

    try {
      // 处理标签
      taskForm.tags = tagsInput.value
        ? tagsInput.value.split(',').map((t: string) => t.trim()).filter((t: string) => t)
        : [];

      if (isEdit.value) {
        await taskApi.updateTask(editingId.value, taskForm);
        ElMessage.success('任务更新成功');
      } else {
        await taskApi.createTask(taskForm);
        ElMessage.success('任务创建成功');
      }

      dialogVisible.value = false;
      loadTasks();
    } catch (error) {
      console.error('提交失败', error);
    }
  });
};

// 重置表单
const resetForm = () => {
  formRef.value?.resetFields();
  Object.assign(taskForm, {
    name: '',
    description: '',
    enabled: true,
    frequency: { type: 'minute', interval: 5 },
    apiEndpoint: { url: '', method: 'GET', timeout: 5000 },
    validationRules: [],
    alertRules: [],
    tags: [],
  });
  tagsInput.value = '';
};

// 格式化频率
const formatFrequency = (frequency: any) => {
  const typeMap: any = { minute: '分钟', hour: '小时', day: '天' };
  return `每${frequency.interval}${typeMap[frequency.type]}`;
};

// 格式化时间
const formatTime = (time: string) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss');
};

// 获取最大间隔
const getMaxInterval = () => {
  const maxMap: any = { minute: 59, hour: 23, day: 365 };
  return maxMap[taskForm.frequency.type] || 59;
};

// 显示校验规则对话框
const showValidationDialog = () => {
  validationDialogVisible.value = true;
};

// 添加校验规则
const addValidationRule = () => {
  Object.assign(currentRule, {
    id: `rule_${Date.now()}`,
    fieldPath: '',
    ruleType: 'exists',
    config: {},
    required: false,
  });
  enumValuesInput.value = '';
  ruleFormVisible.value = true;
};

// 确认添加规则
const confirmAddRule = () => {
  if (!currentRule.fieldPath) {
    ElMessage.warning('请输入字段路径');
    return;
  }

  // 处理枚举值
  if (currentRule.ruleType === 'enum' && enumValuesInput.value) {
    currentRule.config.enumValues = enumValuesInput.value
      .split(',')
      .map((v: string) => v.trim())
      .filter((v: string) => v);
  }

  taskForm.validationRules.push({ ...currentRule });
  ruleFormVisible.value = false;
  ElMessage.success('规则已添加');
};

// 删除校验规则
const removeValidationRule = (index: number) => {
  taskForm.validationRules.splice(index, 1);
};

// 获取校验类型标签
const getValidationTypeLabel = (type: string) => {
  const map: any = {
    exists: '存在性',
    type: '类型',
    range: '范围',
    pattern: '正则',
    enum: '枚举',
  };
  return map[type] || type;
};

// 格式化校验配置
const formatValidationConfig = (rule: any) => {
  switch (rule.ruleType) {
    case 'type':
      return `类型: ${rule.config.expectedType}`;
    case 'range':
      return `范围: [${rule.config.min ?? '-∞'}, ${rule.config.max ?? '+∞'}]`;
    case 'pattern':
      return `正则: ${rule.config.pattern}`;
    case 'enum':
      return `枚举: ${rule.config.enumValues?.join(', ')}`;
    default:
      return '-';
  }
};

onMounted(() => {
  loadTasks();
});
</script>

<style scoped>
.tasks-container {
  height: 100%;
  padding: 2px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-bar {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

:deep(.el-card) {
  border-radius: 18px;
}
</style>
