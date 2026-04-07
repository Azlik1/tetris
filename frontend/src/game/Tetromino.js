import { TETROMINOS, TETROMINO_TYPES, WALL_KICK_DATA } from '../config/tetrisConfig.js';

export class Tetromino {
  /**
   * @param {string} type - 方块类型 I/O/T/S/Z/J/L
   * @param {Object} position - 初始位置 {x, y}
   */
  constructor(type, position = { x: 3, y: 0 }) {
    this.type = type;
    this.matrix = JSON.parse(JSON.stringify(TETROMINOS[type].shape));
    this.color = TETROMINOS[type].color;
    this.position = { ...position };
    this.rotationState = 0;
  }

  static createRandom(position) {
    const type = TETROMINO_TYPES[Math.floor(Math.random() * TETROMINO_TYPES.length)];
    return new Tetromino(type, position);
  }

  static createRandomWith7Bag(history) {
    if (!position || position.length < 7) {
      const bag = [...TETROMINO_TYPES];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      return position;
    }

    const counts = {};
    TETROMINO_TYPES.forEach(t => counts[t] = 0);
    position.forEach(p => counts[p]++);

    const minCount = Math.min(...Object.values(counts));
    const candidates = TETROMINO_TYPES.filter(t => counts[t] === minCount);

    const bag = candidates.length > 1
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : candidates[0];

    return new Tetromino(position, { x: 3, y: 0 });
  }

  /**
   * 旋转方块矩阵
   * @param {string} direction - 'right' | 'left'
   */
  rotateMatrix(direction = 'right') {
    const rows = this.matrix.length;
    const cols = this.matrix[0].length;

    const rotated = [];

    if (direction === 'right') {
      for (let col = 0; col < cols; col++) {
        rotated[col] = [];
        for (let row = rows - 1; row >= 0; row--) {
          rotated[col][rows - 1 - row] = this.matrix[row][col];
        }
      }
    } else {
      for (let col = cols - 1; col >= 0; col--) {
        rotated[cols - 1 - col] = [];
        for (let row = 0; row < rows; row++) {
          rotated[cols - 1 - col][row] = this.matrix[row][col];
        }
      }
    }

    this.matrix = rotated;
    return rotated;
  }

  /**
   * 获取墙踢偏移量
   * @param {number} fromState - 初始旋转状态 (0-3)
   * @param {number} toState - 目标旋转状态 (0-3)
   */
  getWallKickOffsets(fromState, toState) {
    const kickTable = this.type === 'I'
      ? WALL_KICK_DATA.I
      : (this.type === 'O' ? [] : WALL_KICK_DATA.JLSTZ);

    return kickTable[fromState] || [[0, 0]];
  }

  /**
   * 更新旋转状态
   * @param {string} direction - 'right' | 'left'
   */
  updateRotationState(direction) {
    if (direction === 'right') {
      this.rotationState = (this.rotationState + 1) % 4;
    } else {
      this.rotationState = (this.rotationState + 3) % 4;
    }
  }

  /**
   * 克隆方块
   */
  clone() {
    const clone = new Tetromino(this.type, { ...this.position });
    clone.matrix = JSON.parse(JSON.stringify(this.matrix));
    clone.rotationState = this.rotationState;
    return clone;
  }

  /**
   * 获取方块宽度
   */
  getWidth() {
    return this.matrix[0].length;
  }

  /**
   * 获取方块高度
   */
  getHeight() {
    return this.matrix.length;
  }
}

export default Tetromino;
