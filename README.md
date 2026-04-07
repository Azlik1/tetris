# 🎮 俄罗斯方块多人对战系统

> 基于 Node.js + Socket.IO 的实时多人在线俄罗斯方块游戏

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue.svg)](https://www.docker.com/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Ready-blue.svg)](https://kubernetes.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📋 目录

- [系统架构](#系统架构)
- [快速启动](#快速启动)
- [开发指南](#开发指南)
- [部署方式](#部署方式)
- [接口文档](#接口文档)
- [Socket事件列表](#socket事件列表)
- [错误码说明](#错误码说明)
- [目录结构](#目录结构)

---

## 🏗️ 系统架构

### 技术栈

| 层级 | 技术选型 |
|------|----------|
| **前端** | HTML5 Canvas + Vanilla JS + ES Modules |
| **后端** | Node.js + Express + Socket.IO |
| **数据库** | MySQL 8.0 + Redis 7.x |
| **部署** | Docker Compose + Kubernetes |
| **工程化** | ESLint + Prettier + Monorepo |

### 架构图

```
┌─────────────────────────────────────────────────────────┐
│                     客户端层                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Game渲染  │  │ Socket通  │  │ UI交互    │              │
│  │ 组件     │  │ 信服务    │  │ 组件     │              │
│  └──────────┘  └──────────┘  └──────────┘              │
└─────────────────────────────────────────────────────────┘
                              ↓ HTTP/WebSocket
┌─────────────────────────────────────────────────────────┐
│                     服务层                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ 房间管   │  │ 游戏逻   │  │ 用户     │              │
│  │ 理模块   │  │ 辑模块   │  │ 模块     │              │
│  └──────────┘  └──────────┘  └──────────┘              │
└─────────────────────────────────────────────────────────┘
               ↙                    ↘
┌──────────────────┐        ┌──────────────────┐         │
│   MySQL 8.0      │        │     Redis 7.x    │         │
│  持久化存储      │        │   实时数据缓存   │         │
└──────────────────┘        └──────────────────┘         │
```

---

## 🚀 快速启动

### 方式一：Docker Compose 一键启动（推荐）

```bash
# 一键启动 MySQL + Redis + 后端
npm run docker:up

# 查看日志
npm run docker:logs

# 停止服务
npm run docker:down
```

访问：http://localhost:3000

### 方式二：本地开发启动

```bash
# 1. 安装依赖（自动安装前后端）
npm install

# 2. 确保本地 MySQL 和 Redis 已启动
# MySQL: localhost:3306
# Redis: localhost:6379

# 3. 复制配置文件
cp .env.example .env
# 编辑 .env，修改数据库密码

# 4. 初始化数据库
mysql -u root -p < backend/modules/database/schema.sql

# 5. 启动后端服务
npm start
# 或开发模式（热重载）
npm run dev
```

---

## 💻 开发指南

### 命令列表

| 命令 | 说明 |
|------|------|
| `npm start` | 启动后端服务 |
| `npm run dev` | 启动后端（热重载） |
| `npm run lint` | ESLint 代码检查 |
| `npm run lint:fix` | 自动修复代码风格 |
| `npm run test` | 执行测试 |
| `npm run docker:up` | Docker Compose 启动 |
| `npm run docker:logs` | 查看容器日志 |
| `npm run docker:down` | 停止容器 |
| `npm run k8s:deploy` | K8s 集群部署 |
| `npm run k8s:undeploy` | K8s 卸载清理 |

### 代码规范

项目已集成 ESLint + Prettier，提交前请执行检查：

```bash
npm run lint

# 自动修复
npm run lint:fix
```

---

## 📦 部署方式

### Docker Compose 部署

详见 [docker-compose.yml](docker-compose.yml)

包含：
- ✅ MySQL 8.0（带自动建表）
- ✅ Redis 7.x（AOF 持久化）
- ✅ Node.js 后端服务
- ✅ 健康检查 + 启动顺序依赖
- ✅ 数据卷持久化

### Kubernetes 部署

详见 [k8s/](k8s/) 目录

包含：
- ✅ ConfigMap + Secret 配置管理
- ✅ MySQL + Redis 单实例部署
- ✅ PVC 数据持久化
- ✅ 后端 Deployment（3副本）
- ✅ Service + HPA 自动扩缩容
- ✅ Readiness/Liveness 健康探针
- ✅ InitContainer 依赖等待
- ✅ CPU/Memory 资源限制

部署命令：
```bash
npm run k8s:deploy
```

---

## 🔌 接口文档

### HTTP 接口

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| `GET` | `/health` | 健康检查 | 公开 |
| `POST` | `/api/register` | 用户注册 | 公开 |
| `POST` | `/api/login` | 用户登录 | 公开 |
| `GET` | `/api/user/:id` | 获取用户信息 | 需要认证 |
| `GET` | `/api/rooms` | 获取房间列表 | 需要认证 |

### Socket 事件列表

#### 房间相关

| 事件名 | 方向 | 参数 | 说明 |
|--------|------|------|------|
| `room_create` | C→S | {roomName, capacity, password} | 创建房间 |
| `room_create_response` | S→C | {success, code, room} | 创建响应 |
| `room_join` | C→S | {roomCode, password} | 加入房间 |
| `room_join_response` | S→C | {success, code, room} | 加入响应 |
| `room_leave` | C→S | - | 离开房间 |
| `room_list` | C→S | - | 获取房间列表 |
| `room_ready_toggle` | C→S | - | 切换准备状态 |
| `room_message` | C→S | {content} | 发送聊天消息 |

#### 游戏相关

| 事件名 | 方向 | 参数 | 说明 |
|--------|------|------|------|
| `game_start` | C→S | - | 开始游戏（房主） |
| `game_operate` | C→S | {operation} | 游戏操作 |
| `game_state_update` | S→C | gameState | 游戏状态广播 |
| `game_over` | S→C | result | 游戏结束 |
| `game_toggle_pause` | C→S | - | 暂停/继续 |

---

## ❌ 错误码说明

| 错误码 | 说明 |
|--------|------|
| 1001 | 房间不存在 |
| 1002 | 房间人数已满 |
| 1003 | 房间密码错误 |
| 1006 | 无房间操作权限 |
| 1007 | 房间名称不合法 |
| 1008 | 房间人数不合法 |
| 2001 | 请先登录 |
| 2002 | 用户不存在 |
| 2003 | 密码错误 |
| 2004 | 用户名已存在 |
| 2006 | 账号已被封禁 |
| 4001 | 网络请求超时 |
| 5001 | 数据库错误 |

---

## 📁 目录结构

```
tetris-game/
├── backend/                    # 后端服务
│   ├── modules/               # 业务模块
│   │   ├── database/          # 数据库层
│   │   ├── game/              # 游戏逻辑
│   │   ├── room/              # 房间管理
│   │   └── user/              # 用户模块
│   ├── utils/                 # 工具类
│   ├── app.js                 # 服务入口
│   ├── Dockerfile             # 多阶段构建
│   └── package.json           # 后端依赖
│
├── frontend/                   # 前端应用
│   ├── src/
│   │   ├── components/        # UI 组件
│   │   ├── services/          # 通信服务
│   │   ├── utils/             # 工具函数
│   │   └── config/            # 常量配置
│   ├── index.html             # 入口页面
│   └── package.json           # 前端依赖
│
├── k8s/                       # Kubernetes 配置
├── scripts/                   # 部署脚本
├── test/                      # 测试目录
├── docs/                      # 文档目录
├── docker-compose.yml         # 容器编排
├── package.json               # Monorepo 入口
├── .eslintrc.js               # 代码规范
├── .gitignore                 # Git 忽略规则
└── .env.example               # 配置示例
```

---

## 🤝 协作规范

### Git 分支策略

```
master/main    # 生产分支，保护分支，仅通过 PR 合并
dev            # 开发分支
feature/xxx    # 功能开发分支
hotfix/xxx     # 紧急修复分支
```

### 提交规范

遵循 [Conventional Commits](https://conventionalcommits.org/)

```
feat: 新增功能
fix: 修复 bug
docs: 文档更新
style: 代码风格
refactor: 重构
test: 测试相关
chore: 构建/工具链
```

---

## 📄 许可证

MIT License

---

## 📞 技术支持

如有问题，请查看：
1. [CHANGELOG.md](CHANGELOG.md) - 版本变更记录
2. [scripts/README.md](scripts/README.md) - 部署脚本说明
3. GitHub Issues - 提交问题

---

**祝游戏愉快！🎮**
