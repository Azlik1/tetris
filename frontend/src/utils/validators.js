export function validateMode(mode) {
  const validModes = ['MARATHON', 'TIME_ATTACK', 'FORTY_LINES'];
  return validModes.includes(mode);
}

export function validateRotation(direction) {
  return direction === 'right' || direction === 'left';
}

export function validatePiecePosition(x, y, cols = 10, rows = 20) {
  return x >= -3 && x < cols + 3 && y >= -3 && y < rows + 3;
}

export function validateLinesCleared(lines) {
  return Number.isInteger(lines) && lines >= 0 && lines <= 4;
}

export function validateLevel(level) {
  return Number.isInteger(level) && level >= 1 && level <= 15;
}

export function validatePieceType(type) {
  const types = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  return types.includes(type);
}

export function validateDOMElement(element, id) {
  if (!element) {
    console.warn(`DOM 元素不存在: ${id}`);
    return false;
  }
  return true;
}

export function safeGetElement(id) {
  const element = document.getElementById(id);
  return validateDOMElement(element, id) ? element : null;
}

export function safeGetContext(canvas) {
  if (!canvas) return null;
  try {
    return canvas.getContext('2d');
  } catch (e) {
    console.error('获取画布上下文失败:', e);
    return null;
  }
}

export function safeCall(fn, fallback = null, ...args) {
  try {
    return fn(...args);
  } catch (e) {
    console.error('函数调用失败:', e);
    return fallback;
  }
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function checkBoundary(x, y, cols = 10, rows = 20) {
  const result = {
    outOfLeft: x < 0,
    outOfRight: x >= cols,
    outOfBottom: y >= rows,
    outOfTop: y < 0,
    valid: x >= 0 && x < cols && y >= 0 && y < rows
  };
  result.outOfBounds = !result.valid;
  return result;
}

export function validateMatrix(matrix) {
  if (!Array.isArray(matrix)) return false;
  if (matrix.length === 0) return false;

  const width = matrix[0].length;

  for (const row of matrix) {
    if (!Array.isArray(row)) return false;
    if (row.length !== width) return false;
  }

  return true;
}

export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export default {
  validateMode,
  validateRotation,
  validatePiecePosition,
  validateLinesCleared,
  validateLevel,
  validatePieceType,
  validateDOMElement,
  safeGetElement,
  safeGetContext,
  safeCall,
  clamp,
  checkBoundary,
  validateMatrix,
  deepClone
};
