import { describe, it, expect, beforeEach } from 'vitest';
import { TaskValidator } from '../src/modules/tasks/task.validator';
import { FieldValidator } from '../src/modules/validator/field.validator';

describe('TaskValidator', () => {
  let validator: TaskValidator;

  beforeEach(() => {
    validator = new TaskValidator();
  });

  describe('validateFrequency', () => {
    it('应该接受有效的分钟频率', () => {
      expect(() => {
        validator.validateFrequency({
          type: 'minute',
          interval: 5,
        });
      }).not.toThrow();
    });

    it('应该拒绝无效的分钟间隔', () => {
      expect(() => {
        validator.validateFrequency({
          type: 'minute',
          interval: 60,
        });
      }).toThrow('分钟间隔必须在1-59之间');
    });

    it('应该拒绝负数间隔', () => {
      expect(() => {
        validator.validateFrequency({
          type: 'hour',
          interval: -1,
        });
      }).toThrow('执行频率间隔必须大于0');
    });
  });

  describe('validateApiEndpoint', () => {
    it('应该接受有效的URL', () => {
      expect(() => {
        validator.validateApiEndpoint({
          url: 'https://api.example.com',
          method: 'GET',
          timeout: 5000,
        });
      }).not.toThrow();
    });

    it('应该拒绝无效的URL', () => {
      expect(() => {
        validator.validateApiEndpoint({
          url: 'not-a-url',
          method: 'GET',
          timeout: 5000,
        });
      }).toThrow('API地址格式不正确');
    });

    it('应该拒绝过长的超时时间', () => {
      expect(() => {
        validator.validateApiEndpoint({
          url: 'https://api.example.com',
          method: 'GET',
          timeout: 70000,
        });
      }).toThrow('超时时间不能超过60秒');
    });
  });
});

describe('FieldValidator', () => {
  let validator: FieldValidator;

  beforeEach(() => {
    validator = new FieldValidator();
  });

  describe('validateFieldExists', () => {
    it('应该检测到存在的字段', () => {
      const data = { name: 'test', age: 25 };
      expect(validator.validateFieldExists(data, 'name')).toBe(true);
      expect(validator.validateFieldExists(data, 'age')).toBe(true);
    });

    it('应该检测到不存在的字段', () => {
      const data = { name: 'test' };
      expect(validator.validateFieldExists(data, 'email')).toBe(false);
    });

    it('应该支持嵌套字段', () => {
      const data = { user: { profile: { name: 'test' } } };
      expect(validator.validateFieldExists(data, 'user.profile.name')).toBe(true);
      expect(validator.validateFieldExists(data, 'user.profile.age')).toBe(false);
    });
  });

  describe('validateFieldType', () => {
    it('应该正确验证字符串类型', () => {
      expect(validator.validateFieldType('hello', 'string')).toBe(true);
      expect(validator.validateFieldType(123, 'string')).toBe(false);
    });

    it('应该正确验证数字类型', () => {
      expect(validator.validateFieldType(123, 'number')).toBe(true);
      expect(validator.validateFieldType('123', 'number')).toBe(false);
    });

    it('应该正确验证布尔类型', () => {
      expect(validator.validateFieldType(true, 'boolean')).toBe(true);
      expect(validator.validateFieldType(1, 'boolean')).toBe(false);
    });

    it('应该正确验证数组类型', () => {
      expect(validator.validateFieldType([1, 2, 3], 'array')).toBe(true);
      expect(validator.validateFieldType({ length: 3 }, 'array')).toBe(false);
    });

    it('应该正确验证对象类型', () => {
      expect(validator.validateFieldType({ name: 'test' }, 'object')).toBe(true);
      expect(validator.validateFieldType([1, 2], 'object')).toBe(false);
      expect(validator.validateFieldType(null, 'object')).toBe(false);
    });
  });

  describe('validateFieldRange', () => {
    it('应该验证数值在范围内', () => {
      expect(validator.validateFieldRange(5, 1, 10)).toBe(true);
      expect(validator.validateFieldRange(1, 1, 10)).toBe(true);
      expect(validator.validateFieldRange(10, 1, 10)).toBe(true);
    });

    it('应该拒绝超出范围的数值', () => {
      expect(validator.validateFieldRange(0, 1, 10)).toBe(false);
      expect(validator.validateFieldRange(11, 1, 10)).toBe(false);
    });

    it('应该支持只有最小值', () => {
      expect(validator.validateFieldRange(100, 50, undefined)).toBe(true);
      expect(validator.validateFieldRange(40, 50, undefined)).toBe(false);
    });

    it('应该支持只有最大值', () => {
      expect(validator.validateFieldRange(50, undefined, 100)).toBe(true);
      expect(validator.validateFieldRange(150, undefined, 100)).toBe(false);
    });
  });

  describe('validateFieldPattern', () => {
    it('应该验证正则匹配', () => {
      const phonePattern = /^\d{11}$/;
      expect(validator.validateFieldPattern('13800138000', phonePattern)).toBe(true);
      expect(validator.validateFieldPattern('138001380', phonePattern)).toBe(false);
    });

    it('应该验证邮箱格式', () => {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(validator.validateFieldPattern('test@example.com', emailPattern)).toBe(true);
      expect(validator.validateFieldPattern('invalid-email', emailPattern)).toBe(false);
    });
  });

  describe('calculatePassRate', () => {
    it('应该正确计算通过率', () => {
      const results = [
        { fieldPath: 'a', ruleId: '1', passed: true },
        { fieldPath: 'b', ruleId: '2', passed: true },
        { fieldPath: 'c', ruleId: '3', passed: false },
        { fieldPath: 'd', ruleId: '4', passed: true },
      ];
      expect(validator.calculatePassRate(results)).toBe(75);
    });

    it('应该处理空结果', () => {
      expect(validator.calculatePassRate([])).toBe(100);
    });

    it('应该处理全部失败', () => {
      const results = [
        { fieldPath: 'a', ruleId: '1', passed: false },
        { fieldPath: 'b', ruleId: '2', passed: false },
      ];
      expect(validator.calculatePassRate(results)).toBe(0);
    });
  });
});
