import UserManager from './services/UserManager.js';
import FormValidator from './utils/FormValidator.js';
import LoadingManager from './utils/LoadingManager.js';
import ConfirmDialog from './utils/ConfirmDialog.js';
import DOMHelper from './utils/DOMHelper.js';
import KeyBindingManager from './utils/KeyBindingManager.js';
import HttpClient from './utils/HttpClient.js';
import Toast from './utils/Toast.js';

class GameApp {
  constructor() {
    this.userManager = UserManager;
    this.loading = LoadingManager;
    this.confirm = ConfirmDialog;
    this.dom = DOMHelper;
    this.keyBindings = KeyBindingManager;
    this.http = HttpClient;
    this.validators = {};
    
    this._init();
  }

  _init() {
    this._initValidators();
    this._initEventListeners();
    this._checkAuthState();
    this._updateKeyBindingDisplay();
    
    console.log('🎮 Tetris Game App initialized');
  }

  _initValidators() {
    const loginForm = document.getElementById('loginContainer');
    this.validators.login = new FormValidator(loginForm, {
      showInlineErrors: true,
      showToastErrors: true
    });

    const createRoomForm = document.getElementById('createRoomForm');
    if (createRoomForm) {
      this.validators.createRoom = new FormValidator(createRoomForm, {
        showInlineErrors: true,
        showToastErrors: true
      });
    }
  }

  _initEventListeners() {
    this.dom.on('showRegister', 'click', (e) => {
      e.preventDefault();
      this.dom.hideElement('loginForm');
      this.dom.showElement('registerForm');
    });

    this.dom.on('showLogin', 'click', (e) => {
      e.preventDefault();
      this.dom.hideElement('registerForm');
      this.dom.showElement('loginForm');
    });

    this.dom.on('loginButton', 'click', () => this._handleLogin());
    this.dom.on('registerButton', 'click', () => this._handleRegister());
    this.dom.on('logoutButton', 'click', () => this._handleLogout());

    this.dom.on('loginPassword', 'keypress', (e) => {
      if (e.key === 'Enter') this._handleLogin();
    });
    this.dom.on('registerPassword', 'keypress', (e) => {
      if (e.key === 'Enter') this._handleRegister();
    });

    this.dom.on('singlePlayerButton', 'click', () => {
      this.dom.showMenu('singlePlayerMenu');
    });
    this.dom.on('multiPlayerButton', 'click', () => {
      this.dom.showMenu('multiPlayerMenu');
      this._loadRoomList();
    });
    this.dom.on('rankButton', 'click', () => {
      this.dom.showMenu('rankMenu');
      this._loadRankings();
    });
    this.dom.on('settingsButton', 'click', () => {
      this.dom.showMenu('settingsMenu');
    });

    ['backToMainButton', 'backToMainFromMulti', 'backToMainFromSettings', 'backToMainFromRank'].forEach(id => {
      this.dom.on(id, 'click', () => this.dom.showMenu('mainMenu'));
    });

    this.dom.on('marathonButton', 'click', () => this._startSinglePlayer('MARATHON'));
    this.dom.on('timeAttackButton', 'click', () => this._startSinglePlayer('TIME_ATTACK'));
    this.dom.on('fortyLinesButton', 'click', () => this._startSinglePlayer('FORTY_LINES'));

    this.dom.on('createRoomButton', 'click', () => {
      this.dom.toggleElement('createRoomForm');
    });
    this.dom.on('cancelCreateRoom', 'click', () => {
      this.dom.hideElement('createRoomForm');
    });
    this.dom.on('confirmCreateRoom', 'click', () => this._handleCreateRoom());

    this.dom.on('joinRoomButton', 'click', () => this._handleJoinRoom());
    this.dom.on('watchRoomButton', 'click', () => this._handleWatchRoom());
    this.dom.on('startGameButton', 'click', () => this._handleStartGame());
    this.dom.on('addAIButton', 'click', () => this._handleAddAI());
    this.dom.on('quitRoomButton', 'click', () => this._handleQuitRoom());

    this.dom.on('sendChatButton', 'click', () => this._handleSendChat());
    this.dom.on('chatInput', 'keypress', (e) => {
      if (e.key === 'Enter') this._handleSendChat();
    });

    this.dom.on('refreshRankButton', 'click', () => this._loadRankings());
    this.dom.on('rankModeSelect', 'change', () => this._loadRankings());
    this.dom.on('rankTypeSelect', 'change', () => this._loadRankings());
    this.dom.on('rankLimitSelect', 'change', () => this._loadRankings());

    this.dom.on('resetKeyBindings', 'click', () => this._resetKeyBindings());

    ['keyLeft', 'keyRight', 'keyDown', 'keyRotateRight', 'keyRotateLeft', 
     'keyHardDrop', 'keyHold', 'keyPause'].forEach((id, index) => {
      const actions = ['moveLeft', 'moveRight', 'moveDown', 'rotateRight', 
                       'rotateLeft', 'hardDrop', 'hold', 'pause'];
      this.dom.on(id, 'click', () => {
        const input = document.getElementById(id);
        this.keyBindings.startEditing(actions[index], input);
      });
    });

    this.dom.on('chatInput', 'focus', () => {
      this.keyBindings.disableGameInput();
    });
    this.dom.on('chatInput', 'blur', () => {
      this.keyBindings.enableGameInput();
    });

    this.dom.on('exitGameButton', 'click', () => this._handleExitGame());
    this.dom.on('startGameInSceneButton', 'click', () => this._handleStartGameInScene());
    this.dom.on('pauseButton', 'click', () => this._handlePauseGame());

    ['btnLeft', 'btnRight', 'btnDown', 'btnRotate', 'btnDrop', 'btnHold'].forEach(btnId => {
      this.dom.on(btnId, 'click', () => {
        const action = btnId.replace('btn', '').toLowerCase();
        this._handleControlButton(action);
      });
      this.dom.on(btnId, 'touchstart', (e) => {
        e.preventDefault();
        const action = btnId.replace('btn', '').toLowerCase();
        this._handleControlButton(action);
      });
    });
  }

