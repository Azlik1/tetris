const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { pool, initDatabase } = require('./modules/database/dbConfig');
const { register, login, getUserById } = require('./modules/user/user');
const { authenticateToken, verifySocketToken } = require('./modules/user/authMiddleware');
const gameLogic = require('./modules/game/basicLogic');
const onlineGameLogic = require('./modules/game/onlineLogic');
const { RoomManager } = require('./modules/room/roomManager');
const RankManager = require('./modules/rank/rankManager');
const { RedisUtil } = require('./modules/database/redisConfig');

// 创建Express应用
const app = express();

// 配置CORS
app.use(cors());

// 解析JSON请求体
app.use(express.json());

// 限制登录和注册接口的请求频率
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 10, // 每个IP在15分钟内最多10次请求
  message: {
    success: false,
    message: '请求频率过高，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 限制其他API接口的请求频率
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP在15分钟内最多100次请求
  message: {
    success: false,
    message: '请求频率过高，请稍后再试'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 托管前端静态文件
app.use(express.static(path.join(__dirname, '../client')));

// 健康检查接口
app.get('/health', async (req, res) => {
  let redisStatus = 'unhealthy';
  try {
    await RedisUtil.set('health_check', 'ok', 10);
    const check = await RedisUtil.get('health_check');
    redisStatus = check === 'ok' ? 'healthy' : 'degraded';
  } catch (e) {
    redisStatus = 'unhealthy';
  }

  const healthStatus = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: pool && pool.pool && pool.pool._closed === false ? 'healthy' : 'degraded',
      redis: redisStatus
    }
  };
  
  const isHealthy = healthStatus.services.redis === 'healthy';
  res.status(isHealthy ? 200 : 503).json(healthStatus);
});

// 根路径返回前端页面
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client', 'index.html'));
});

// 用户注册路由
app.post('/api/register', authLimiter, async (req, res) => {
  const result = await register(req.body);
  res.json(result);
});

// 用户登录路由
app.post('/api/login', authLimiter, async (req, res) => {
  const result = await login(req.body);
  res.json(result);
});

// 获取用户信息路由（需要身份验证）
app.get('/api/user/:id', authenticateToken, apiLimiter, async (req, res) => {
  const userId = parseInt(req.params.id);
  // 验证用户是否有权限访问自己的信息
  if (req.user.id !== userId) {
    return res.status(403).json({ success: false, message: '无权限访问此资源' });
  }
  const userInfo = await getUserById(userId);
  if (userInfo) {
    res.json({ success: true, user: userInfo });
  } else {
    res.status(404).json({ success: false, message: '用户不存在' });
  }
});

// 获取房间列表
app.get('/api/rooms', apiLimiter, async (req, res) => {
  const result = await RoomManager.getRoomList();
  res.json(result);
});

// 全局排行榜API
app.get('/api/rank/global', authenticateToken, apiLimiter, async (req, res) => {
  try {
    const { type = 'score', limit = 10, offset = 0, mode = 'MARATHON' } = req.query;
    const result = await RankManager.getGlobalRank(type, parseInt(limit), parseInt(offset), mode);
    res.json(result);
  } catch (error) {
    console.error('获取全局排行榜失败:', error);
    res.status(500).json({ success: false, message: '获取全局排行榜失败' });
  }
});

// 获取用户排名
app.get('/api/rank/user', authenticateToken, apiLimiter, async (req, res) => {
  try {
    const { type = 'score', mode = 'MARATHON' } = req.query;
    const result = await RankManager.getUserGlobalRank(req.user.id, type, mode);
    res.json(result);
  } catch (error) {
    console.error('获取用户排名失败:', error);
    res.status(500).json({ success: false, message: '获取用户排名失败' });
  }
});

