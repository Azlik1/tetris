# 脚本目录说明

## 目录结构

```
scripts/
└── deploy/              # 部署脚本
    ├── deploy.ps1       # Windows K8s 部署脚本
    ├── deploy.sh        # Linux/Mac K8s 部署脚本
    └── undeploy.ps1     # Windows K8s 卸载脚本
```

## 部署脚本使用说明

### Windows 部署
```powershell
# 方式1：根目录 npm 脚本（推荐）
npm run k8s:deploy

# 方式2：直接执行
powershell -ExecutionPolicy Bypass -File scripts/deploy/deploy.ps1

# 带参数
.\scripts\deploy\deploy.ps1 -Version v1.0.1 -SkipPushImage
```

### Linux/Mac 部署
```bash
chmod +x scripts/deploy/deploy.sh
./scripts/deploy/deploy.sh
```

### 卸载
```powershell
# Windows
npm run k8s:undeploy

# 或直接执行
.\scripts\deploy\undeploy.ps1
```

## deploy.ps1 参数说明

| 参数 | 默认值 | 说明 |
|------|--------|------|
| Version | v1.0.0 | 镜像版本号 |
| Namespace | tetris-game | K8s 命名空间 |
| ImageRegistry | docker.io/library | 镜像仓库地址 |
| ImageName | tetris-backend | 镜像名称 |
| RollbackOnFailure | $true | 失败自动回滚 |
| SkipPushImage | $false | 跳过镜像推送 |
| TimeoutSeconds | 300 | 部署超时时间 |

## 示例

```powershell
# 本地测试环境，跳过镜像推送
.\scripts\deploy\deploy.ps1 -SkipPushImage

# 生产环境部署到私有仓库
.\scripts\deploy\deploy.ps1 `
  -Version v1.0.0 `
  -ImageRegistry harbor.mycompany.com/tetris `
  -ImageName backend-service
```
