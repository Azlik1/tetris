const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '123456',
  database: process.env.MYSQL_DATABASE || 'tetris_game',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

async function initDatabase() {
  try {
    const tempConfig = {
      host: 'localhost',
      user: 'root',
      password: '123456'
    };
    const tempPool = mysql.createPool(tempConfig);
    const tempConnection = await tempPool.getConnection();
    
    await tempConnection.execute('CREATE DATABASE IF NOT EXISTS tetris_game DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    tempConnection.release();
    tempPool.end();
    
    const connection = await pool.getConnection();
    
    await connection.execute('SET NAMES utf8mb4');
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS t_user (
        id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键，自增，用户唯一标识',
        username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名（登录/展示用）',
        password VARCHAR(100) NOT NULL COMMENT 'bcrypt哈希加密后的密码',
        nickname VARCHAR(50) NOT NULL COMMENT '用户昵称（可修改）',
        role TINYINT NOT NULL DEFAULT 0 COMMENT '角色：0-普通玩家，1-管理员',
        avatar VARCHAR(255) NULL COMMENT '用户头像URL',
        phone VARCHAR(20) NULL UNIQUE COMMENT '手机号（用于注册/找回密码）',
        email VARCHAR(100) NULL UNIQUE COMMENT '邮箱',
        status TINYINT NOT NULL DEFAULT 0 COMMENT '状态：0-正常，1-封禁（管理员操作）',
        total_games INT NOT NULL DEFAULT 0 COMMENT '总对战局数',
        win_games INT NOT NULL DEFAULT 0 COMMENT '胜利局数',
        total_score BIGINT NOT NULL DEFAULT 0 COMMENT '历史总得分',
        highest_score BIGINT NOT NULL DEFAULT 0 COMMENT '历史最高单局得分',
        create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_username (username),
        INDEX idx_status (status),
        INDEX idx_highest_score (highest_score DESC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表'
    `);
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS t_room (
        id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键，自增，房间唯一标识',
        room_name VARCHAR(100) NOT NULL COMMENT '房间名称（用户自定义）',
        room_code VARCHAR(20) NOT NULL UNIQUE COMMENT '房间编码（6位随机字符，用于加入房间）',
        max_players TINYINT NOT NULL DEFAULT 2 COMMENT '最大对战人数（2-4）',
        current_players TINYINT NOT NULL DEFAULT 0 COMMENT '当前已加入玩家数',
        difficulty TINYINT NOT NULL DEFAULT 1 COMMENT '难度：1-简单，2-中等，3-困难',
        status TINYINT NOT NULL DEFAULT 0 COMMENT '状态：0-准备中，1-对战中，2-已结束，3-已销毁',
        creator_id BIGINT NOT NULL COMMENT '房间创建者ID',
        start_time DATETIME NULL COMMENT '游戏开始时间',
        end_time DATETIME NULL COMMENT '游戏结束时间',
        create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        FOREIGN KEY (creator_id) REFERENCES t_user(id),
        INDEX idx_room_code (room_code),
        INDEX idx_status (status),
        INDEX idx_creator_id (creator_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='房间表'
    `);
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS t_room_player (
        id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键，自增',
        room_id BIGINT NOT NULL COMMENT '外键关联t_room.id',
        user_id BIGINT NOT NULL COMMENT '外键关联t_user.id',
        role TINYINT NOT NULL DEFAULT 0 COMMENT '角色：0-对战玩家，1-观战者',
        status TINYINT NOT NULL DEFAULT 0 COMMENT '状态：0-未准备，1-已准备，2-对战中，3-已退出',
        score BIGINT NOT NULL DEFAULT 0 COMMENT '当前房间内的得分',
        join_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',
        leave_time DATETIME NULL COMMENT '退出时间',
        UNIQUE KEY uk_room_user (room_id, user_id),
        FOREIGN KEY (room_id) REFERENCES t_room(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES t_user(id),
        INDEX idx_room_id (room_id),
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='房间玩家关联表'
    `);
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS t_game_record (
        id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键，自增，对局唯一标识',
        room_id BIGINT NOT NULL COMMENT '外键关联t_room.id',
        winner_id BIGINT NULL COMMENT '获胜者ID（多人对战可留空）',
        start_time DATETIME NOT NULL COMMENT '对局开始时间',
        end_time DATETIME NOT NULL COMMENT '对局结束时间',
        duration INT NOT NULL COMMENT '对局时长（秒）',
        create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        FOREIGN KEY (room_id) REFERENCES t_room(id),
        FOREIGN KEY (winner_id) REFERENCES t_user(id),
        INDEX idx_room_id (room_id),
        INDEX idx_start_time (start_time)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='游戏对局记录表'
    `);
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS t_game_detail (
        id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键，自增',
        record_id BIGINT NOT NULL COMMENT '外键关联t_game_record.id',
        user_id BIGINT NOT NULL COMMENT '外键关联t_user.id',
        final_score BIGINT NOT NULL COMMENT '最终得分',
        eliminate_lines INT NOT NULL DEFAULT 0 COMMENT '消除总行数',
        max_combo INT NOT NULL DEFAULT 0 COMMENT '最大连续消除数',
        rank TINYINT NOT NULL COMMENT '本局排名（1-n）',
        FOREIGN KEY (record_id) REFERENCES t_game_record(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES t_user(id),
        INDEX idx_record_id (record_id),
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='玩家对局详情表'
    `);
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS t_room_message (
        id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键，自增',
        room_id BIGINT NOT NULL COMMENT '外键关联t_room.id',
        sender_id BIGINT NOT NULL COMMENT '外键关联t_user.id',
        content VARCHAR(500) NOT NULL COMMENT '消息内容',
        msg_type TINYINT NOT NULL DEFAULT 0 COMMENT '类型：0-文字消息，1-系统消息',
        send_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发送时间',
        is_read TINYINT NOT NULL DEFAULT 0 COMMENT '是否已读（0-未读，1-已读）',
        FOREIGN KEY (room_id) REFERENCES t_room(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES t_user(id),
        INDEX idx_room_id (room_id),
        INDEX idx_send_time (send_time)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='房间聊天消息表'
    `);
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS t_ranking_global (
        id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键，自增',
        user_id BIGINT NOT NULL UNIQUE COMMENT '外键关联t_user.id',
        highest_score BIGINT NOT NULL COMMENT '历史最高得分',
        rank INT NOT NULL COMMENT '实时排名',
        update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        FOREIGN KEY (user_id) REFERENCES t_user(id) ON DELETE CASCADE,
        INDEX idx_highest_score (highest_score DESC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='全局排行榜表'
    `);
    
    console.log('数据库表初始化成功，共7张表');
    connection.release();
  } catch (error) {
    console.error('数据库初始化失败:', error.message);
  }
}

module.exports = {
  pool,
  initDatabase
};
