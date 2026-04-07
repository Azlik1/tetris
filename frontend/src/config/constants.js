export const SOCKET_EVENTS = {
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
  GAME_PAUSED_UPDATED: 'game_paused_updated',
  DISCONNECT: 'disconnect',
  CONNECT: 'connect',
  CONNECT_ERROR: 'connect_error'
};

export const ERROR_CODES = {
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
  NETWORK_DISCONNECTED: 4002
};

export const ERROR_MESSAGES = {
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
  [ERROR_CODES.NETWORK_DISCONNECTED]: '网络连接断开'
};

export const GAME_MODE = {
  MARATHON: 'MARATHON',
  BATTLE: 'BATTLE',
  SPRINT: 'SPRINT'
};

export const ROOM_STATUS = {
  WAITING: 0,
  PLAYING: 1,
  FINISHED: 2,
  DESTROYED: 3
};

export const PLAYER_STATUS = {
  NOT_READY: 0,
  READY: 1,
  PLAYING: 2,
  LEFT: 3
};

export function getErrorMessage(code) {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR];
}