  async _handleLogin() {
    if (!this.validators.login.validate()) {
      return;
    }

    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    this.loading.show('登录中...');
    const result = await this.userManager.login(username, password);
    this.loading.hide();

    if (result.success) {
      this._showGameContainer();
    } else {
      this.dom.showMessage('loginMessage', result.message, 'error');
    }
  }

  async _handleRegister() {
    if (!this.validators.login.validate()) {
      return;
    }

    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;

    this.loading.show('注册中...');
    const result = await this.userManager.register(username, password);
    this.loading.hide();

    if (result.success) {
      this.dom.showMessage('registerMessage', '注册成功，请登录', 'success');
      setTimeout(() => {
        this.dom.hideElement('registerForm');
        this.dom.showElement('loginForm');
        document.getElementById('loginUsername').value = username;
      }, 1500);
    } else {
      this.dom.showMessage('registerMessage', result.message, 'error');
    }
  }

  async _handleLogout() {
    const confirmed = await this.confirm.confirmLogout();
    if (confirmed) {
      await this.userManager.logout();
      this._showLoginContainer();
    }
  }

  _showGameContainer() {
    this.dom.hideElement('loginContainer');
    this.dom.showElement('gameContainer');
    this.dom.showMenu('mainMenu');
    
    const user = this.userManager.getCurrentUser();
    if (user) {
      this.dom.setText('username', user.username || user.nickname || '玩家');
      this.dom.setText('totalScore', user.totalGames || 0);
      this.dom.setText('winCount', user.winGames || 0);
      this.dom.setText('loseCount', user.totalGames - (user.winGames || 0) || 0);
    }
  }

