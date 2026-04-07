import { calculateScore, calculateLevel, getDropInterval } from '../config/tetrisConfig.js';
import { EventEmitter } from '../utils/EventEmitter.js';

export class ScoreManager extends EventEmitter {
  constructor() {
    super();
    this.reset();
  }

  reset() {
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.combo = 0;
    this.lastLinesCleared = 0;
  }

  /**
   * 处理消除行
   * @param {number} linesCleared - 消除行数
   * @param {boolean} isTSpin - 是否T旋
   */
  onLinesCleared(linesCleared, isTSpin = false) {
    if (linesCleared === 0) {
      this.combo = 0;
      return;
    }

    const baseScore = calculateScore(linesCleared, this.level, isTSpin);
    const comboBonus = this.combo * 50 * this.level;

    this.score += baseScore + comboBonus;
    this.lines += linesCleared;
    this.lastLinesCleared = linesCleared;

    const newLevel = calculateLevel(this.lines);
    if (newLevel > this.level) {
      this.level = newLevel;
      this.emit('levelUp', this.level);
    }

    this.combo++;

    this.emit('scoreUpdate', {
      score: this.score,
      lines: this.lines,
      level: this.level,
      combo: this.combo
    });
  }

  addSoftDropPoints(lines) {
    this.score += lines;
    this.emit('scoreUpdate', this.getStats());
  }

  addHardDropPoints(lines) {
    this.score += lines * 2;
    this.emit('scoreUpdate', this.getStats());
  }

  getDropInterval() {
    return getDropInterval(this.level);
  }

  getStats() {
    return {
      score: this.score,
      lines: this.lines,
      level: this.level,
      combo: this.combo
    };
  }

  getLevel() {
    return this.level;
  }
}

export default ScoreManager;