// 更新排行榜
app.post('/api/rank/update', authenticateToken, apiLimiter, async (req, res) => {
  try {
    const { score, mode } = req.body;
    const userId = req.user.id;
    const userInfo = await getUserById(userId);
    
    if (!userInfo) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    // 校验得分合理性（根据游戏模式设置合理的得分上限）
    const maxScore = {
      'MARATHON': 100000,
      'FORTY_LINES': 50000,
      'TIME_ATTACK': 30000,
      'PVP': 20000,
      'BATTLE_ROYALE': 20000,
      'TEAM_BATTLE': 20000
    };
    
    if (score > (maxScore[mode] || 50000)) {
      console.log('异常高得分，判定为作弊:', userId, score, mode);
      return res.status(403).json({ success: false, message: '得分异常，判定为作弊' });
    }
    
    // 检查得分增长速度
    const userRecord = userScoreRecords.get(userId) || { lastScore: 0, lastTime: 0 };
    const now = Date.now();
    const timeDiff = now - userRecord.lastTime;
    const scoreDiff = score - userRecord.lastScore;
    
    // 如果在短时间内得分增长过快，判定为作弊
    if (timeDiff > 0 && scoreDiff > 0 && scoreDiff / (timeDiff / 1000) > 10000) { // 每秒超过10000分
      console.log('得分增长过快，判定为作弊:', userId, scoreDiff, timeDiff);
      return res.status(403).json({ success: false, message: '得分增长过快，判定为作弊' });
    }
    
    // 更新用户得分记录
    userScoreRecords.set(userId, { lastScore: score, lastTime: now });
    
    // 更新用户统计数据
    const [result] = await pool.execute(
      `UPDATE user 
       SET total_score = total_score + ? 
       WHERE id = ?`,
      [score, userId]
    );
    
    // 获取更新后的数据
    const [updatedUser] = await pool.execute('SELECT * FROM user WHERE id = ?', [userId]);
    
    if (updatedUser.length > 0) {
      // 同步到全局排行榜
      await RankManager.updateGlobalRank(
        updatedUser[0].id,
        updatedUser[0].username,
        updatedUser[0].total_score,
        updatedUser[0].win_count,
        mode
      );
      
      res.json({ success: true, message: '排行榜更新成功' });
    } else {
      res.status(404).json({ success: false, message: '用户不存在' });
    }
  } catch (error) {
    console.error('更新排行榜失败:', error);
    res.status(500).json({ success: false, message: '更新排行榜失败' });
  }
});

// 创建HTTP服务器
const server = http.createServer(app);

// 初始化Socket.IO
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  // 开启消息压缩，减少带宽占用
  perMessageDeflate: {
    threshold: 1024, // 消息大小超过1KB时压缩
    zlibDeflateOptions: {
      level: 6 // 压缩级别，1-9，6是平衡性能和压缩率的推荐值
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024 // 解压块大小
    },
    clientNoContextTakeover: true, // 禁用客户端上下文接管，减少内存使用
    serverNoContextTakeover: true, // 禁用服务器上下文接管，减少内存使用
    serverMaxWindowBits: 10, // 服务器窗口大小，影响压缩率
    concurrencyLimit: 10, // 并发压缩限制
    threshold: 1024 // 压缩阈值
  }
});

// 存储socket与用户的映射
const socketUserMap = new Map();

// 存储用户操作频率
const userOperationFrequency = new Map();

// 存储IP连接数
const ipConnectionCount = new Map();

// 存储被封禁的IP
const bannedIPs = new Set();

// 存储用户得分记录
const userScoreRecords = new Map();

// 存储IP请求信息
const ipRequestInfo = new Map();

// 存储被封禁的IP及其封禁时间
const bannedIPsWithExpiry = new Map();

// 定期清理过期的封禁IP
setInterval(() => {
  const now = Date.now();
  bannedIPsWithExpiry.forEach((expiry, ip) => {
    if (now > expiry) {
      bannedIPsWithExpiry.delete(ip);
      bannedIPs.delete(ip);
      console.log('IP封禁已过期:', ip);
    }
  });
}, 60000); // 每分钟检查一次

