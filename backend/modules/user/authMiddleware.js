const { verifyToken } = require('./user');

/**
 * JWT身份验证中间件
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - 下一个中间件函数
 */
async function authenticateToken(req, res, next) {
  // 从请求头获取令牌
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ success: false, message: '未提供认证令牌' });
  }
  
  // 验证令牌
  const user = await verifyToken(token);
  if (!user) {
    return res.status(403).json({ success: false, message: '无效的认证令牌' });
  }
  
  // 将用户信息添加到请求对象
  req.user = user;
  next();
}

/**
 * Socket.IO JWT验证函数
 * @param {string} token - JWT令牌
 * @returns {Promise<Object|null>} - 解码后的用户信息或null
 */
async function verifySocketToken(token) {
  return await verifyToken(token);
}

module.exports = {
  authenticateToken,
  verifySocketToken
};