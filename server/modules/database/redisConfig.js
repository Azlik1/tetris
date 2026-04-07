const redis = require('redis');

// Redis连接配置
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || '',
  db: 0,
  // 连接池配置
  maxRetriesPerRequest: 3,
  socket: {
    connectTimeout: 10000,
    keepAlive: true
  }
};

// 创建Redis客户端
const redisClient = redis.createClient(redisConfig);

// 连接Redis
redisClient.connect().then(() => {
  console.log('Redis连接成功');
}).catch((error) => {
  console.error('Redis连接失败:', error);
});

// Redis操作工具类
class RedisUtil {
  // 设置字符串值
  static async set(key, value, expire = null) {
    try {
      if (expire) {
        await redisClient.set(key, value, { EX: expire });
      } else {
        await redisClient.set(key, value);
      }
      return true;
    } catch (error) {
      console.error('Redis set error:', error);
      return false;
    }
  }
  
  // 获取字符串值
  static async get(key) {
    try {
      return await redisClient.get(key);
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }
  
  // 设置哈希表字段
  static async hset(key, field, value) {
    try {
      await redisClient.hSet(key, field, value);
      return true;
    } catch (error) {
      console.error('Redis hset error:', error);
      return false;
    }
  }
  
  // 批量设置哈希表字段
  static async hsetMultiple(key, data) {
    try {
      await redisClient.hSet(key, data);
      return true;
    } catch (error) {
      console.error('Redis hsetMultiple error:', error);
      return false;
    }
  }
  
  // 获取哈希表字段
  static async hget(key, field) {
    try {
      return await redisClient.hGet(key, field);
    } catch (error) {
      console.error('Redis hget error:', error);
      return null;
    }
  }
  
  // 获取哈希表所有字段和值
  static async hgetall(key) {
    try {
      return await redisClient.hGetAll(key);
    } catch (error) {
      console.error('Redis hgetall error:', error);
      return null;
    }
  }
  
  // 删除键
  static async del(key) {
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error('Redis del error:', error);
      return false;
    }
  }
  
  // 批量删除键
  static async delMultiple(keys) {
    try {
      await redisClient.del(keys);
      return true;
    } catch (error) {
      console.error('Redis delMultiple error:', error);
      return false;
    }
  }
  
  // SCAN命令
  static async scan(cursor, pattern) {
    try {
      // 使用传统的参数格式，兼容所有Redis版本
      return await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    } catch (error) {
      console.error('Redis SCAN error:', error);
      return [0, []];
    }
  }
  
  // 检查键是否存在
  static async exists(key) {
    try {
      return await redisClient.exists(key) > 0;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }
  
  // 发布消息到频道
  static async publish(channel, message) {
    try {
      await redisClient.publish(channel, message);
      return true;
    } catch (error) {
      console.error('Redis publish error:', error);
      return false;
    }
  }
  
  // 订阅频道
  static async subscribe(channel, callback) {
    try {
      const subscriber = redis.createClient(redisConfig);
      await subscriber.connect();
      await subscriber.subscribe(channel, (message) => {
        callback(message);
      });
      return subscriber;
    } catch (error) {
      console.error('Redis subscribe error:', error);
      return null;
    }
  }
  
  // 使用管道执行多个命令
  static async pipeline(commands) {
    try {
      const pipeline = redisClient.pipeline();
      commands.forEach(cmd => {
        const [command, ...args] = cmd;
        pipeline[command](...args);
      });
      return await pipeline.exec();
    } catch (error) {
      console.error('Redis pipeline error:', error);
      return null;
    }
  }
  
  // 设置键的过期时间
  static async expire(key, seconds) {
    try {
      await redisClient.expire(key, seconds);
      return true;
    } catch (error) {
      console.error('Redis expire error:', error);
      return false;
    }
  }
}

module.exports = {
  redisClient,
  RedisUtil
};