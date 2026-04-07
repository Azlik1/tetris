// 房间管理模块
class RoomManager {
  constructor(socket) {
    this.socket = socket;
    this.currentRoom = null;
    this.rooms = [];
    this.initEventListeners();
  }
  
  // 初始化事件监听器
  initEventListeners() {
    // 房间创建响应
    this.socket.on('room_create_response', (response) => {
      if (response.success) {
        this.currentRoom = response.roomInfo;
        this.onRoomCreated(response.roomInfo);
      } else {
        this.onError(response.message);
      }
    });
    
    // 房间加入响应
    this.socket.on('room_join_response', (response) => {
      if (response.success) {
        this.currentRoom = response.roomInfo;
        this.onRoomJoined(response.roomInfo);
      } else {
        this.onError(response.message);
      }
    });
    
    // 房间退出响应
    this.socket.on('room_quit_response', (response) => {
      if (response.success) {
        this.currentRoom = null;
        this.onRoomQuit(response);
      } else {
        this.onError(response.message);
      }
    });
    
    // 房间观战响应
    this.socket.on('room_watch_response', (response) => {
      if (response.success) {
        this.currentRoom = response.roomInfo;
        this.onRoomWatchJoined(response.roomInfo);
      } else {
        this.onError(response.message);
      }
    });
    
    // 添加AI玩家响应
    this.socket.on('room_add_ai_response', (response) => {
      if (response.success) {
        this.currentRoom = response.roomInfo;
        this.onAIAdded(response.roomInfo);
      } else {
        this.onError(response.message);
      }
    });
    
    // AI玩家添加成功
    this.socket.on('room_ai_added', (data) => {
      this.currentRoom = data.roomInfo;
      this.onAIPlayerAdded(data);
    });
    
    // 玩家加入房间
    this.socket.on('room_player_joined', (data) => {
      this.onPlayerJoined(data);
    });
    
    // 玩家离开房间
    this.socket.on('room_player_left', (data) => {
      this.onPlayerLeft(data);
    });
    
    // 观战者加入
    this.socket.on('room_watcher_joined', (data) => {
      this.onWatcherJoined(data);
    });
    
    // 房间销毁
    this.socket.on('room_destroyed', (data) => {
      this.currentRoom = null;
      this.onRoomDestroyed(data);
    });
    
    // 房间聊天消息
    this.socket.on('room_chat_message', (data) => {
      this.onChatMessage(data);
    });
  }
  
  // 创建房间
  createRoom(roomName, mode = 'MARATHON', capacity = 2, password = '') {
    this.socket.emit('room_create', { roomName, mode, capacity, password });
  }
  
  // 加入房间
  joinRoom(roomId, password = '') {
    this.socket.emit('room_join', { roomId, password });
  }
  
  // 退出房间
  quitRoom() {
    if (this.currentRoom) {
      this.socket.emit('room_quit', { roomId: this.currentRoom.roomId });
    }
  }
  
  // 加入观战
  joinWatch(roomId) {
    this.socket.emit('room_watch', { roomId });
  }
  
  // 发送房间聊天消息
  sendChatMessage(message) {
    if (this.currentRoom) {
      this.socket.emit('room_chat', { 
        roomId: this.currentRoom.roomId, 
        message 
      });
    }
  }
  
  // 添加AI玩家
  addAIPlayer(roomId) {
    this.socket.emit('room_add_ai', { roomId, count: 1 });
  }
  
  // 获取房间列表
  async getRoomList() {
    try {
      const response = await fetch('/api/rooms');
      const result = await response.json();
      if (result.success) {
        this.rooms = result.rooms;
        this.onRoomListUpdated(result.rooms);
      }
      return result;
    } catch (error) {
      console.error('获取房间列表失败:', error);
      return { success: false, message: '获取房间列表失败' };
    }
  }
  
  // 事件回调（需要由外部实现）
  onRoomCreated(roomInfo) {}
  onRoomJoined(roomInfo) {}
  onRoomQuit(response) {}
  onRoomWatchJoined(roomInfo) {}
  onAIAdded(roomInfo) {}
  onAIPlayerAdded(data) {}
  onPlayerJoined(data) {}
  onPlayerLeft(data) {}
  onWatcherJoined(data) {}
  onRoomDestroyed(data) {}
  onChatMessage(data) {}
  onRoomListUpdated(rooms) {}
  onError(message) {}
}

export default RoomManager;