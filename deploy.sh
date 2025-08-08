#!/bin/bash

# 部署脚本

# 创建日志目录
# 创建备份目录
BACKUP_DIR="./backups"
if [ ! -d "$BACKUP_DIR" ]; then
  mkdir -p "$BACKUP_DIR"
fi

# 备份当前版本
if [ -d "./build" ]; then
  BACKUP_NAME="build_$(date +%Y%m%d_%H%M%S)"
  echo "Backing up current version to $BACKUP_DIR/$BACKUP_NAME"
  cp -r ./build "$BACKUP_DIR/$BACKUP_NAME"
  
  # 保留最近的5个备份，删除旧的备份
  BACKUP_COUNT=$(ls -1t "$BACKUP_DIR" | wc -l)
  if [ "$BACKUP_COUNT" -gt 5 ]; then
    echo "Cleaning up old backups, keeping only the latest 5..."
    ls -1t "$BACKUP_DIR" | tail -n +6 | xargs -I {} rm -rf "$BACKUP_DIR/{}"
  fi
fi
LOG_DIR="./logs"
if [ ! -d "$LOG_DIR" ]; then
  mkdir -p "$LOG_DIR"
fi

# 创建logrotate配置文件用于管理deploy.log
LOGROTATE_CONF="$LOG_DIR/deploy_logrotate.conf"
cat > "$LOGROTATE_CONF" << EOF
$LOG_DIR/deploy.log {
    daily
    rotate 10
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
    size 10M
}
EOF

# 执行日志轮转
logrotate -s "$LOG_DIR/deploy_logrotate.state" "$LOG_DIR/deploy_logrotate.conf" >> "$LOG_DIR/deploy.log" 2>&1

# 1. 本地编译是否正常（是否能够正确编译成功，webpack打包）
echo "Step 1: Building project..."
npm run build >> "$LOG_DIR/deploy.log" 2>&1
if [ $? -ne 0 ]; then
  echo "Build failed! Check logs in $LOG_DIR/deploy.log for details."
  exit 1
fi
echo "Build succeeded!"

# 2. 确定服务器node版本（没有安装node先安装node，再装一个nvm的版本管理工具）
echo "Step 2: Checking Node.js version..."
if ! command -v node &> /dev/null; then
  echo "Node.js is not installed. Please install Node.js first."
  exit 1
fi

echo "Node.js version: $(node --version)" >> "$LOG_DIR/deploy.log" 2>&1
echo "npm version: $(npm --version)" >> "$LOG_DIR/deploy.log" 2>&1

# 3. 安装npm包
echo "Step 3: Installing npm packages..."
npm install >> "$LOG_DIR/deploy.log" 2>&1
if [ $? -ne 0 ]; then
  echo "npm install failed! Check logs in $LOG_DIR/deploy.log for details."
  exit 1
fi
echo "npm packages installed successfully!"

# 4. 编译程序（已在步骤1完成）

# 5. 先确定有没有安装pm2，没有先安装
echo "Step 5: Checking PM2..."
if ! command -v pm2 &> /dev/null; then
  echo "PM2 is not installed. Installing PM2..."
  npm install -g pm2 >> "$LOG_DIR/deploy.log" 2>&1
  if [ $? -ne 0 ]; then
    echo "PM2 installation failed! Check logs in $LOG_DIR/deploy.log for details."
    exit 1
  fi
  echo "PM2 installed successfully!"
else
  echo "PM2 is already installed."
fi

# 6. 确定有没有pm2.config.cjs启动脚本，没有编写一个pm2.config.cjs
echo "Step 6: Checking pm2.config.cjs..."
if [ ! -f "pm2.config.cjs" ]; then
  echo "Creating pm2.config.cjs..."
  cat > pm2.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'lark-application',
    script: './build/index.cjs',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF
  echo "pm2.config.cjs created successfully!"
else
  echo "pm2.config.cjs already exists."
fi

# 7. pm2启动
echo "Step 7: Starting application with PM2..."
pm2 start pm2.config.cjs >> "$LOG_DIR/deploy.log" 2>&1
if [ $? -ne 0 ]; then
  echo "Failed to start application with PM2! Check logs in $LOG_DIR/deploy.log for details."
  exit 1
fi
echo "Application started successfully with PM2!"

# 应用健康检查
echo "Step 8: Performing health check..."
sleep 5
pm2 ping >> "$LOG_DIR/deploy.log" 2>&1
if [ $? -ne 0 ]; then
  echo "Health check failed! Check logs in $LOG_DIR/deploy.log for details."
  exit 1
fi
echo "Health check passed!"

echo "Deployment completed successfully!"}]}}}