// 监听客户端连接
io.on('connection', (socket) => {
  // 获取客户端IP地址
  const clientIP = socket.handshake.address;
  console.log('新客户端连接:', socket.id, 'IP:', clientIP);
  
  // 检查IP是否被封禁
  const now = Date.now();
  const expiry = bannedIPsWithExpiry.get(clientIP);
  if (expiry && now < expiry) {
    console.log('IP被封禁，拒绝连接:', clientIP);
    socket.disconnect(true);
    return;
  } else if (expiry && now >= expiry) {
    // 封禁已过期，移除
    bannedIPsWithExpiry.delete(clientIP);
    bannedIPs.delete(clientIP);
  }
  
  // 检查IP连接数
  const currentCount = ipConnectionCount.get(clientIP) || 0;
  if (currentCount >= 10) {
    console.log('IP连接数超过限制，拒绝连接:', clientIP);
    socket.disconnect(true);
    return;
  }
  
  // 更新IP连接数
  ipConnectionCount.set(clientIP, currentCount + 1);
  
  // 监听客户端发送消息
  socket.on('client_send_msg', (message) => {
    console.log('收到消息:', message);
    // 广播消息给所有连接的客户端
    io.emit('server_send_msg', message);
  });
  
  // 监听游戏操作验证
  socket.on('game_operate_verify', (operation) => {
    const user = socketUserMap.get(socket.id);
    if (!user) {
      socket.emit('game_operate_verify_response', { success: false, message: '请先登录' });
      return;
    }
    
    // 限制操作频率（每秒最多5次操作）
    const now = Date.now();
    const userId = user.id;
    const userOperations = userOperationFrequency.get(userId) || [];
    
    // 清理1秒前的操作记录
    const recentOperations = userOperations.filter(timestamp => now - timestamp < 1000);
    
    if (recentOperations.length >= 5) {
      console.log('操作频率过高，拒绝操作:', userId);
      socket.emit('game_operate_verify_response', { success: false, message: '操作频率过高，请稍后再试' });
      return;
    }
    
    // 添加当前操作记录
    recentOperations.push(now);
    userOperationFrequency.set(userId, recentOperations);
    
    console.log('收到游戏操作验证请求:', operation);
    const result = gameLogic.verifyOperation(operation);
    socket.emit('game_operate_verify_response', result);
  });
  
  // 监听用户登录验证（Socket）
  socket.on('user_login', async (credentials) => {
    const clientIP = socket.handshake.address;
    const now = Date.now();
    
    // 检查IP请求频率
    const ipInfo = ipRequestInfo.get(clientIP) || {
      loginAttempts: 0,
      lastLoginAttempt: 0,
      roomCreateAttempts: 0,
      lastRoomCreateAttempt: 0
    };
    
    // 清理1分钟前的登录尝试
    if (now - ipInfo.lastLoginAttempt > 60000) {
      ipInfo.loginAttempts = 0;
    }
    
    // 限制登录尝试频率（每分钟最多5次）
    if (ipInfo.loginAttempts >= 5) {
      console.log('登录尝试频率过高，封禁IP:', clientIP);
      // 封禁IP 5分钟
      const expiry = now + 5 * 60 * 1000;
      bannedIPsWithExpiry.set(clientIP, expiry);
      bannedIPs.add(clientIP);
      socket.disconnect(true);
      return;
    }
    
    // 更新登录尝试记录
    ipInfo.loginAttempts++;
    ipInfo.lastLoginAttempt = now;
    ipRequestInfo.set(clientIP, ipInfo);
    
    const result = await login(credentials);
    if (result.success) {
      // 存储socket与用户的映射
      socketUserMap.set(socket.id, result.user);
    }
    socket.emit('user_login_response', result);
  });
  
  // 监听创建房间
  socket.on('room_create', async (data) => {
    const user = socketUserMap.get(socket.id);
    if (!user) {
      socket.emit('room_create_response', { success: false, message: '请先登录' });
      return;
    }
    
    const clientIP = socket.handshake.address;
    const now = Date.now();
    
    // 检查IP请求频率
    const ipInfo = ipRequestInfo.get(clientIP) || {
      loginAttempts: 0,
      lastLoginAttempt: 0,
      roomCreateAttempts: 0,
      lastRoomCreateAttempt: 0
    };
    
    // 清理1分钟前的房间创建尝试
    if (now - ipInfo.lastRoomCreateAttempt > 60000) {
      ipInfo.roomCreateAttempts = 0;
    }
    
    // 限制房间创建频率（每分钟最多3次）
    if (ipInfo.roomCreateAttempts >= 3) {
      console.log('房间创建频率过高，封禁IP:', clientIP);
      // 封禁IP 5分钟
      const expiry = now + 5 * 60 * 1000;
      bannedIPsWithExpiry.set(clientIP, expiry);
      bannedIPs.add(clientIP);
      socket.disconnect(true);
      return;
    }
    
    // 更新房间创建尝试记录
    ipInfo.roomCreateAttempts++;
    ipInfo.lastRoomCreateAttempt = now;
    ipRequestInfo.set(clientIP, ipInfo);
    
    const { roomName = '默认房间', mode = 'MARATHON', capacity = 2, password = '' } = data;
    const result = await RoomManager.createRoom(user.id, user.username, mode, roomName, capacity, password);
    if (result.success) {
      // 加入房间
      socket.join(result.roomId);
      // 广播房间创建成功
      socket.emit('room_create_response', result);
      // 发布房间创建消息
      await RedisUtil.publish(`channel:${result.roomId}`, JSON.stringify({
        type: 'room_created',
        roomInfo: result.roomInfo
      }));
    } else {
      socket.emit('room_create_response', result);
    }
  });
  
  // 监听加入房间
  socket.on('room_join', async (data) => {
    const { roomId, password = '' } = data;
    const user = socketUserMap.get(socket.id);
    
    if (!user) {
      socket.emit('room_join_response', { success: false, message: '请先登录' });
      return;
    }
    
    const result = await RoomManager.joinRoom(roomId, user.id, user.username, password);
    if (result.success) {
      // 加入房间
      socket.join(roomId);
      // 广播加入成功
      socket.emit('room_join_response', result);
      // 广播给房间内其他用户
      socket.to(roomId).emit('room_player_joined', {
        roomId,
        player: { id: user.id, name: user.username },
        roomInfo: result.roomInfo
      });
      // 发布房间更新消息
      await RedisUtil.publish(`channel:${roomId}`, JSON.stringify({
        type: 'room_updated',
        roomInfo: result.roomInfo
      }));
    } else {
      socket.emit('room_join_response', result);
    }
  });
  
  // 监听退出房间
  socket.on('room_quit', async (data) => {
    const { roomId } = data;
    const user = socketUserMap.get(socket.id);
    
    if (!user) {
      socket.emit('room_quit_response', { success: false, message: '请先登录' });
      return;
    }
    
    const result = await RoomManager.quitRoom(roomId, user.id);
    if (result.success) {
      // 离开房间
      socket.leave(roomId);
      // 广播退出成功
      socket.emit('room_quit_response', result);
      
      if (!result.roomDestroyed) {
        // 广播给房间内其他用户
        socket.to(roomId).emit('room_player_left', {
          roomId,
          playerId: user.id,
          roomInfo: result.roomInfo
        });
        // 发布房间更新消息
        await RedisUtil.publish(`channel:${roomId}`, JSON.stringify({
          type: 'room_updated',
          roomInfo: result.roomInfo
        }));
      } else {
        // 广播房间销毁
        socket.to(roomId).emit('room_destroyed', {
          roomId,
          message: '房间已销毁'
        });
      }
    } else {
      socket.emit('room_quit_response', result);
    }
  });
  
  // 监听加入观战
  socket.on('room_watch', async (data) => {
    const { roomId } = data;
    const user = socketUserMap.get(socket.id);
    
    if (!user) {
      socket.emit('room_watch_response', { success: false, message: '请先登录' });
      return;
    }
    
    const result = await RoomManager.joinWatch(roomId, user.id, user.username);
    if (result.success) {
      // 加入房间
      socket.join(roomId);
      // 广播加入成功
      socket.emit('room_watch_response', result);
      // 广播给房间内其他用户
      socket.to(roomId).emit('room_watcher_joined', {
        roomId,
        watcher: { id: user.id, name: user.username },
        roomInfo: result.roomInfo
      });
      // 发布房间更新消息
      await RedisUtil.publish(`channel:${roomId}`, JSON.stringify({
        type: 'room_updated',
        roomInfo: result.roomInfo
      }));
    } else {
      socket.emit('room_watch_response', result);
    }
  });
  
  // 监听添加AI玩家
  socket.on('room_add_ai', async (data) => {
    const { roomId, count = 1 } = data;
    const user = socketUserMap.get(socket.id);
    
    if (!user) {
      socket.emit('room_add_ai_response', { success: false, message: '请先登录' });
      return;
    }
    
    const result = await RoomManager.addAIPlayer(roomId, count);
    if (result.success) {
      // 广播添加AI成功
      socket.emit('room_add_ai_response', result);
      // 广播给房间内其他用户
      io.to(roomId).emit('room_ai_added', {
        roomId,
        roomInfo: result.roomInfo
      });
      // 发布房间更新消息
      await RedisUtil.publish(`channel:${roomId}`, JSON.stringify({
        type: 'room_updated',
        roomInfo: result.roomInfo
      }));
    } else {
      socket.emit('room_add_ai_response', result);
    }
  });
  
  // 监听房间聊天
  socket.on('room_chat', async (data) => {
    const { roomId, message } = data;
    const user = socketUserMap.get(socket.id);
    
    if (!user) {
      socket.emit('room_chat_response', { success: false, message: '请先登录' });
      return;
    }
    
    // 广播消息给房间内所有用户
    io.to(roomId).emit('room_chat_message', {
      roomId,
      user: { id: user.id, name: user.username },
      message,
      timestamp: Date.now()
    });
    
    // 发布聊天消息
    await RedisUtil.publish(`channel:${roomId}`, JSON.stringify({
      type: 'room_chat',
      data: {
        user: { id: user.id, name: user.username },
        message,
        timestamp: Date.now()
      }
    }));
  });
  
  // 监听客户端断开连接
  socket.on('disconnect', () => {
    console.log('客户端断开连接:', socket.id);
    // 移除socket与用户的映射
    socketUserMap.delete(socket.id);
    
    // 减少IP连接数
    const clientIP = socket.handshake.address;
    const currentCount = ipConnectionCount.get(clientIP) || 0;
    if (currentCount > 0) {
      ipConnectionCount.set(clientIP, currentCount - 1);
    }
  });
  
  // 游戏相关事件
  // 初始化房间游戏
  socket.on('game_init', async (data) => {
    const { roomId } = data;
    const user = socketUserMap.get(socket.id);
    
    if (!user) {
      socket.emit('game_init_response', { success: false, message: '请先登录' });
      return;
    }
    
    try {
      console.log('初始化游戏，roomId:', roomId);
      const roomInfoResult = await RoomManager.getRoomInfo(roomId);
      console.log('获取房间信息结果:', roomInfoResult);
      
      if (!roomInfoResult || (roomInfoResult.success === false)) {
        socket.emit('game_init_response', { success: false, message: roomInfoResult.message || '房间不存在' });
        return;
      }
      
      const roomInfo = roomInfoResult.roomInfo;
      const players = roomInfo.players.map(p => ({ id: p.id, name: p.name }));
      const mode = roomInfo.mode || 'MARATHON';
      console.log('初始化游戏，玩家列表:', players);
      console.log('游戏模式:', mode);
      
      const gameState = await onlineGameLogic.initRoomGame(roomId, players, mode);
      console.log('游戏初始化成功:', gameState);
      
      socket.emit('game_init_response', { success: true, gameState });
    } catch (error) {
      console.error('初始化游戏失败:', error);
      socket.emit('game_init_response', { success: false, message: '初始化游戏失败' });
    }
  });
  
  // 开始游戏
  socket.on('game_start', async (data) => {
    const { roomId } = data;
    const user = socketUserMap.get(socket.id);
    
    if (!user) {
      socket.emit('game_start_response', { success: false, message: '请先登录' });
      return;
    }
    
    try {
      const gameState = await onlineGameLogic.startGame(roomId);
      socket.emit('game_start_response', { success: true, gameState });
      // 广播给房间内其他玩家
      socket.to(roomId).emit('game_started', { gameState });
    } catch (error) {
      console.error('开始游戏失败:', error);
      socket.emit('game_start_response', { success: false, message: '开始游戏失败' });
    }
  });
  
  // 玩家操作
  socket.on('game_operate', async (data) => {
    const { roomId, operation } = data;
    const user = socketUserMap.get(socket.id);
    
    if (!user) {
      socket.emit('game_operate_response', { success: false, message: '请先登录' });
      return;
    }
    
    try {
      await onlineGameLogic.handlePlayerOperation(roomId, user.id, operation);
      socket.emit('game_operate_response', { success: true });
    } catch (error) {
      console.error('处理玩家操作失败:', error);
      socket.emit('game_operate_response', { success: false, message: '处理操作失败' });
    }
  });
  
  // 暂停/恢复游戏
  socket.on('game_toggle_pause', async (data) => {
    const { roomId } = data;
    const user = socketUserMap.get(socket.id);
    
    if (!user) {
      socket.emit('game_toggle_pause_response', { success: false, message: '请先登录' });
      return;
    }
    
    try {
      const result = await onlineGameLogic.togglePause(roomId);
      socket.emit('game_toggle_pause_response', result);
      // 广播给房间内其他玩家
      if (result.success) {
        socket.to(roomId).emit('game_paused_updated', { isPaused: result.isPaused });
      }
    } catch (error) {
      console.error('暂停/恢复游戏失败:', error);
      socket.emit('game_toggle_pause_response', { success: false, message: '操作失败' });
    }
  });
  
  // 更新按键映射
  socket.on('game_update_keybindings', async (data) => {
    const { roomId, keyBindings } = data;
    const user = socketUserMap.get(socket.id);
    
    if (!user) {
      socket.emit('game_update_keybindings_response', { success: false, message: '请先登录' });
      return;
    }
    
    try {
      const result = await onlineGameLogic.updateKeyBindings(roomId, user.id, keyBindings);
      socket.emit('game_update_keybindings_response', result);
    } catch (error) {
      console.error('更新按键映射失败:', error);
      socket.emit('game_update_keybindings_response', { success: false, message: '操作失败' });
    }
  });
  
  // 开始按键修改
  socket.on('game_start_keybinding_edit', async (data) => {
    const { roomId, action } = data;
    const user = socketUserMap.get(socket.id);
    
    if (!user) {
      socket.emit('game_start_keybinding_edit_response', { success: false, message: '请先登录' });
      return;
    }
    
    try {
      const result = await onlineGameLogic.startKeyBindingEdit(roomId, user.id, action);
      socket.emit('game_start_keybinding_edit_response', result);
    } catch (error) {
      console.error('开始按键修改失败:', error);
      socket.emit('game_start_keybinding_edit_response', { success: false, message: '操作失败' });
    }
  });
  
  // 完成按键修改
  socket.on('game_complete_keybinding_edit', async (data) => {
    const { roomId, key } = data;
    const user = socketUserMap.get(socket.id);
    
    if (!user) {
      socket.emit('game_complete_keybinding_edit_response', { success: false, message: '请先登录' });
      return;
    }
    
    try {
      const result = await onlineGameLogic.completeKeyBindingEdit(roomId, user.id, key);
      socket.emit('game_complete_keybinding_edit_response', result);
    } catch (error) {
      console.error('完成按键修改失败:', error);
      socket.emit('game_complete_keybinding_edit_response', { success: false, message: '操作失败' });
    }
  });
  
  // 取消按键修改
  socket.on('game_cancel_keybinding_edit', async (data) => {
    const { roomId } = data;
    const user = socketUserMap.get(socket.id);
    
    if (!user) {
      socket.emit('game_cancel_keybinding_edit_response', { success: false, message: '请先登录' });
      return;
    }
    
    try {
      const result = await onlineGameLogic.cancelKeyBindingEdit(roomId, user.id);
      socket.emit('game_cancel_keybinding_edit_response', result);
    } catch (error) {
      console.error('取消按键修改失败:', error);
      socket.emit('game_cancel_keybinding_edit_response', { success: false, message: '操作失败' });
    }
  });
});

