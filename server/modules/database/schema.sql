-- =====================================================
-- 俄罗斯方块多人对战系统数据库设计
-- 设计规范：三线表格式
-- 字符集：utf8mb4 支持emoji
-- 引擎：InnoDB 支持事务和外键
-- =====================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 创建数据库
CREATE DATABASE IF NOT EXISTS tetris_game DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE tetris_game;

-- =====================================================
-- 1. 用户表 t_user
-- =====================================================
DROP TABLE IF EXISTS t_user;
CREATE TABLE t_user (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- =====================================================
-- 2. 房间表 t_room
-- =====================================================
DROP TABLE IF EXISTS t_room;
CREATE TABLE t_room (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='房间表';

-- =====================================================
-- 3. 房间玩家关联表 t_room_player
-- =====================================================
DROP TABLE IF EXISTS t_room_player;
CREATE TABLE t_room_player (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='房间玩家关联表';

-- =====================================================
-- 4. 游戏对局记录表 t_game_record
-- =====================================================
DROP TABLE IF EXISTS t_game_record;
CREATE TABLE t_game_record (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='游戏对局记录表';

-- =====================================================
-- 5. 玩家对局详情表 t_game_detail
-- =====================================================
DROP TABLE IF EXISTS t_game_detail;
CREATE TABLE t_game_detail (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='玩家对局详情表';

-- =====================================================
-- 6. 房间聊天消息表 t_room_message
-- =====================================================
DROP TABLE IF EXISTS t_room_message;
CREATE TABLE t_room_message (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='房间聊天消息表';

-- =====================================================
-- 7. 全局排行榜表 t_ranking_global
-- =====================================================
DROP TABLE IF EXISTS t_ranking_global;
CREATE TABLE t_ranking_global (
  id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键，自增',
  user_id BIGINT NOT NULL UNIQUE COMMENT '外键关联t_user.id',
  highest_score BIGINT NOT NULL COMMENT '历史最高得分',
  rank INT NOT NULL COMMENT '实时排名',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (user_id) REFERENCES t_user(id) ON DELETE CASCADE,
  INDEX idx_highest_score (highest_score DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='全局排行榜表';

-- =====================================================
-- 初始化管理员账号
-- 密码：admin123 (bcrypt加密)
-- =====================================================
INSERT INTO t_user (username, password, nickname, role, status) 
VALUES ('admin', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '系统管理员', 1, 0);

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- 数据库设计完成，共7张核心表
-- =====================================================