  _showLoginContainer() {
    this.dom.hideElement('gameContainer');
    this.dom.showElement('loginContainer');
  }

  _checkAuthState() {
    if (this.userManager.isLoggedIn()) {
      this._showGameContainer();
    } else {
      this._showLoginContainer();
    }
  }

  _startSinglePlayer(mode) {
    this.dom.showElement('gameArea');
    this.dom.setText('gameMode', mode === 'MARATHON' ? '马拉松' : 
                           mode === 'TIME_ATTACK' ? '限时挑战' : '40行挑战');
    Toast.success(`开始 ${mode} 模式`);
  }

  async _loadRoomList() {
    this.loading.show('加载房间列表...');
    try {
      const result = await this.http.get('/api/rooms');
      this.loading.hide();
      
      const roomList = document.getElementById('roomList');
      if (result.success && result.data && result.data.length > 0) {
        roomList.innerHTML = result.data.map(room => `
          <div class="room-item ${room.status === 'playing' ? 'playing' : ''}" 
               data-room-id="${room.id}">
            <strong>${room.name}</strong>
            <span style="float: right; color: #666;">
              ${room.playerCount}/${room.capacity} 人
              ${room.status === 'playing' ? ' 游戏中' : ' 等待中'}
            </span>
          </div>
        `).join('');
        
        roomList.querySelectorAll('.room-item[data-room-id]').forEach(item => {
          item.addEventListener('click', () => {
            document.getElementById('roomIdInput').value = item.dataset.roomId;
          });
        });
      } else {
        roomList.innerHTML = '<div class="room-item" style="text-align: center; color: #999;">暂无房间</div>';
      }
    } catch (e) {
      this.loading.hide();
      console.debug('Load room list failed:', e);
    }
  }

  async _handleCreateRoom() {
    if (!this.validators.createRoom.validate()) {
      return;
    }

    const name = document.getElementById('roomName').value;
    const capacity = document.getElementById('roomCapacity').value;
    const password = document.getElementById('roomPassword').value;
    const mode = document.getElementById('roomMode').value;

    this.loading.show('创建房间中...');
    try {
      const result = await this.http.post('/api/rooms', {
        name, capacity, password, mode
      }, { showLoading: false });
      this.loading.hide();

      if (result.success) {
        Toast.success('房间创建成功');
        this.dom.hideElement('createRoomForm');
        this.dom.showElement('currentRoomInfo');
        this.dom.showElement('chatArea');
        
        this.dom.setText('currentRoomId', result.data.id);
        this.dom.setText('currentRoomName', result.data.name);
        this.dom.setText('currentRoomStatus', '等待中');
        this.dom.setText('currentRoomPlayers', `1/${capacity}`);
        this.dom.setText('currentRoomWatchers', 0);
        
        this.dom.hideElement('createRoomButton');
      } else {
        this.dom.showMessage('roomMessage', result.message || '创建失败', 'error');
      }
    } catch (e) {
      this.loading.hide();
      this.dom.showMessage('roomMessage', '创建房间失败，请重试', 'error');
    }
  }

  async _handleJoinRoom() {
    const roomId = document.getElementById('roomIdInput').value;
    const password = document.getElementById('joinRoomPassword').value;

    if (!roomId) {
      Toast.error('请输入房间ID');
      return;
    }

    this.loading.show('加入房间中...');
    Toast.info(`正在加入房间 ${roomId}...`);
    this.loading.hide();
  }

  async _handleWatchRoom() {
    Toast.info('观战功能开发中...');
  }

  async _handleStartGame() {
    this.loading.show('游戏即将开始...');
    setTimeout(() => {
      this.loading.hide();
      this.dom.showElement('gameArea');
      Toast.success('游戏开始！');
    }, 1000);
  }

  async _handleAddAI() {
    Toast.success('AI玩家已添加');
  }

