import { EventEmitter } from '../utils/EventEmitter.js';
import {
  GAME_MODES,
  GAME_MODE_LABELS,
  TIME_ATTACK_DURATION,
  FORTY_LINES_TARGET,
  isValidGameMode,
  isValidRotation
} from '../config/tetrisConfig.js';
import { DOM_IDS } from '../config/tetrisConfig.js';
import Tetromino from './Tetromino.js';
import GameBoard from './GameBoard.js';
import ScoreManager from './ScoreManager.js';
import TetrisRenderer from './TetrisRenderer.js';
import InputHandler from './InputHandler.js';
import RankAPI from '../services/RankAPI.js';
import Toast from '../utils/Toast.js';
import { throttle } from '../utils/performance.js';

export class TetrisGame extends EventEmitter {
  constructor(options = {}) {
    super();

    this.rows = options.rows || 20;
    this.cols = options.cols || 10;
    this.cellSize = options.cellSize || 30;

    this._initModules();
    this._initState();
  }

  _initModules() {
    this.board = new GameBoard(this.rows, this.cols);
    this.scoreManager = new ScoreManager();
    this.renderer = new TetrisRenderer({ cellSize: this.cellSize });
    this.inputHandler = new InputHandler();
  }

  _initState() {
    this.currentPiece = null;
    this.nextPiece = null;
    this.holdPiece = null;
    this.canHold = true;

    this.gameOver = false;
    this.paused = false;
    this.started = false;
    this.mode = GAME_MODES.MARATHON;

    this.dropTimer = 0;
    this.lastTime = 0;
    this.animationId = null;

    this.remainingTime = TIME_ATTACK_DURATION;
    this.lastUpdateTime = 0;

    this.userManager = null;
  }

  init() {
    this._initDOM();
    this._bindInputEvents();
    this._bindScoreEvents();
  }

  _initDOM() {
    try {
      this.renderer.initCanvases({
        main: DOM_IDS.CANVAS,
        next: DOM_IDS.NEXT_CANVAS,
        hold: DOM_IDS.HOLD_CANVAS
      });

      this.renderer.initDOMElements({
        score: DOM_IDS.SCORE,
        lines: DOM_IDS.LINES,
        level: DOM_IDS.LEVEL,
        time: DOM_IDS.TIME,
        modeInfo: DOM_IDS.MODE_INFO
      });
    } catch (e) {
      console.warn('部分DOM元素未找到:', e);
    }
  }

  _bindInputEvents() {
    const throttledLeft = throttle(() => this.moveLeft(), 50);
    const throttledRight = throttle(() => this.moveRight(), 50);
    const throttledDrop = throttle(() => this.softDrop(), 30);

    this.inputHandler.on('moveLeft', throttledLeft);
    this.inputHandler.on('moveRight', throttledRight);
    this.inputHandler.on('rotateRight', () => this.rotate('right'));
    this.inputHandler.on('rotateLeft', () => this.rotate('left'));
    this.inputHandler.on('softDrop', throttledDrop);
    this.inputHandler.on('hardDrop', () => this.hardDrop());
    this.inputHandler.on('hold', () => this.hold());
    this.inputHandler.on('togglePause', () => this.togglePause());

    this.inputHandler.bindButtons({
      moveLeft: DOM_IDS.BTN_LEFT,
      moveRight: DOM_IDS.BTN_RIGHT,
      rotateRight: DOM_IDS.BTN_ROTATE,
      softDrop: DOM_IDS.BTN_DROP,
      hardDrop: DOM_IDS.BTN_HARD_DROP
    });
  }

  _bindScoreEvents() {
    this.scoreManager.on('scoreUpdate', (stats) => {
      this.renderer.updateStats(stats);
    });

    this.scoreManager.on('levelUp', (level) => {
      Toast.success(`升级! 达到 Level ${level}`);
    });
  }

  startGame(mode = GAME_MODES.MARATHON) {
    if (!isValidGameMode(mode)) {
      console.warn(`无效的游戏模式: ${mode}，使用默认 MARATHON`);
      mode = GAME_MODES.MARATHON;
    }

    this.mode = mode;
    this._resetGame();
    this._startGameLoop();

    this.emit('gameStart', { mode });
  }

  _resetGame() {
    this.board.reset();
    this.scoreManager.reset();

    this.currentPiece = Tetromino.createRandom();
    this.nextPiece = Tetromino.createRandom();
    this.holdPiece = null;
    this.canHold = true;

    this.gameOver = false;
    this.paused = false;
    this.started = true;
    this.dropTimer = 0;
    this.remainingTime = TIME_ATTACK_DURATION;

    this.renderer.updateStats(this.scoreManager.getStats());
    this.renderer.updateModeInfo(GAME_MODE_LABELS[this.mode]);
    this.renderer.clearOverlay();
  }

