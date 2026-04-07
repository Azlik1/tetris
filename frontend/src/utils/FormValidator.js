import Toast from './Toast.js';

export const VALIDATION_RULES = {
  username: {
    required: true,
    minLength: 3,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9_]+$/,
    messages: {
      required: '用户名不能为空',
      minLength: '用户名至少 3 个字符',
      maxLength: '用户名最多 20 个字符',
      pattern: '用户名只能包含字母、数字和下划线'
    }
  },
  password: {
    required: true,
    minLength: 8,
    maxLength: 50,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true,
    specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
    messages: {
      required: '密码不能为空',
      minLength: '密码至少 8 个字符',
      maxLength: '密码最多 50 个字符',
      complexity: '密码需包含：大写字母、小写字母、数字、特殊字符'
    }
  },
  roomName: {
    required: true,
    minLength: 2,
    maxLength: 30,
    messages: {
      required: '房间名不能为空',
      minLength: '房间名至少 2 个字符',
      maxLength: '房间名最多 30 个字符'
    }
  },
  roomId: {
    required: true,
    pattern: /^[a-zA-Z0-9]+$/,
    messages: {
      required: '房间ID不能为空',
      pattern: '房间ID格式不正确'
    }
  },
  chatMessage: {
    required: true,
    maxLength: 500,
    messages: {
      required: '消息不能为空',
      maxLength: '消息最多 500 个字符'
    }
  }
};

export class FormValidator {
  constructor(formElement, options = {}) {
    this.form = formElement;
    this.options = {
      showInlineErrors: true,
      showToastErrors: false,
      errorClass: 'validation-error',
      successClass: 'validation-success',
      ...options
    };
    this.errors = new Map();
    this._init();
  }

  _init() {
    const inputs = this.form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.addEventListener('blur', () => this._validateField(input));
      input.addEventListener('input', () => {
        this._clearFieldError(input);
        if (this.errors.has(input.name)) {
          this._validateField(input);
        }
      });
    });
  }

  _validateField(input) {
    const fieldName = input.name || input.id;
    const rule = VALIDATION_RULES[fieldName] || VALIDATION_RULES[input.dataset.rule];
    
    if (!rule) return true;

    const value = input.value.trim();
    const error = this._checkRule(value, rule);

    if (error) {
      this._setFieldError(input, error);
      return false;
    }

    this._setFieldSuccess(input);
    return true;
  }

  _checkRule(value, rule) {
    if (rule.required && !value) {
      return rule.messages.required;
    }

    if (value && rule.minLength && value.length < rule.minLength) {
      return rule.messages.minLength;
    }

    if (value && rule.maxLength && value.length > rule.maxLength) {
      return rule.messages.maxLength;
    }

    if (value && rule.pattern && !rule.pattern.test(value)) {
      return rule.messages.pattern;
    }

    if (rule.requireUppercase || rule.requireLowercase || rule.requireNumber || rule.requireSpecial) {
      const issues = [];
      if (rule.requireUppercase && !/[A-Z]/.test(value)) issues.push('大写字母');
      if (rule.requireLowercase && !/[a-z]/.test(value)) issues.push('小写字母');
      if (rule.requireNumber && !/[0-9]/.test(value)) issues.push('数字');
      if (rule.requireSpecial) {
        const specialPattern = new RegExp(`[${rule.specialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`);
        if (!specialPattern.test(value)) issues.push('特殊字符');
      }
      if (issues.length > 0) {
        return `${rule.messages.complexity}（缺少：${issues.join('、')}）`;
      }
    }

    return null;
  }

  _setFieldError(input, message) {
    const fieldName = input.name || input.id;
    this.errors.set(fieldName, message);
    input.classList.add(this.options.errorClass);
    input.classList.remove(this.options.successClass);

    if (this.options.showInlineErrors) {
      this._showInlineError(input, message);
    }

    if (this.options.showToastErrors) {
      Toast.error(message);
    }
  }

  _setFieldSuccess(input) {
    const fieldName = input.name || input.id;
    this.errors.delete(fieldName);
    input.classList.remove(this.options.errorClass);
    input.classList.add(this.options.successClass);
    this._removeInlineError(input);
  }

  _clearFieldError(input) {
    this._removeInlineError(input);
    input.classList.remove(this.options.errorClass, this.options.successClass);
  }

  _showInlineError(input, message) {
    this._removeInlineError(input);
    
    const errorEl = document.createElement('div');
    errorEl.className = 'field-error-message';
    errorEl.textContent = message;
    errorEl.style.cssText = `
      color: #dc2626;
      font-size: 12px;
      margin-top: 4px;
    `;
    
    input.parentNode.appendChild(errorEl);
  }

  _removeInlineError(input) {
    const errorEl = input.parentNode.querySelector('.field-error-message');
    if (errorEl) {
      errorEl.remove();
    }
  }

  validate() {
    const inputs = this.form.querySelectorAll('input, select, textarea');
    let isValid = true;

    inputs.forEach(input => {
      if (!this._validateField(input)) {
        isValid = false;
      }
    });

    return isValid;
  }

  getErrors() {
    return Object.fromEntries(this.errors);
  }

  reset() {
    const inputs = this.form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      this._clearFieldError(input);
      input.value = '';
    });
    this.errors.clear();
  }

  destroy() {
    this.reset();
  }
}

export default FormValidator;