  async _handleQuitRoom() {
    const confirmed = await this.confirm.confirmQuitRoom();
    if (confirmed) {
      this.dom.hideElement('currentRoomInfo');
      this.dom.hideElement('chatArea');
      this.dom.showElement('createRoomButton');
      Toast.info('已退出房间');
      this._loadRoomList();
    }
  }

  async _handleSendChat() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();

    if (!message) {
      Toast.error('请输入消息内容');
      return;
    }

    if (message.length > 500) {
      Toast.error('消息不能超过500个字符');
      return;
    }

    const user = this.userManager.getCurrentUser();
    const messagesContainer = document.getElementById('chatMessages');
    const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    
    messagesContainer.innerHTML += `
      <div class="chat-message">
        <span class="username">${user?.username || '我'}</span>
        <span class="time">${time}</span>
        <span class="content">${message}</span>
      </div>
    `;
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    input.value = '';
  }

  async _loadRankings() {
    this.loading.show('加载排行榜...');
    setTimeout(() => {
      this.loading.hide();
      
      const rankList = document.getElementById('globalRankList');
      const mockData = Array.from({ length: 10 }, (_, i) => ({
        rank: i + 1,
        username: `玩家${i + 1}`,
        score: 100000 - i * 5000,
        wins: 50 - i * 3
      }));

      rankList.innerHTML = mockData.map(item => `
        <div class="room-item">
          <span style="font-weight: bold; ${item.rank <= 3 ? 'color: #f59e0b;' : ''}">#${item.rank}</span>
          <span style="margin-left: 10px;">${item.username}</span>
          <span style="float: right; color: #4CAF50; font-weight: bold;">
            ${item.score.toLocaleString()} 分
          </span>
        </div>
      `).join('');

      document.getElementById('userRankInfo').innerHTML = `
        <p><strong>我的排名:</strong> #23</p>
        <p><strong>总得分:</strong> 45,200 分</p>
        <p><strong>胜场:</strong> 12 场</p>
      `;
    }, 500);
  }

  _updateKeyBindingDisplay() {
    const bindings = this.keyBindings.getAllBindings();
    Object.entries(bindings).forEach(([action, code]) => {
      const idMap = {
        moveLeft: 'keyLeft',
        moveRight: 'keyRight',
        moveDown: 'keyDown',
        rotateRight: 'keyRotateRight',
        rotateLeft: 'keyRotateLeft',
        hardDrop: 'keyHardDrop',
        hold: 'keyHold',
        pause: 'keyPause'
      };
      const inputId = idMap[action];
      if (inputId) {
        const input = document.getElementById(inputId);
        if (input) {
          input.value = this.keyBindings.getKeyDisplayName(code);
        }
      }
    });
  }

  _resetKeyBindings() {
    this.keyBindings.resetToDefaults();
    this._updateKeyBindingDisplay();
    Toast.success('已恢复默认按键设置');
  }

  _handleExitGame() {
    this.confirm.show({
      title: '退出游戏',
      message: '确定要退出当前游戏吗？',
      type: 'warning'
    }).then(confirmed => {
      if (confirmed) {
        this.dom.hideElement('gameArea');
        Toast.info('已退出游戏');
      }
    });
  }

  _handleStartGameInScene() {
    Toast.success('游戏开始！');
  }

  _handlePauseGame() {
    const btn = document.getElementById('pauseButton');
    if (btn.textContent === '⏸️ 暂停') {
      btn.textContent = '▶️ 继续';
      Toast.info('游戏已暂停');
    } else {
      btn.textContent = '⏸️ 暂停';
      Toast.success('游戏继续');
    }
  }

  _handleControlButton(action) {
    const actionMap = {
      left: 'moveLeft',
      right: 'moveRight',
      down: 'moveDown',
      rotate: 'rotateRight',
      drop: 'hardDrop',
      hold: 'hold'
    };
    console.debug('Control button pressed:', actionMap[action] || action);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.gameApp = new GameApp();
});

export default GameApp;
