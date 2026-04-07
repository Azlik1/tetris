// 游戏基础逻辑模块

// 游戏配置常量
const GAME_CONFIG = {
  ROWS: 20,
  COLS: 10,
  SCORE_RULES: {
    1: 100,
    2: 300,
    3: 500,
    4: 800
  },
  // 游戏模式配置
  MODES: {
    MARATHON: {
      name: '标准马拉松',
      description: '现代机制 + 分级加速，目标冲分 / 冲级',
      timeLimit: null,
      lineTarget: null,
      garbageEnabled: false
    },
    FORTY_LINES: {
      name: '40行挑战赛',
      description: '以最快速度消除40行，是竞速与技巧的核心模式',
      timeLimit: null,
      lineTarget: 40,
      garbageEnabled: false
    },
    TIME_ATTACK: {
      name: '限时积分赛',
      description: '固定时长（如2分钟），比拼单位时间内得分 / 消行数',
      timeLimit: 120000, // 2分钟
      lineTarget: null,
      garbageEnabled: false
    },
    PVP: {
      name: '多人对战模式',
      description: '通过消行给对手发送垃圾行，互相施压，胜负分明',
      timeLimit: null,
      lineTarget: null,
      garbageEnabled: true
    },
    BATTLE_ROYALE: {
      name: '大逃杀',
      description: '99人同场，消行攻击他人，活到最后获胜',
      timeLimit: null,
      lineTarget: null,
      garbageEnabled: true
    },
    TEAM_BATTLE: {
      name: '团队对战',
      description: '2v2/4v4，队友共享垃圾行或互相支援',
      timeLimit: null,
      lineTarget: null,
      garbageEnabled: true
    }
  }
};

// 方块定义
const TETROMINOS = [
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ],
  [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0]
  ],
  [
    [1, 1],
    [1, 1]
  ],
  [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0]
  ],
  [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0]
  ]
];

function checkCollision(piece, offsetX, offsetY, board) {
  for (let y = 0; y < piece.length; y++) {
    for (let x = 0; x < piece[y].length; x++) {
      if (piece[y][x]) {
        const newX = offsetX + x;
        const newY = offsetY + y;
        if (newX < 0 || newX >= GAME_CONFIG.COLS || newY >= GAME_CONFIG.ROWS) {
          return true;
        }
        if (newY >= 0 && board[newY][newX]) {
          return true;
        }
      }
    }
  }
  return false;
}

function rotateMatrix(matrix) {
  const N = matrix.length;
  const rotated = Array(N).fill().map(() => Array(N).fill(0));
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      rotated[x][N - 1 - y] = matrix[y][x];
    }
  }
  return rotated;
}

function verifyOperation(operation) {
  const { type, piece, position, board } = operation;
  
  switch (type) {
    case 'moveLeft':
      return {
        valid: !checkCollision(piece, position.x - 1, position.y, board),
        message: checkCollision(piece, position.x - 1, position.y, board) ? '无法向左移动' : '操作合法'
      };
    case 'moveRight':
      return {
        valid: !checkCollision(piece, position.x + 1, position.y, board),
        message: checkCollision(piece, position.x + 1, position.y, board) ? '无法向右移动' : '操作合法'
      };
    case 'moveDown':
      return {
        valid: !checkCollision(piece, position.x, position.y + 1, board),
        message: checkCollision(piece, position.x, position.y + 1, board) ? '无法向下移动' : '操作合法'
      };
    case 'rotate':
      const rotated = rotateMatrix(piece);
      return {
        valid: !checkCollision(rotated, position.x, position.y, board),
        message: checkCollision(rotated, position.x, position.y, board) ? '无法旋转' : '操作合法'
      };
    default:
      return {
        valid: false,
        message: '未知操作类型'
      };
  }
}

function calculateScore(linesCleared) {
  return GAME_CONFIG.SCORE_RULES[linesCleared] || 0;
}

module.exports = {
  GAME_CONFIG,
  TETROMINOS,
  checkCollision,
  rotateMatrix,
  verifyOperation,
  calculateScore
};