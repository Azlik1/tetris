const { RedisUtil } = require('../database/redisConfig');

class RankManager {
  // 房间内排行榜操作
  static async updateRoomRank(roomId, userId, username, score) {
    try {
      const rankKey = `room:${roomId}:rank`;
      // 使用Redis Sorted Set存储房间内排行榜，score作为排序依据
      await RedisUtil.zadd(rankKey, score, `${userId}:${username}`);
      // 设置过期时间（24小时）
      await RedisUtil.expire(rankKey, 86400);
      return { success: true };
    } catch (error) {
      console.error('更新房间排行榜失败:', error);
      return { success: false, message: '更新房间排行榜失败' };
    }
  }

  // 批量更新房间排行榜
  static async batchUpdateRoomRank(roomId, players) {
    try {
      const rankKey = `room:${roomId}:rank`;
      const commands = [];
      
      // 构建批量命令
      players.forEach(player => {
        commands.push(['zadd', rankKey, player.score, `${player.id}:${player.name}`]);
      });
      
      // 执行批量操作
      await RedisUtil.pipeline(commands);
      // 设置过期时间（24小时）
      await RedisUtil.expire(rankKey, 86400);
      
      return { success: true };
    } catch (error) {
      console.error('批量更新房间排行榜失败:', error);
      return { success: false, message: '批量更新房间排行榜失败' };
    }
  }

  static async getRoomRank(roomId, limit = 10) {
    try {
      const rankKey = `room:${roomId}:rank`;
      // 获取房间内排行榜，按得分降序排列
      const rankList = await RedisUtil.zrevrange(rankKey, 0, limit - 1, 'WITHSCORES');
      
      // 转换格式
      const result = [];
      for (let i = 0; i < rankList.length; i += 2) {
        const [userId, username] = rankList[i].split(':');
        result.push({
          rank: i / 2 + 1,
          userId,
          username,
          score: parseInt(rankList[i + 1])
        });
      }
      
      return { success: true, rankList: result };
    } catch (error) {
      console.error('获取房间排行榜失败:', error);
      return { success: false, message: '获取房间排行榜失败' };
    }
  }

  static async clearRoomRank(roomId) {
    try {
      const rankKey = `room:${roomId}:rank`;
      await RedisUtil.del(rankKey);
      return { success: true };
    } catch (error) {
      console.error('清空房间排行榜失败:', error);
      return { success: false, message: '清空房间排行榜失败' };
    }
  }

  // 全局排行榜操作
  static async updateGlobalRank(userId, username, score, winCount, mode = 'MARATHON') {
    try {
      const commands = [];
      
      // 按得分排序的全局排行榜（所有模式）
      const scoreRankKey = 'global_rank:score';
      commands.push(['zadd', scoreRankKey, score, `${userId}:${username}`]);
      
      // 按胜场排序的全局排行榜（所有模式）
      const winRankKey = 'global_rank:win';
      commands.push(['zadd', winRankKey, winCount, `${userId}:${username}`]);
      
      // 按得分排序的全局排行榜（按模式）
      const modeScoreRankKey = `global_rank:${mode}:score`;
      commands.push(['zadd', modeScoreRankKey, score, `${userId}:${username}`]);
      
      // 按胜场排序的全局排行榜（按模式）
      const modeWinRankKey = `global_rank:${mode}:win`;
      commands.push(['zadd', modeWinRankKey, winCount, `${userId}:${username}`]);
      
      // 执行批量操作
      await RedisUtil.pipeline(commands);
      
      // 更新周排行榜
      await this.updateWeeklyRank(userId, username, score, winCount, mode);
      
      return { success: true };
    } catch (error) {
      console.error('更新全局排行榜失败:', error);
      return { success: false, message: '更新全局排行榜失败' };
    }
  }

  // 周排行榜操作
  static async updateWeeklyRank(userId, username, score, winCount, mode = 'MARATHON') {
    try {
      const weekKey = this.getWeekKey();
      const commands = [];
      
      // 按得分排序的周排行榜（所有模式）
      const scoreRankKey = `weekly_rank:${weekKey}:score`;
      commands.push(['zadd', scoreRankKey, score, `${userId}:${username}`]);
      
      // 按胜场排序的周排行榜（所有模式）
      const winRankKey = `weekly_rank:${weekKey}:win`;
      commands.push(['zadd', winRankKey, winCount, `${userId}:${username}`]);
      
      // 按得分排序的周排行榜（按模式）
      const modeScoreRankKey = `weekly_rank:${weekKey}:${mode}:score`;
      commands.push(['zadd', modeScoreRankKey, score, `${userId}:${username}`]);
      
      // 按胜场排序的周排行榜（按模式）
      const modeWinRankKey = `weekly_rank:${weekKey}:${mode}:win`;
      commands.push(['zadd', modeWinRankKey, winCount, `${userId}:${username}`]);
      
      // 执行批量操作
      await RedisUtil.pipeline(commands);
      
      // 设置过期时间（14天）
      await RedisUtil.expire(scoreRankKey, 14 * 86400);
      await RedisUtil.expire(winRankKey, 14 * 86400);
      await RedisUtil.expire(modeScoreRankKey, 14 * 86400);
      await RedisUtil.expire(modeWinRankKey, 14 * 86400);
      
      return { success: true };
    } catch (error) {
      console.error('更新周排行榜失败:', error);
      return { success: false, message: '更新周排行榜失败' };
    }
  }