  _startGameLoop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    this.lastTime = performance.now();
    this.lastUpdateTime = this.lastTime;
    this._gameLoop();
  }

  _gameLoop(currentTime = performance.now()) {
    if (this.gameOver) return;

    this.animationId = requestAnimationFrame(t => this._gameLoop(t));

    if (this.paused) {
      this.renderer.drawPaused();
      return;
    }

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this._updateTimeMode(currentTime);

    this.dropTimer += deltaTime;
    if (this.dropTimer >= this.scoreManager.getDropInterval()) {
      this.drop();
      this.dropTimer = 0;
    }

    this.render();
  }

  _updateTimeMode(currentTime) {
    if (this.mode !== GAME_MODES.TIME_ATTACK) return;

    const delta = currentTime - this.lastUpdateTime;
    this.lastUpdateTime = currentTime;

    this.remainingTime = Math.max(0, this.remainingTime - delta);
    this.renderer.updateTime(this.remainingTime);

    if (this.remainingTime <= 0) {
      this.endGame();
    }
  }

  moveLeft() {
    if (this.gameOver || this.paused) return;

    if (!this.board.checkCollision(this.currentPiece, { x: -1, y: 0 })) {
      this.currentPiece.position.x--;
    }
  }

  moveRight() {
    if (this.gameOver || this.paused) return;

    if (!this.board.checkCollision(this.currentPiece, { x: 1, y: 0 })) {
      this.currentPiece.position.x++;
    }
  }

  rotate(direction = 'right') {
    if (this.gameOver || this.paused) return;
    if (!isValidRotation(direction)) return;

    const fromState = this.currentPiece.rotationState;
    const cloned = this.currentPiece.clone();
    cloned.rotateMatrix(direction);

    const kickOffsets = cloned.getWallKickOffsets(fromState,
      direction === 'right' ? (fromState + 1) % 4 : (fromState + 3) % 4
    );

    for (const [dx, dy] of kickOffsets) {
      if (!this.board.checkCollision(cloned, { x: dx, y: -dy })) {
        this.currentPiece.rotateMatrix(direction);
        this.currentPiece.position.x += dx;
        this.currentPiece.position.y -= dy;
        this.currentPiece.updateRotationState(direction);
        return;
      }
    }
  }

  softDrop() {
    if (this.gameOver || this.paused) return;

    if (this.drop()) {
      this.scoreManager.addSoftDropPoints(1);
    }
  }

  hardDrop() {
    if (this.gameOver || this.paused) return;

    let dropDistance = 0;
    while (!this.board.checkCollision(this.currentPiece, { x: 0, y: dropDistance + 1 })) {
      dropDistance++;
    }

    this.currentPiece.position.y += dropDistance;
    this.scoreManager.addHardDropPoints(dropDistance);
    this.lockPiece();
  }

  drop() {
    if (this.gameOver || this.paused) return false;

    if (!this.board.checkCollision(this.currentPiece, { x: 0, y: 1 })) {
      this.currentPiece.position.y++;
      return true;
    }

    this.lockPiece();
    return false;
  }

  lockPiece() {
    this.board.lockPiece(this.currentPiece);

    const linesCleared = this.board.clearLines();
    this.scoreManager.onLinesCleared(linesCleared);

    this._checkFortyLinesMode();

    this.spawnNextPiece();
  }

  _checkFortyLinesMode() {
    if (this.mode === GAME_MODES.FORTY_LINES) {
      if (this.scoreManager.lines >= FORTY_LINES_TARGET) {
        this.endGame();
      }
    }
  }

  spawnNextPiece() {
    this.currentPiece = this.nextPiece;
    this.nextPiece = Tetromino.createRandom();
    this.canHold = true;

    if (this.board.checkCollision(this.currentPiece)) {
      this.endGame();
    }
  }

  hold() {
    if (this.gameOver || this.paused) return;
    if (!this.canHold) return;

    const type = this.currentPiece.type;
    let newPiece;

    if (this.holdPiece) {
      newPiece = new Tetromino(this.holdPiece.type, { x: 3, y: 0 });
      let offsetY = 0;
      while (this.board.checkCollision(newPiece, { x: 0, y: offsetY }) && offsetY > -5) {
        offsetY--;
      }
      newPiece.position.y = Math.max(0, newPiece.position.y + offsetY);
      this.currentPiece = newPiece;
    } else {
      this.spawnNextPiece();
    }

    this.holdPiece = new Tetromino(type);
    this.canHold = false;

    this.renderer.renderHoldPiece(this.holdPiece, this.canHold);
  }

  togglePause() {
    if (this.gameOver) return;

    this.paused = !this.paused;

    if (!this.paused) {
      this.renderer.clearOverlay();
      this.lastTime = performance.now();
      this.lastUpdateTime = performance.now();
    }
  }

  endGame() {
    this.gameOver = true;
    this.started = false;

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    this.renderer.drawGameOver();
    this._updateRank();

    this.emit('gameOver', this.scoreManager.getStats());
  }

  async _updateRank() {
    try {
      const stats = this.scoreManager.getStats();
      await RankAPI.updateRank(this.mode, stats.score, stats.lines, stats.level);
    } catch (e) {
      console.error('排行榜更新失败:', e);
    }
  }

  render() {
    const ghostY = this.board.getGhostPosition(this.currentPiece);
    this.renderer.renderBoard(this.board, this.currentPiece, ghostY);
    this.renderer.renderNextPiece(this.nextPiece);
    this.renderer.renderHoldPiece(this.holdPiece, this.canHold);
  }

  setUserManager(userManager) {
    this.userManager = userManager;
    if (userManager?.token) {
      RankAPI.setToken(userManager.token);
    }
  }

  startListening() {
    this.inputHandler.bind();
  }

  stopListening() {
    this.inputHandler.unbind();
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    this.inputHandler.destroy();
    this.scoreManager.removeAllListeners();
    this.renderer.destroy();

    this.removeAllListeners();
  }

  getState() {
    return {
      board: this.board.getState(),
      stats: this.scoreManager.getStats(),
      mode: this.mode,
      gameOver: this.gameOver,
      paused: this.paused,
      started: this.started
    };
  }
}

export default TetrisGame;
