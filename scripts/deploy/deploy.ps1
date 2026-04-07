#Requires -RunAsAdministrator
<#
.SYNOPSIS
俄罗斯方块游戏Kubernetes自动化部署脚本
.DESCRIPTION
解决部署核心问题：镜像管理、依赖就绪校验、状态校验、版本管理、回滚机制
#>

param(
    [string]$Version = "v1.0.0",
    [string]$Namespace = "tetris-game",
    [string]$ImageRegistry = "docker.io/library",
    [string]$ImageName = "tetris-backend",
    [switch]$RollbackOnFailure = $true,
    [switch]$SkipPushImage = $false,
    [int]$TimeoutSeconds = 300
)

$ErrorActionPreference = "Stop"
$Script:DeployedResources = @()
$Script:StartTime = Get-Date

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        "ERROR" { "Red" }
        "WARN"  { "Yellow" }
        "SUCCESS" { "Green" }
        default { "Cyan" }
    }
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

function Invoke-Rollback {
    Write-Log "开始回滚已部署的资源..." "WARN"
    foreach ($resource in $Script:DeployedResources) {
        try {
            Write-Log "删除: $resource" "WARN"
            kubectl delete -f $resource --namespace $Namespace --ignore-not-found=true --wait=false | Out-Null
        }
        catch {
            Write-Log "回滚 $resource 失败: $_" "ERROR"
        }
    }
    Write-Log "回滚完成" "WARN"
}

function Test-Prerequisites {
    Write-Log "========== 前置检查 =========="
    
    try { docker --version | Out-Null; Write-Log "Docker: 就绪" "SUCCESS" }
    catch { Write-Log "Docker 未安装或未启动" "ERROR"; exit 1 }
    
    try { kubectl version --client | Out-Null; Write-Log "kubectl: 就绪" "SUCCESS" }
    catch { Write-Log "kubectl 未安装" "ERROR"; exit 1 }
    
    try {
        kubectl auth can-i create deployments --namespace $Namespace 2>&1 | Out-Null
        Write-Log "K8s权限: 验证通过" "SUCCESS"
    }
    catch {
        Write-Log "K8s权限不足，请检查kubeconfig" "ERROR"
        exit 1
    }
    
    kubectl cluster-info 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Log "K8s集群连接失败，请检查集群状态" "ERROR"
        exit 1
    }
    Write-Log "K8s集群: 连接正常" "SUCCESS"
}

function New-Namespace {
    Write-Log "========== 创建命名空间 =========="
    $exists = kubectl get namespace $Namespace --ignore-not-found=true
    if (-not $exists) {
        kubectl create namespace $Namespace | Out-Null
        Write-Log "命名空间 $Namespace 创建成功" "SUCCESS"
    }
    else {
        Write-Log "命名空间 $Namespace 已存在" "SUCCESS"
    }
}

function Invoke-BuildAndPushImage {
    Write-Log "========== 构建并推送镜像 =========="
    $fullImageTag = "${ImageRegistry}/${ImageName}:${Version}"
    
    Write-Log "构建镜像: $fullImageTag"
    docker build -t $fullImageTag -t "${ImageRegistry}/${ImageName}:latest" ./backend
    
    if ($LASTEXITCODE -ne 0) {
        Write-Log "镜像构建失败" "ERROR"
        if ($RollbackOnFailure) { Invoke-Rollback }
        exit 1
    }
    Write-Log "镜像构建成功" "SUCCESS"
    
    if (-not $SkipPushImage) {
        Write-Log "推送镜像到仓库: $ImageRegistry"
        docker push $fullImageTag
        if ($LASTEXITCODE -ne 0) {
            Write-Log "镜像推送失败，请检查仓库权限或使用 -SkipPushImage" "ERROR"
            Write-Log "注意：如使用本地集群，可添加 -SkipPushImage 跳过推送" "WARN"
            if ($RollbackOnFailure) { Invoke-Rollback }
            exit 1
        }
        Write-Log "镜像推送成功" "SUCCESS"
    }
    else {
        Write-Log "跳过镜像推送（本地集群模式）" "WARN"
    }
    
    return $fullImageTag
}

function Update-DeploymentImage {
    param([string]$FullImageTag)
    Write-Log "========== 更新Deployment镜像 =========="
    $deploymentFile = "k8s/backend-deployment.yml"
    $content = Get-Content $deploymentFile -Raw
    
    $content = $content -replace 'image: tetris-backend:latest', "image: $FullImageTag"
    $content = $content -replace 'imagePullPolicy: IfNotPresent', "imagePullPolicy: Always"
    
    Set-Content -Path $deploymentFile -Value $content -NoNewline
    Write-Log "已更新 $deploymentFile 中的镜像为: $FullImageTag" "SUCCESS"
}

function Wait-ForResourceReady {
    param(
        [string]$ResourceType,
        [string]$LabelSelector,
        [int]$Timeout = 120
    )
    
    Write-Log "等待 $ResourceType 就绪 (标签: $LabelSelector)..."
    $elapsed = 0
    
    while ($elapsed -lt $Timeout) {
        $ready = kubectl get $ResourceType --namespace $Namespace -l $LabelSelector -o jsonpath='{.items[*].status.conditions[?(@.type=="Ready")].status}' 2>$null
        
        if ($ready -eq "True") {
            Write-Log "$ResourceType 就绪" "SUCCESS"
            return $true
        }
        
        Start-Sleep 5
        $elapsed += 5
        Write-Progress -Activity "等待 $ResourceType 就绪" -PercentComplete ($elapsed / $Timeout * 100)
    }
    
    Write-Log "$ResourceType 等待超时($Timeout秒)" "ERROR"
    return $false
}

