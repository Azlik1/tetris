const { RedisUtil } = require('../database/redisConfig');

// 房间最大人数
const MAX_PLAYERS_PER_ROOM = 4;

// 房间状态
const ROOM_STATUS = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  ENDED: 'ended'
};

// 生成唯一房间ID
function generateRoomId() {
  return 'room_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

// 房间管理类
class RoomManager {
  // 创建房间
  static async createRoom(creatorId, creatorName, mode = 'MARATHON', roomName = '默认房间', capacity = 2, password = '') {
    try {
      const roomId = generateRoomId();
      const roomKey = `room:${roomId}`;
      
      // 初始化房间信息
      const roomInfo = {
        roomId,
        roomName,
        creatorId,
        mode,
        capacity,
        password,
        players: JSON.stringify([{ id: creatorId, name: creatorName }]),
        status: ROOM_STATUS.WAITING,
        watchers: JSON.stringify([]),
        createdAt: Date.now()
      };
      
      // 批量存储房间信息到Redis
      await RedisUtil.hsetMultiple(roomKey, roomInfo);
      
      // 设置房间过期时间（24小时）
      await RedisUtil.expire(roomKey, 86400);
      
      return { success: true, roomId, roomInfo };
    } catch (error) {
      console.error('创建房间失败:', error);
      return { success: false, message: '创建房间失败' };
    }
  }
  
  // 获取房间信息
  static async getRoomInfo(roomId) {
    try {
      const roomKey = `room:${roomId}`;
      const roomInfo = await RedisUtil.hgetall(roomKey);
      
      if (!roomInfo) {
        return { success: false, message: '房间不存在' };
      }
      
      // 解析JSON字段
      roomInfo.players = JSON.parse(roomInfo.players);
      roomInfo.watchers = JSON.parse(roomInfo.watchers);
      
      // 确保mode字段存在
      if (!roomInfo.mode) {
        roomInfo.mode = 'MARATHON';
      }
      
      return { success: true, roomInfo };
    } catch (error) {
      console.error('获取房间信息失败:', error);
      return { success: false, message: '获取房间信息失败' };
    }
  }
  
  // 加入房间
  static async joinRoom(roomId, userId, userName, password = '') {
    try {
      const roomKey = `room:${roomId}`;
      
      // 检查房间是否存在
      const roomExists = await RedisUtil.exists(roomKey);
      if (!roomExists) {
        return { success: false, message: '房间不存在' };
      }
      
      // 获取房间信息
      const roomInfo = await RedisUtil.hgetall(roomKey);
      const players = JSON.parse(roomInfo.players);
      
      // 检查密码
      if (roomInfo.password && roomInfo.password !== password) {
        return { success: false, message: '密码错误' };
      }
      
      // 检查房间是否已满
      const capacity = parseInt(roomInfo.capacity) || 2;
      if (players.length >= capacity) {
        return { success: false, message: '房间已满' };
      }
      
      // 检查房间状态
      if (roomInfo.status !== ROOM_STATUS.WAITING) {
        return { success: false, message: '房间已开始游戏' };
      }
      
      // 检查用户是否已在房间中
      if (players.some(player => player.id === userId)) {
        return { success: false, message: '您已在房间中' };
      }
      
      // 添加玩家到房间
      players.push({ id: userId, name: userName });
      await RedisUtil.hset(roomKey, 'players', JSON.stringify(players));
      
      // 更新房间信息
      const updatedRoomInfo = {
        ...roomInfo,
        players
      };
      
      return { success: true, roomInfo: updatedRoomInfo };
    } catch (error) {
      console.error('加入房间失败:', error);
      return { success: false, message: '加入房间失败' };
    }
  }
  
  // 添加AI玩家
  static async addAIPlayer(roomId, count = 1) {
    try {
      const roomKey = `room:${roomId}`;
      
      // 检查房间是否存在
      const roomExists = await RedisUtil.exists(roomKey);
      if (!roomExists) {
        return { success: false, message: '房间不存在' };
      }
      
      // 获取房间信息
      const roomInfo = await RedisUtil.hgetall(roomKey);
      let players = JSON.parse(roomInfo.players);
      
      // 检查房间是否已满
      if (players.length + count > MAX_PLAYERS_PER_ROOM) {
        return { success: false, message: '房间已满' };
      }
      
      // 检查房间状态
      if (roomInfo.status !== ROOM_STATUS.WAITING) {
        return { success: false, message: '房间已开始游戏' };
      }
      
      // 添加AI玩家
      for (let i = 0; i < count; i++) {
        const aiId = `ai_${Date.now()}_${i}`;
        const aiName = `AI ${i + 1}`;
        players.push({ id: aiId, name: aiName, isAI: true });
      }
      
      await RedisUtil.hset(roomKey, 'players', JSON.stringify(players));
      
      // 更新房间信息
      const updatedRoomInfo = {
        ...roomInfo,
        players
      };
      
      return { success: true, roomInfo: updatedRoomInfo };
    } catch (error) {
      console.error('添加AI玩家失败:', error);
      return { success: false, message: '添加AI玩家失败' };
    }
  }
  
  // 退出房间
  static async quitRoom(roomId, userId) {
    try {
      const roomKey = `room:${roomId}`;
      
      // 检查房间是否存在
      const roomExists = await RedisUtil.exists(roomKey);
      if (!roomExists) {
        return { success: false, message: '房间不存在' };
      }
      
      // 获取房间信息
      const roomInfo = await RedisUtil.hgetall(roomKey);
      let players = JSON.parse(roomInfo.players);
      let watchers = JSON.parse(roomInfo.watchers);
      
      // 检查用户是玩家还是观战者
      const isPlayer = players.some(player => player.id === userId);
      const isWatcher = watchers.some(watcher => watcher.id === userId);
      
      if (!isPlayer && !isWatcher) {
        return { success: false, message: '您不在房间中' };
      }
      
      // 移除用户
      if (isPlayer) {
        players = players.filter(player => player.id !== userId);
        await RedisUtil.hset(roomKey, 'players', JSON.stringify(players));
      } else {
        watchers = watchers.filter(watcher => watcher.id !== userId);
        await RedisUtil.hset(roomKey, 'watchers', JSON.stringify(watchers));
      }
      
      // 检查是否需要销毁房间
      if (players.length === 0) {
        // 销毁房间
        await RedisUtil.del(roomKey);
        return { success: true, roomDestroyed: true, message: '房间已销毁' };
      }
      
      // 如果创建者退出，重新设置创建者
      if (roomInfo.creatorId === userId) {
        await RedisUtil.hset(roomKey, 'creatorId', players[0].id);
      }
      
      // 更新房间信息
      const updatedRoomInfo = {
        ...roomInfo,
        players,
        watchers,
        creatorId: players[0].id
      };
      
      return { success: true, roomInfo: updatedRoomInfo, roomDestroyed: false };
    } catch (error) {
      console.error('退出房间失败:', error);
      return { success: false, message: '退出房间失败' };
    }
  }
  
  // 加入观战
  static async joinWatch(roomId, userId, userName) {
    try {
      const roomKey = `room:${roomId}`;
      
      // 检查房间是否存在
      const roomExists = await RedisUtil.exists(roomKey);
      if (!roomExists) {
        return { success: false, message: '房间不存在' };
      }
      
      // 获取房间信息
      const roomInfo = await RedisUtil.hgetall(roomKey);
      let watchers = JSON.parse(roomInfo.watchers);
      const players = JSON.parse(roomInfo.players);
      
      // 检查用户是否已在房间中
      if (players.some(player => player.id === userId) || watchers.some(watcher => watcher.id === userId)) {
        return { success: false, message: '您已在房间中' };
      }
      
      // 添加观战者
      watchers.push({ id: userId, name: userName });
      await RedisUtil.hset(roomKey, 'watchers', JSON.stringify(watchers));
      
      // 更新房间信息
      const updatedRoomInfo = {
        ...roomInfo,
        watchers
      };
      
      return { success: true, roomInfo: updatedRoomInfo };
    } catch (error) {
      console.error('加入观战失败:', error);
      return { success: false, message: '加入观战失败' };
    }
  }
  
  // 销毁房间
  static async destroyRoom(roomId) {
    try {
      const roomKey = `room:${roomId}`;
      await RedisUtil.del(roomKey);
      return { success: true, message: '房间已销毁' };
    } catch (error) {
      console.error('销毁房间失败:', error);
      return { success: false, message: '销毁房间失败' };
    }
  }
  
  // 获取所有房间列表
  static async getRoomList() {
    try {
      // 使用SCAN命令查找所有房间
      const rooms = [];
      let cursor = 0;
      
      do {
        console.log('扫描房间，cursor:', cursor);
        const scanResult = await RedisUtil.scan(cursor, 'room:*');
        console.log('扫描结果:', scanResult);
        
        // 确保scanResult是一个数组
        if (!Array.isArray(scanResult)) {
          console.error('扫描结果不是数组:', scanResult);
          break;
        }
        
        const [newCursor, keys] = scanResult;
        console.log('新cursor:', newCursor, 'keys:', keys);
        
        cursor = parseInt(newCursor);
        
        // 确保keys是一个数组
        if (!Array.isArray(keys)) {
          console.error('keys不是数组:', keys);
          continue;
        }
        
        for (const key of keys) {
          const roomInfo = await RedisUtil.hgetall(key);
          if (roomInfo) {
            // 解析JSON字段
            roomInfo.players = JSON.parse(roomInfo.players);
            roomInfo.watchers = JSON.parse(roomInfo.watchers);
            rooms.push(roomInfo);
          }
        }
      } while (cursor !== 0);
      
      console.log('获取房间列表成功，房间数量:', rooms.length);
      return { success: true, rooms };
    } catch (error) {
      console.error('获取房间列表失败:', error);
      return { success: false, message: '获取房间列表失败' };
    }
  }
}

module.exports = {
  RoomManager,
  MAX_PLAYERS_PER_ROOM,
  ROOM_STATUS
};