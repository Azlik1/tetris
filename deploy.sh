#!/bin/bash

# 脚本功能：自动化部署俄罗斯方块游戏到Kubernetes集群

echo "========================================"
echo "开始部署俄罗斯方块游戏"
echo "========================================"

# 1. 构建Docker镜像
echo "步骤1：构建Docker镜像"
docker build -t tetris-backend:latest .
if [ $? -ne 0 ]; then
    echo "构建Docker镜像失败"
    exit 1
fi
echo "构建Docker镜像成功"

# 2. 部署到Kubernetes集群
echo "步骤2：部署到Kubernetes集群"

# 创建ConfigMap
echo "创建ConfigMap..."
kubectl apply -f k8s/configmap.yml
if [ $? -ne 0 ]; then
    echo "创建ConfigMap失败"
    exit 1
fi

# 部署MySQL
echo "部署MySQL..."
kubectl apply -f k8s/mysql.yml
if [ $? -ne 0 ]; then
    echo "部署MySQL失败"
    exit 1
fi

# 部署Redis
echo "部署Redis..."
kubectl apply -f k8s/redis.yml
if [ $? -ne 0 ]; then
    echo "部署Redis失败"
    exit 1
fi

# 部署后端服务
echo "部署后端服务..."
kubectl apply -f k8s/backend-deployment.yml
if [ $? -ne 0 ]; then
    echo "部署后端服务失败"
    exit 1
fi

# 部署后端服务Service
echo "部署后端服务Service..."
kubectl apply -f k8s/backend-service.yml
if [ $? -ne 0 ]; then
    echo "部署后端服务Service失败"
    exit 1
fi

# 部署HPA
echo "部署HPA..."
kubectl apply -f k8s/hpa.yml
if [ $? -ne 0 ]; then
    echo "部署HPA失败"
    exit 1
fi

# 3. 验证部署状态
echo "步骤3：验证部署状态"
echo "等待服务启动..."
sleep 60

echo "查看Pod状态："
kubectl get pods

echo "查看Service状态："
kubectl get services

echo "查看HPA状态："
kubectl get hpa

echo "========================================"
echo "部署完成！"
echo "========================================"
echo "访问地址：http://<node-ip>:30000"
echo "========================================"