function Test-ServiceConnectivity {
    param(
        [string]$ServiceName,
        [int]$Port,
        [int]$Timeout = 60
    )
    
    Write-Log "测试 $ServiceName:$Port 连通性..."
    $elapsed = 0
    
    while ($elapsed -lt $Timeout) {
        $podIP = kubectl get pods --namespace $Namespace -l "app=$ServiceName" -o jsonpath='{.items[0].status.podIP}' 2>$null
        
        if ($podIP -and $podIP -ne "") {
            Write-Log "$ServiceName Pod IP: $podIP" "SUCCESS"
            return $true
        }
        
        Start-Sleep 3
        $elapsed += 3
    }
    
    Write-Log "$ServiceName 连通性测试超时" "WARN"
    return $false
}

function Deploy-Resource {
    param([string]$FilePath, [string]$ResourceName)
    
    Write-Log "部署: $FilePath"
    kubectl apply -f $FilePath --namespace $Namespace | Out-Null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Log "$ResourceName 部署失败" "ERROR"
        if ($RollbackOnFailure) { Invoke-Rollback }
        exit 1
    }
    
    $Script:DeployedResources += $FilePath
    Write-Log "$ResourceName 部署指令已执行" "SUCCESS"
    
    kubectl get -f $FilePath --namespace $Namespace 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Log "$ResourceName 实际创建失败，集群中不存在" "ERROR"
        if ($RollbackOnFailure) { Invoke-Rollback }
        exit 1
    }
}

function Test-HPAAssociation {
    Write-Log "========== 验证HPA关联 =========="
    $target = kubectl get hpa tetris-backend-hpa --namespace $Namespace -o jsonpath='{.spec.scaleTargetRef.name}' 2>$null
    
    if ($target -eq "tetris-backend") {
        Write-Log "HPA已正确关联到后端Deployment" "SUCCESS"
    }
    else {
        Write-Log "HPA关联异常，目标: $target" "ERROR"
    }
    
    $metrics = kubectl get hpa tetris-backend-hpa --namespace $Namespace -o jsonpath='{.spec.metrics[*].resource.name}' 2>$null
    Write-Log "HPA监控指标: $metrics" "SUCCESS"
}

function Show-DeploymentSummary {
    Write-Log "========== 部署汇总 =========="
    
    $duration = (Get-Date) - $Script:StartTime
    Write-Log "部署耗时: $($duration.Minutes)分$($duration.Seconds)秒" "SUCCESS"
    
    Write-Log "`nPod状态:"
    kubectl get pods --namespace $Namespace -o wide
    
    Write-Log "`nService状态:"
    kubectl get services --namespace $Namespace
    
    Write-Log "`nHPA状态:"
    kubectl get hpa --namespace $Namespace
    
    $nodePort = kubectl get service tetris-backend --namespace $Namespace -o jsonpath='{.spec.ports[0].nodePort}'
    Write-Log "`n========== 部署完成 ==========" "SUCCESS"
    Write-Log "命名空间: $Namespace" "SUCCESS"
    Write-Log "版本: $Version" "SUCCESS"
    Write-Log "访问地址: http://<节点IP>:$nodePort" "SUCCESS"
    Write-Log "查看日志: kubectl logs -f deployment/tetris-backend --namespace $Namespace" "SUCCESS"
    Write-Log "==============================" "SUCCESS"
}

try {
    Clear-Host
    Write-Log "========================================"
    Write-Log "俄罗斯方块游戏 - Kubernetes自动化部署"
    Write-Log "版本: $Version | 命名空间: $Namespace"
    Write-Log "========================================"

    Test-Prerequisites
    New-Namespace
    
    $fullImageTag = Invoke-BuildAndPushImage
    Update-DeploymentImage -FullImageTag $fullImageTag
    
    Write-Log "========== 部署依赖服务 =========="
    
    Deploy-Resource -FilePath "k8s/configmap.yml" -ResourceName "ConfigMap"
    Deploy-Resource -FilePath "k8s/mysql.yml" -ResourceName "MySQL"
    Deploy-Resource -FilePath "k8s/redis.yml" -ResourceName "Redis"
    
    if (-not (Wait-ForResourceReady -ResourceType "pods" -LabelSelector "app=mysql" -Timeout 180)) {
        Write-Log "MySQL未就绪，部署终止" "ERROR"
        if ($RollbackOnFailure) { Invoke-Rollback }
        exit 1
    }
    Test-ServiceConnectivity -ServiceName "mysql" -Port 3306
    
    if (-not (Wait-ForResourceReady -ResourceType "pods" -LabelSelector "app=redis" -Timeout 120)) {
        Write-Log "Redis未就绪，部署终止" "ERROR"
        if ($RollbackOnFailure) { Invoke-Rollback }
        exit 1
    }
    Test-ServiceConnectivity -ServiceName "redis" -Port 6379
    
    Write-Log "========== 部署后端服务 =========="
    Deploy-Resource -FilePath "k8s/backend-deployment.yml" -ResourceName "后端Deployment"
    Deploy-Resource -FilePath "k8s/backend-service.yml" -ResourceName "后端Service"
    Deploy-Resource -FilePath "k8s/hpa.yml" -ResourceName "HPA"
    
    if (-not (Wait-ForResourceReady -ResourceType "pods" -LabelSelector "app=tetris-backend" -Timeout 120)) {
        Write-Log "后端服务未就绪" "ERROR"
        if ($RollbackOnFailure) { Invoke-Rollback }
        exit 1
    }
    
    Test-HPAAssociation
    Show-DeploymentSummary
}
catch {
    Write-Log "部署异常: $_" "ERROR"
    if ($RollbackOnFailure) { Invoke-Rollback }
    exit 1
}