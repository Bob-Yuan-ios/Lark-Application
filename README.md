# Lark Application

这是一个使用webpack自动打包的Node.js Express应用程序。

## 构建脚本

- `npm run dev`: 运行开发服务器
- `npm run build`: 构建生产版本
- `npm run build:watch`: 监听文件变化并自动重新构建
- `npm start`: 运行构建后的生产版本
- `npm test`: 运行测试

## Webpack配置

Webpack配置文件为`webpack.config.js`，专门用于打包Node.js服务器端代码。

## 部署说明

项目提供了自动化部署脚本`deploy.sh`，部署流程如下：
1. 运行 `npm run build` 构建生产版本。
2. 使用 `pm2` 启动生产服务器：`pm2 start ecosystem.config.cjs`。
3. 监控日志：`pm2 logs`。

## 优化建议

1. 确保依赖项是最新稳定版本。
2. 使用 `--mode production` 参数运行 Webpack 构建。
3. 检查测试覆盖率，确保核心功能被覆盖。

1. 确保服务器已安装Node.js和npm
2. 给部署脚本添加执行权限：`chmod +x deploy.sh`
3. 运行部署脚本：`./deploy.sh`

部署脚本会自动完成以下步骤：
- 检查并安装PM2（如果未安装）
- 检查并创建PM2配置文件`pm2.config.js`（如果不存在）
- 构建项目
- 安装依赖
- 使用PM2启动应用

部署前请确保代码已提交到服务器。