import SocketService from './SocketService.js';
import Toast from '../utils/Toast.js';
import { EventEmitter } from '../utils/EventEmitter.js';
import { SOCKET_EVENTS, ERROR_CODES, getErrorMessage, GAME_MODE } from '../config/constants.js';

class RoomService extends EventEmitter {
  constructor() {
    super();
    this.currentRoom = null;
    this.rooms = [];
  }

  /**
   * 创建房间
   * @param {Object} params
   * @param {string} params.roomName - 房间名称
   * @param {number} params.capacity - 最大人数 (2-4)
   * @param {string} params.password - 房间密码 (可选)
   * @param {string} params.mode - 游戏模式
   */
  async createRoom(params) {
    const { roomName, capacity = 2, password = '', mode = GAME_MODE.BATTLE } = params;

    const validateError = this._validateRoomParams({ roomName, capacity });
    if (validateError) {
      Toast.error(getErrorMessage(validateError));
      return { success: false, code: validateError };
    }

    const result = await SocketService.emit(SOCKET_EVENTS.ROOM_CREATE, {
      roomName,
      capacity,
      password,
      mode
    });

    if (result.success) {
      this.currentRoom = result.data?.room || result.room;
      Toast.success('房间创建成功');
      this.emit('roomCreated', this.currentRoom);
      this.emit('roomJoined', this.currentRoom);
    } else {
      Toast.error(result.message || '创建房间失败');
    }

    return result;
  }

  /**
   * 加入房间
   * @param {string} roomCode - 房间编码
   * @param {string} password - 房间密码
   */
  async joinRoom(roomCode, password = '') {
    if (!roomCode || roomCode.length < 4) {
      Toast.error('请输入有效的房间号');
      return { success: false, code: ERROR_CODES.ROOM_NOT_EXIST };
    }

    const result = await SocketService.emit(SOCKET_EVENTS.ROOM_JOIN, {
      roomCode: roomCode.toUpperCase().trim(),
      password
    });

    if (result.success) {
      this.currentRoom = result.data?.room || result.room;
      Toast.success('加入房间成功');
      this.emit('roomJoined', this.currentRoom);
    } else {
      Toast.error(result.message || '加入房间失败');
    }

    return result;
  }

  /**
   * 离开房间
   */
  async leaveRoom() {
    if (!this.currentRoom) {
      return { success: true };
    }

    const result = await SocketService.emit(SOCKET_EVENTS.ROOM_LEAVE);

    if (result.success) {
      const roomInfo = { ...this.currentRoom };
      this.currentRoom = null;
      Toast.info('已退出房间');
      this.emit('roomLeft', roomInfo);
    }

    return result;
  }

  /**
   * 获取房间列表
   */
  async getRoomList() {
    const result = await SocketService.emit(SOCKET_EVENTS.ROOM_LIST);

    if (result.success) {
      this.rooms = result.data?.rooms || result.rooms || [];
      this.emit('roomListUpdated', this.rooms);
    }

    return result;
  }

  /**
   * 切换准备状态
   */
  async toggleReady() {
    if (!this.currentRoom) {
      Toast.error('请先加入房间');
      return { success: false };
    }

    return await SocketService.emit(SOCKET_EVENTS.ROOM_READY_TOGGLE);
  }

  /**
   * 发送房间消息
   * @param {string} content - 消息内容
   */
  async sendMessage(content) {
    if (!content || !content.trim()) {
      return;
    }

    if (!this.currentRoom) {
      Toast.error('请先加入房间');
      return;
    }

    return await SocketService.emit(SOCKET_EVENTS.ROOM_MESSAGE, {
      content: content.trim()
    });
  }

  /**
   * 开始游戏 (仅房主)
   */
  async startGame() {
    if (!this.currentRoom) {
      Toast.error('请先加入房间');
      return { success: false };
    }

    return await SocketService.emit(SOCKET_EVENTS.GAME_START);
  }

  getCurrentRoom() {
    return this.currentRoom;
  }

  isCreator(userId) {
    return this.currentRoom && this.currentRoom.creatorId === userId;
  }

  /**
   * 销毁服务，清理所有事件监听
   */
  destroy() {
    this.currentRoom = null;
    this.rooms = [];
    this.removeAllListeners();
  }

  _validateRoomParams(params) {
    const { roomName, capacity } = params;

    if (!roomName || roomName.length < 1 || roomName.length > 20) {
      return ERROR_CODES.ROOM_NAME_INVALID;
    }

    const cap = parseInt(capacity);
    if (isNaN(cap) || cap < 2 || cap > 4) {
      return ERROR_CODES.ROOM_CAPACITY_INVALID;
    }

    return null;
  }
}

export default new RoomService();
