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
