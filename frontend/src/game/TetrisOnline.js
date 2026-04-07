import { EventEmitter } from '../utils/EventEmitter.js';
import {
  SOCKET_OPERATIONS,
  SOCKET_ONLINE_EVENTS,
  GAME_STATUS,
  RENDER_CONFIG
} from '../config/onlineConfig.js';
import SocketService from '../services/SocketService.js';
import MultiplayerCanvasManager from './MultiplayerCanvasManager.js';
import KeyBindingManager from './KeyBindingManager.js';
import OnlineUIManager from './OnlineUIManager.js';
import { throttle } from '../utils/performance.js';

export class TetrisOnline extends EventEmitter {
  constructor(options = {}) {
    super();

    this.roomId = options.roomId || null;
    this.userId = options.userId || null;
    this.selfId = options.selfId || null;

    this.socket = options.socket || SocketService;
    this.gameState = null;
    this.isCreator = options.isCreator || false;

    this._initModules(options);
    this._initState();
  }

  _initModules(options) {
    this.canvasManager = options.canvasManager || new MultiplayerCanvasManager(options.containerId);
    this.keyBindingManager = options.keyBindingManager || new KeyBindingManager();
    this.uiManager = options.uiManager || new OnlineUIManager();
  }

  _initState() {
    this.isDestroyed = false;
    this.isPaused = false;
    this.renderAnimationId = null;
    this.pendingRender = null;
    this.eventsBound = false;
  }

  async init(roomId, userId) {
    if (!roomId || !userId) {
      throw new Error('roomId 和 userId 不能为空');
    }

    if (!this.socket.socket || !this.socket.connected) {
      throw new Error('Socket 未连接');
    }

    this.roomId = roomId;
    this.userId = userId;
    this.selfId = userId;

    try {
      const result = await this.socket.emit(SOCKET_ONLINE_EVENTS.GAME_INIT, {
        roomId,
        userId
      });

      if (!result.success) {
        throw new Error(result.message || '初始化失败');
      }

      this.gameState = result.gameState || result.data?.gameState;

      if (this.gameState?.players) {
        this._initGame();
        this.uiManager.success('游戏初始化成功');
      } else {
        console.warn('Game state missing players:', result);
      }

      return result;
    } catch (err) {
      this.uiManager.error(err.message || '初始化失败');
      throw err;
    }
  }

  _initGame() {
    if (!this.gameState?.players) return;

    const playerIds = Object.keys(this.gameState.players);
    this.canvasManager.init(playerIds, this.selfId);
    this._bindEvents();
    this._bindKeyboard();
    this._startRenderLoop();
  }

  _bindEvents() {
    if (this.eventsBound) return;
    this.eventsBound = true;

    this.socket.on(SOCKET_ONLINE_EVENTS.GAME_STARTED, () => {
      this._onGameStarted();
    });

    this.socket.on(SOCKET_ONLINE_EVENTS.GAME_STATE_UPDATE, (gameState) => {
      this._onGameStateUpdate(gameState);
    });

    this.socket.on(SOCKET_ONLINE_EVENTS.GAME_OVER, (result) => {
      this._onGameOver(result);
    });

    this.socket.on(SOCKET_ONLINE_EVENTS.GAME_PAUSED_UPDATED, ({ isPaused }) => {
      this._onPauseUpdated(isPaused);
    });
  }

  _bindKeyboard() {
    Object.values(SOCKET_OPERATIONS).forEach(operation => {
      this.keyBindingManager.on(operation, () => {
        this._sendOperation(operation);
      });
    });

    this.keyBindingManager.on('togglePause', () => {
      this.togglePause();
    });

    this.keyBindingManager.bind();
  }

  _startRenderLoop() {
    const render = () => {
      if (this.isDestroyed) return;

      if (this.pendingRender) {
        this.canvasManager.renderAll(this.pendingRender);
        this.pendingRender = null;
      }

      this.renderAnimationId = requestAnimationFrame(render);
    };

    this.renderAnimationId = requestAnimationFrame(render);
  }

  _onGameStateUpdate = throttle((gameState) => {
    if (this.isDestroyed) return;

    this.gameState = gameState;
    this.pendingRender = gameState;
  }, RENDER_CONFIG.RENDER_THROTTLE_MS, { leading: false, trailing: true });

  _onGameStarted() {
    this.uiManager.success('游戏开始！');
    this.emit('gameStarted');
  }

  _onGameOver(result) {
    this.canvasManager.renderGameOver(() => {
      this.keyBindingManager.unbind();
    });

    const winner = result.winner || result.data?.winner;
    if (winner === this.selfId) {
      this.uiManager.success('你赢了！🎉');
    } else {
      this.uiManager.info('游戏结束');
    }

    this.emit('gameOver', result);
  }

  _onPauseUpdated(isPaused) {
    this.isPaused = isPaused;
    if (isPaused) {
      this.canvasManager.renderPaused(true);
      this.uiManager.info('游戏已暂停');
    } else {
      this.canvasManager.clearPaused();
      this.uiManager.info('游戏继续');
    }
  }

  async _sendOperation(operation) {
    if (this.isDestroyed || !this.gameState) return;
    if (this.gameState.status !== GAME_STATUS.PLAYING) return;
    if (this.isPaused) return;

    try {
      await this.socket.emit(SOCKET_ONLINE_EVENTS.GAME_OPERATE, {
        roomId: this.roomId,
        userId: this.userId,
        operation
      }, { showError: false });
    } catch (err) {
      console.debug('操作失败:', err);
    }
  }

  async togglePause() {
    if (this.isDestroyed) return;
    if (!this.isCreator) {
      this.uiManager.warning('仅房主可暂停游戏');
      return;
    }
    if (this.gameState?.status === GAME_STATUS.ENDED) return;

    await this.socket.emit(SOCKET_ONLINE_EVENTS.GAME_TOGGLE_PAUSE, {
      roomId: this.roomId
    });
  }

  async startEditKeyBinding(operation) {
    if (this.keyBindingManager.startEdit(operation)) {
      this.uiManager.info('请按下新的按键...');
    }
  }

  async completeEditKeyBinding(key) {
    await this.socket.emit(SOCKET_ONLINE_EVENTS.GAME_COMPLETE_EDIT_KEYBINDING, {
      roomId: this.roomId,
      operation: this.keyBindingManager.editingBinding,
      key
    });
  }

  getKeyBindings() {
    return this.keyBindingManager.getAllBindings();
  }

  getState() {
    return {
      gameState: this.gameState,
      isPaused: this.isPaused,
      isDestroyed: this.isDestroyed,
      isCreator: this.isCreator
    };
  }

  destroy() {
    this.isDestroyed = true;

    if (this.renderAnimationId) {
      cancelAnimationFrame(this.renderAnimationId);
      this.renderAnimationId = null;
    }

    this.pendingRender = null;

    this.keyBindingManager.destroy();
    this.canvasManager.destroy();
    this.uiManager.destroy();

    this._unbindEvents();

    this.removeAllListeners();

    this.gameState = null;
  }

  _unbindEvents() {
    Object.values(SOCKET_ONLINE_EVENTS).forEach(event => {
      this.socket.off(event);
    });
    this.eventsBound = false;
  }
}

export default TetrisOnline;
