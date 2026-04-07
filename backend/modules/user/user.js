const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../database/dbConfig');
const { RedisUtil } = require('../database/redisConfig');
const RankManager = require('../rank/rankManager');

// JWT密钥
const JWT_SECRET = 'tetris_game_secret_key';
const JWT_EXPIRES_IN = '24h';

/**
 * 用户注册
 * @param {Object} userData - 用户数据
 * @param {string} userData.username - 用户名
 * @param {string} userData.password - 密码
 * @returns {Promise<Object>} - 注册结果
 */
async function register(userData) {
  const { username, password } = userData;
  
  try {
    // 输入验证
    if (!username || !password) {
      return { success: false, message: '请输入用户名和密码' };
    }
    if (username.length < 3 || username.length > 20) {
      return { success: false, message: '用户名长度应在3-20个字符之间' };
    }
    if (password.length < 6) {
      return { success: false, message: '密码长度至少为6个字符' };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return { success: false, message: '用户名只能包含字母、数字和下划线' };
    }
    
    // 检查用户名是否已存在
    const [existingUsers] = await pool.execute(
      'SELECT id FROM t_user WHERE username = ?',
      [username]
    );
    
    if (existingUsers.length > 0) {
      return { success: false, message: '用户名已存在' };
    }
    
    // 对密码进行哈希处理
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // 插入新用户，默认昵称为用户名
    const [result] = await pool.execute(
      'INSERT INTO t_user (username, password, nickname) VALUES (?, ?, ?)',
      [username, hashedPassword, username]
    );
    
    return { success: true, message: '注册成功', userId: result.insertId };
  } catch (error) {
    console.error('注册失败:', error);
    return { success: false, message: '注册失败，请稍后重试' };
  }
}

/**
 * 用户登录
 * @param {Object} credentials - 登录凭证
 * @param {string} credentials.username - 用户名
 * @param {string} credentials.password - 密码
 * @returns {Promise<Object>} - 登录结果
 */
async function login(credentials) {
  const { username, password } = credentials;
  
  try {
    // 输入验证
    if (!username || !password) {
      return { success: false, message: '请输入用户名和密码' };
    }
    if (username.length < 3 || username.length > 20) {
      return { success: false, message: '用户名长度应在3-20个字符之间' };
    }
    if (password.length < 6) {
      return { success: false, message: '密码长度至少为6个字符' };
    }
    
    // 查找用户，同时检查账号状态
    const [users] = await pool.execute(
      'SELECT id, username, password, nickname, status FROM t_user WHERE username = ?',
      [username]
    );
    
    if (users.length === 0) {
      return { success: false, message: '用户名或密码错误' };
    }
    
    const user = users[0];
    
    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return { success: false, message: '用户名或密码错误' };
    }
    
    // 生成JWT令牌
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    return { 
      success: true, 
      message: '登录成功', 
      token, 
      user: { id: user.id, username: user.username }
    };
  } catch (error) {
    console.error('登录失败:', error);
    return { success: false, message: '登录失败，请稍后重试' };
  }
}

/**
 * 验证JWT令牌
 * @param {string} token - JWT令牌
 * @returns {Promise<Object|null>} - 解码后的用户信息或null
 */
async function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * 根据用户ID查询用户信息
 * @param {number} userId - 用户ID
 * @returns {Promise<Object|null>} - 用户信息
 */
async function getUserById(userId) {
  try {
    // 尝试从Redis缓存中获取用户信息
    const cacheKey = `user:${userId}`;
    const cachedUser = await RedisUtil.get(cacheKey);
    
    if (cachedUser) {
      console.log('从缓存获取用户信息:', userId);
      return JSON.parse(cachedUser);
    }
    
    // 缓存中不存在，从数据库中查询
    const [users] = await pool.execute(
      'SELECT id, username, nickname, role, total_games, win_games, total_score, highest_score, create_time FROM t_user WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return null;
    }
    
    const user = users[0];
    
    // 将用户信息缓存到Redis，设置过期时间为1小时
    await RedisUtil.set(cacheKey, JSON.stringify(user), 3600);
    console.log('缓存用户信息:', userId);
    
    return user;
  } catch (error) {
    console.error('查询用户信息失败:', error);
    return null;
  }
}

// 更新用户统计数据
async function updateUserStats(userId, score, isWinner, mode = 'MARATHON') {
  try {
    // 更新用户统计数据
    const [result] = await pool.execute(
      `UPDATE t_user 
       SET total_score = total_score + ?,
           total_games = total_games + 1,
           ${isWinner ? 'win_games = win_games + 1' : ''},
           highest_score = GREATEST(highest_score, ?)
       WHERE id = ?`,
      [score, score, userId]
    );
    
    // 清除Redis缓存
    const cacheKey = `user:${userId}`;
    await RedisUtil.del(cacheKey);
    console.log('清除用户缓存:', userId);
    
    // 获取更新后的数据
    const [user] = await pool.execute('SELECT * FROM t_user WHERE id = ?', [userId]);
    
    if (user.length > 0) {
      // 同步到全局排行榜
      await RankManager.updateGlobalRank(
        user[0].id,
        user[0].username,
        user[0].total_score,
        user[0].win_count,
        mode
      );
      return { success: true, user: user[0] };
    }
    
    return { success: false, message: '用户不存在' };
  } catch (error) {
    console.error('更新用户统计数据失败:', error);
    return { success: false, message: '更新用户统计数据失败' };
  }
}

module.exports = {
  register,
  login,
  verifyToken,
  getUserById,
  updateUserStats
};