import {
  ValidationRule,
  DataType,
  FieldValidationResult,
} from '../../types/models';
import { logger } from '../../shared/logger';

export class FieldValidator {
  /**
   * 执行所有校验规则
   */
  validateAll(response: any, rules: ValidationRule[]): FieldValidationResult[] {
    const results: FieldValidationResult[] = [];

    for (const rule of rules) {
      try {
        const result = this.validateField(response, rule);
        results.push(result);
      } catch (error: any) {
        logger.error(`字段校验异常: ${rule.fieldPath}`, error);
        results.push({
          fieldPath: rule.fieldPath,
          ruleId: rule.id,
          passed: false,
          message: `校验异常: ${error.message}`,
        });
      }
    }

    return results;
  }

  /**
   * 校验单个字段
   */
  private validateField(response: any, rule: ValidationRule): FieldValidationResult {
    const value = this.getFieldValue(response, rule.fieldPath);

    const result: FieldValidationResult = {
      fieldPath: rule.fieldPath,
      ruleId: rule.id,
      passed: false,
      actualValue: value,
    };

    switch (rule.ruleType) {
      case 'exists':
        result.passed = this.validateFieldExists(response, rule.fieldPath);
        result.message = result.passed ? '字段存在' : '字段不存在';
        break;

      case 'type':
        if (!rule.config.expectedType) {
          throw new Error('类型校验缺少expectedType配置');
        }
        result.passed = this.validateFieldType(value, rule.config.expectedType);
        result.expectedValue = rule.config.expectedType;
        result.message = result.passed
          ? `类型正确: ${rule.config.expectedType}`
          : `类型错误，期望: ${rule.config.expectedType}，实际: ${typeof value}`;
        break;

      case 'range':
        if (rule.config.min === undefined && rule.config.max === undefined) {
          throw new Error('范围校验缺少min或max配置');
        }
        result.passed = this.validateFieldRange(
          value,
          rule.config.min,
          rule.config.max
        );
        result.expectedValue = { min: rule.config.min, max: rule.config.max };
        result.message = result.passed
          ? '值在范围内'
          : `值超出范围，期望: [${rule.config.min ?? '-∞'}, ${rule.config.max ?? '+∞'}]`;
        break;

      case 'pattern':
        if (!rule.config.pattern) {
          throw new Error('正则校验缺少pattern配置');
        }
        result.passed = this.validateFieldPattern(value, new RegExp(rule.config.pattern));
        result.expectedValue = rule.config.pattern;
        result.message = result.passed ? '匹配正则表达式' : '不匹配正则表达式';
        break;

      case 'enum':
        if (!rule.config.enumValues || rule.config.enumValues.length === 0) {
          throw new Error('枚举校验缺少enumValues配置');
        }
        result.passed = rule.config.enumValues.includes(value);
        result.expectedValue = rule.config.enumValues;
        result.message = result.passed
          ? '值在枚举范围内'
          : `值不在枚举范围内，期望: [${rule.config.enumValues.join(', ')}]`;
        break;

      default:
        throw new Error(`不支持的校验类型: ${rule.ruleType}`);
    }

    return result;
  }

  /**
   * 校验字段存在性
   */
  validateFieldExists(response: any, fieldPath: string): boolean {
    try {
      const value = this.getFieldValue(response, fieldPath);
      return value !== undefined && value !== null;
    } catch {
      return false;
    }
  }

  /**
   * 校验字段类型
   */
  validateFieldType(value: any, expectedType: DataType): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && !Array.isArray(value) && value !== null;
      case 'array':
        return Array.isArray(value);
      default:
        return false;
    }
  }

  /**
   * 校验字段值范围
   */
  validateFieldRange(value: number, min?: number, max?: number): boolean {
    if (typeof value !== 'number' || isNaN(value)) {
      return false;
    }

    if (min !== undefined && value < min) {
      return false;
    }

    if (max !== undefined && value > max) {
      return false;
    }

    return true;
  }

  /**
   * 校验字段正则匹配
   */
  validateFieldPattern(value: string, pattern: RegExp): boolean {
    if (typeof value !== 'string') {
      return false;
    }

    return pattern.test(value);
  }

  /**
   * 获取嵌套字段的值
   * 支持路径：data.user.name, items[0].id
   */
  private getFieldValue(obj: any, path: string): any {
    if (!obj || !path) {
      return undefined;
    }

    // 处理数组索引：items[0] -> items.0
    const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');
    const keys = normalizedPath.split('.');

    let current = obj;
    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }

  /**
   * 计算校验通过率
   */
  calculatePassRate(results: FieldValidationResult[]): number {
    if (results.length === 0) {
      return 100;
    }

    const passedCount = results.filter((r) => r.passed).length;
    return (passedCount / results.length) * 100;
  }
}