// 排行榜API
app.get('/api/rank/global', async (req, res) => {
  try {
    const { type = 'score', mode = 'ALL', limit = 10, offset = 0 } = req.query;
    const result = await RankManager.getGlobalRank(type, parseInt(limit), parseInt(offset), mode);
    res.json(result);
  } catch (error) {
    console.error('获取全局排行榜失败:', error);
    res.json({ success: false, message: '获取排行榜失败' });
  }
});

app.get('/api/rank/weekly', async (req, res) => {
  try {
    const { type = 'score', mode = 'ALL', limit = 10, offset = 0 } = req.query;
    const result = await RankManager.getWeeklyRank(type, parseInt(limit), parseInt(offset), mode);
    res.json(result);
  } catch (error) {
    console.error('获取周排行榜失败:', error);
    res.json({ success: false, message: '获取排行榜失败' });
  }
});

app.get('/api/rank/user/global', authenticateToken, async (req, res) => {
  try {
    const { type = 'score', mode = 'ALL' } = req.query;
    const user = req.user;
    if (!user) {
      res.json({ success: false, message: '请先登录' });
      return;
    }
    const result = await RankManager.getUserGlobalRank(user.id, type, mode);
    res.json(result);
  } catch (error) {
    console.error('获取用户全局排名失败:', error);
    res.json({ success: false, message: '获取排名失败' });
  }
});

app.get('/api/rank/user/weekly', authenticateToken, async (req, res) => {
  try {
    const { type = 'score', mode = 'ALL' } = req.query;
    const user = req.user;
    if (!user) {
      res.json({ success: false, message: '请先登录' });
      return;
    }
    const result = await RankManager.getUserWeeklyRank(user.id, type, mode);
    res.json(result);
  } catch (error) {
    console.error('获取用户周排名失败:', error);
    res.json({ success: false, message: '获取排名失败' });
  }
});

// 初始化数据库并启动服务器
async function startServer() {
  await initDatabase();
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
  });
}

// 启动服务器
startServer();