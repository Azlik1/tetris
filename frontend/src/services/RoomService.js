import SocketService from './SocketService.js';
import Toast from '../utils/Toast.js';

class RoomService {
  constructor() {
    this.currentRoom = null;
    this.rooms = [];
    this.listeners = new Map();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => cb(data));
  }

  async createRoom(roomData) {
    const result = await SocketService.emit('room_create', roomData);
    if (result.success) {
      this.currentRoom = result.room;
      Toast.success('房间创建成功');
      this.emit('roomCreated', result.room);
      this.emit('roomJoined', result.room);
    }
    return result;
  }

  async joinRoom(roomCode, password = null) {
    const result = await SocketService.emit('room_join', { roomCode, password });
    if (result.success) {
      this.currentRoom = result.room;
      Toast.success('加入房间成功');
      this.emit('roomJoined', result.room);
    }
    return result;
  }

  async leaveRoom() {
    const result = await SocketService.emit('room_leave');
    if (result.success) {
      this.currentRoom = null;
      Toast.info('已退出房间');
      this.emit('roomLeft');
    }
    return result;
  }

  async getRoomList() {
    const result = await SocketService.emit('room_list');
    if (result.success) {
      this.rooms = result.rooms;
    }
    return result;
  }

  async toggleReady() {
    return await SocketService.emit('room_ready_toggle');
  }

  async sendMessage(content) {
    return await SocketService.emit('room_message', { content });
  }

  getCurrentRoom() {
    return this.currentRoom;
  }

  isCreator(userId) {
    return this.currentRoom && this.currentRoom.creatorId === userId;
  }
}

export default new RoomService();
