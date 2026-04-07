const ERROR_CODES = {
  SUCCESS: 0,
  UNKNOWN_ERROR: 1000,
  ROOM_NOT_EXIST: 1001,
  ROOM_FULL: 1002,
  ROOM_PASSWORD_ERROR: 1003,
  ROOM_ALREADY_JOINED: 1004,
  ROOM_NOT_JOINED: 1005,
  ROOM_PERMISSION_DENIED: 1006,
  ROOM_NAME_INVALID: 1007,
  ROOM_CAPACITY_INVALID: 1008,
  USER_NOT_LOGIN: 2001,
  USER_NOT_EXIST: 2002,
  USER_PASSWORD_ERROR: 2003,
  USER_USERNAME_EXIST: 2004,
  USER_PARAM_INVALID: 2005,
  USER_BANNED: 2006,
  GAME_NOT_RUNNING: 3001,
  GAME_OPERATION_INVALID: 3002,
  NETWORK_TIMEOUT: 4001,
  NETWORK_DISCONNECTED: 4002,
  DATABASE_ERROR: 5001,
  REDIS_ERROR: 5002
};

const ERROR_MESSAGES = {
  [ERROR_CODES.SUCCESS]: '操作成功',
  [ERROR_CODES.UNKNOWN_ERROR]: '未知错误',
  [ERROR_CODES.ROOM_NOT_EXIST]: '房间不存在',
  [ERROR_CODES.ROOM_FULL]: '房间人数已满',
  [ERROR_CODES.ROOM_PASSWORD_ERROR]: '房间密码错误',
  [ERROR_CODES.ROOM_ALREADY_JOINED]: '已加入该房间',
  [ERROR_CODES.ROOM_NOT_JOINED]: '未加入该房间',
  [ERROR_CODES.ROOM_PERMISSION_DENIED]: '无房间操作权限',
  [ERROR_CODES.ROOM_NAME_INVALID]: '房间名称不合法（1-20个字符）',
  [ERROR_CODES.ROOM_CAPACITY_INVALID]: '房间人数不合法（2-4人）',
  [ERROR_CODES.USER_NOT_LOGIN]: '请先登录',
  [ERROR_CODES.USER_NOT_EXIST]: '用户不存在',
  [ERROR_CODES.USER_PASSWORD_ERROR]: '密码错误',
  [ERROR_CODES.USER_USERNAME_EXIST]: '用户名已存在',
  [ERROR_CODES.USER_PARAM_INVALID]: '参数不合法',
  [ERROR_CODES.USER_BANNED]: '账号已被封禁',
  [ERROR_CODES.GAME_NOT_RUNNING]: '游戏未运行',
  [ERROR_CODES.GAME_OPERATION_INVALID]: '操作不合法',
  [ERROR_CODES.NETWORK_TIMEOUT]: '网络请求超时',
  [ERROR_CODES.NETWORK_DISCONNECTED]: '网络连接断开',
  [ERROR_CODES.DATABASE_ERROR]: '数据库错误',
  [ERROR_CODES.REDIS_ERROR]: '缓存错误'
};

const SOCKET_EVENTS = {
  ROOM_CREATE: 'room_create',
  ROOM_CREATE_RESPONSE: 'room_create_response',
  ROOM_JOIN: 'room_join',
  ROOM_JOIN_RESPONSE: 'room_join_response',
  ROOM_LEAVE: 'room_leave',
  ROOM_LEAVE_RESPONSE: 'room_leave_response',
  ROOM_LIST: 'room_list',
  ROOM_LIST_RESPONSE: 'room_list_response',
  ROOM_READY_TOGGLE: 'room_ready_toggle',
  ROOM_READY_UPDATED: 'room_ready_updated',
  ROOM_MESSAGE: 'room_message',
  ROOM_MESSAGE_BROADCAST: 'room_message_broadcast',
  ROOM_PLAYER_JOINED: 'room_player_joined',
  ROOM_PLAYER_LEFT: 'room_player_left',
  GAME_START: 'game_start',
  GAME_STARTED: 'game_started',
  GAME_OPERATE: 'game_operate',
  GAME_STATE_UPDATE: 'game_state_update',
  GAME_OVER: 'game_over',
  GAME_PAUSE: 'game_toggle_pause',
  GAME_PAUSED_UPDATED: 'game_paused_updated'
};

function createSuccess(data = null) {
  return {
    success: true,
    code: ERROR_CODES.SUCCESS,
    message: ERROR_MESSAGES[ERROR_CODES.SUCCESS],
    data
  };
}

function createError(code, message = null) {
  return {
    success: false,
    code,
    message: message || ERROR_MESSAGES[code] || ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR]
  };
}

function validateRoomParams(params) {
  const errors = [];
  
  if (params.roomName !== undefined) {
    if (!params.roomName || params.roomName.length < 1 || params.roomName.length > 20) {
      errors.push(ERROR_CODES.ROOM_NAME_INVALID);
    }
  }
  
  if (params.capacity !== undefined) {
    const cap = parseInt(params.capacity);
    if (isNaN(cap) || cap < 2 || cap > 4) {
      errors.push(ERROR_CODES.ROOM_CAPACITY_INVALID);
    }
  }
  
  return errors.length === 0 ? null : errors[0];
}

function validateUserParams(params) {
  const errors = [];
  
  if (params.username !== undefined) {
    if (!params.username || params.username.length < 3 || params.username.length > 20) {
      errors.push(ERROR_CODES.USER_PARAM_INVALID);
    }
  }
  
  if (params.password !== undefined) {
    if (!params.password || params.password.length < 6) {
      errors.push(ERROR_CODES.USER_PARAM_INVALID);
    }
  }
  
  return errors.length === 0 ? null : errors[0];
}

module.exports = {
  ERROR_CODES,
  ERROR_MESSAGES,
  SOCKET_EVENTS,
  createSuccess,
  createError,
  validateRoomParams,
  validateUserParams
};
