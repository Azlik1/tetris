<#
.SYNOPSIS
卸载并清理俄罗斯方块游戏Kubernetes资源
#>

param(
    [string]$Namespace = "tetris-game",
    [switch]$RemovePersistentVolumes = $false,
    [switch]$RemoveNamespace = $true
)

$ErrorActionPreference = "Continue"

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

Write-Log "========================================"
Write-Log "清理Kubernetes部署资源"
Write-Log "命名空间: $Namespace"
Write-Log "========================================"

$resources = @(
    "k8s/hpa.yml",
    "k8s/backend-service.yml",
    "k8s/backend-deployment.yml",
    "k8s/redis.yml",
    "k8s/mysql.yml",
    "k8s/configmap.yml"
)

foreach ($resource in $resources) {
    if (Test-Path $resource) {
        Write-Log "删除: $resource"
        kubectl delete -f $resource --namespace $Namespace --ignore-not-found=true --wait=false 2>&1 | Out-Null
    }
}

if ($RemovePersistentVolumes) {
    Write-Log "删除PersistentVolumeClaims..." "WARN"
    kubectl delete pvc --namespace $Namespace -l app=mysql --ignore-not-found=true 2>&1 | Out-Null
    kubectl delete pvc --namespace $Namespace -l app=redis --ignore-not-found=true 2>&1 | Out-Null
}

if ($RemoveNamespace) {
    Write-Log "删除命名空间: $Namespace" "WARN"
    kubectl delete namespace $Namespace --ignore-not-found=true --wait=false 2>&1 | Out-Null
}

Write-Log "等待资源清理完成..."
Start-Sleep 10

Write-Log "查看剩余资源:"
kubectl get all --namespace $Namespace 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    kubectl get all --namespace $Namespace
} else {
    Write-Log "命名空间已删除或不存在" "SUCCESS"
}

Write-Log "========================================"
Write-Log "清理完成" "SUCCESS"
Write-Log "========================================"