  // 获取周键（格式：YYYY-WW）
  static getWeekKey() {
    const date = new Date();
    const year = date.getFullYear();
    const weekNumber = this.getWeekNumber(date);
    return `${year}-${weekNumber}`;
  }

  // 获取周数
  static getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  static async getGlobalRank(type = 'score', limit = 10, offset = 0, mode = 'ALL') {
    try {
      let rankKey;
      if (mode === 'ALL') {
        rankKey = type === 'score' ? 'global_rank:score' : 'global_rank:win';
      } else {
        rankKey = type === 'score' ? `global_rank:${mode}:score` : `global_rank:${mode}:win`;
      }
      
      // 获取全局排行榜，按得分或胜场降序排列
      const rankList = await RedisUtil.zrevrange(rankKey, offset, offset + limit - 1, 'WITHSCORES');
      
      // 转换格式
      const result = [];
      for (let i = 0; i < rankList.length; i += 2) {
        const [userId, username] = rankList[i].split(':');
        result.push({
          rank: offset + i / 2 + 1,
          userId,
          username,
          score: parseInt(rankList[i + 1])
        });
      }
      
      return { success: true, rankList: result };
    } catch (error) {
      console.error('获取全局排行榜失败:', error);
      return { success: false, message: '获取全局排行榜失败' };
    }
  }

  static async getWeeklyRank(type = 'score', limit = 10, offset = 0, mode = 'ALL') {
    try {
      const weekKey = this.getWeekKey();
      let rankKey;
      if (mode === 'ALL') {
        rankKey = type === 'score' ? `weekly_rank:${weekKey}:score` : `weekly_rank:${weekKey}:win`;
      } else {
        rankKey = type === 'score' ? `weekly_rank:${weekKey}:${mode}:score` : `weekly_rank:${weekKey}:${mode}:win`;
      }
      
      // 获取周排行榜，按得分或胜场降序排列
      const rankList = await RedisUtil.zrevrange(rankKey, offset, offset + limit - 1, 'WITHSCORES');
      
      // 转换格式
      const result = [];
      for (let i = 0; i < rankList.length; i += 2) {
        const [userId, username] = rankList[i].split(':');
        result.push({
          rank: offset + i / 2 + 1,
          userId,
          username,
          score: parseInt(rankList[i + 1])
        });
      }
      
      return { success: true, rankList: result };
    } catch (error) {
      console.error('获取周排行榜失败:', error);
      return { success: false, message: '获取周排行榜失败' };
    }
  }

  // 获取用户在全局排行榜中的排名
  static async getUserGlobalRank(userId, type = 'score', mode = 'ALL') {
    try {
      let rankKey;
      if (mode === 'ALL') {
        rankKey = type === 'score' ? 'global_rank:score' : 'global_rank:win';
      } else {
        rankKey = type === 'score' ? `global_rank:${mode}:score` : `global_rank:${mode}:win`;
      }
      
      // 获取所有成员，然后查找用户
      const allMembers = await RedisUtil.zrevrange(rankKey, 0, -1);
      let rank = -1;
      for (let i = 0; i < allMembers.length; i++) {
        if (allMembers[i].startsWith(`${userId}:`)) {
          rank = i + 1;
          break;
        }
      }
      
      return { success: true, rank };
    } catch (error) {
      console.error('获取用户全局排名失败:', error);
      return { success: false, message: '获取用户全局排名失败' };
    }
  }

  // 获取用户在周排行榜中的排名
  static async getUserWeeklyRank(userId, type = 'score', mode = 'ALL') {
    try {
      const weekKey = this.getWeekKey();
      let rankKey;
      if (mode === 'ALL') {
        rankKey = type === 'score' ? `weekly_rank:${weekKey}:score` : `weekly_rank:${weekKey}:win`;
      } else {
        rankKey = type === 'score' ? `weekly_rank:${weekKey}:${mode}:score` : `weekly_rank:${weekKey}:${mode}:win`;
      }
      
      // 获取所有成员，然后查找用户
      const allMembers = await RedisUtil.zrevrange(rankKey, 0, -1);
      let rank = -1;
      for (let i = 0; i < allMembers.length; i++) {
        if (allMembers[i].startsWith(`${userId}:`)) {
          rank = i + 1;
          break;
        }
      }
      
      return { success: true, rank };
    } catch (error) {
      console.error('获取用户周排名失败:', error);
      return { success: false, message: '获取用户周排名失败' };
    }
  }
}

module.exports = RankManager;