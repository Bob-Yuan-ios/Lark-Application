# 项目优化方案

基于对项目代码的全面分析，以下是针对飞书应用的优化建议和实现方案：

## 1. 去重机制优化

### 现状
- 目前使用内存中的 `Set` 进行事件和卡片回调去重
- 应用重启后去重数据会丢失，可能导致重复处理

### 优化方案
- 使用 Redis 存储去重标识，实现持久化去重
- 为每个事件设置过期时间，避免 Redis 内存无限增长

### 实现代码
```javascript
// src/utils/dedup.js
import redis from 'ioredis';

const client = new redis();
const EVENT_EXPIRE_TIME = 3600; // 1小时过期
const CARD_EXPIRE_TIME = 86400; // 24小时过期

/**
 * 响应事件防重复触发
 * @param {string} id 
 * @returns 
 */
export async function dedupEvent(id) {
    const key = `event:${id}`;
    const exists = await client.exists(key);
    if (exists) return true;
    await client.setex(key, EVENT_EXPIRE_TIME, '1');
    return false;
}

/**
 * 卡片回调防重复触发
 * @param {string} id 
 * @returns 
 */
export async function dedupCard(id) {
    const key = `card:${id}`;
    const exists = await client.exists(key);
    if (exists) return true;
    await client.setex(key, CARD_EXPIRE_TIME, '1');
    return false;
}
```

## 2. 错误处理增强

### 现状
- 错误处理比较简单，只返回500状态码和通用消息
- 缺乏详细的错误日志和分类错误处理

### 优化方案
- 增加错误类型分类和自定义错误类
- 实现更详细的错误日志记录
- 根据错误类型返回不同的状态码和错误信息

### 实现代码
```javascript
// src/middlewares/errorHandler.js
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.message = err.message || 'Internal Server Error';

    // 记录错误日志
    console.error('Error:', err);

    // 根据错误类型返回不同的响应
    if (err.isOperational) {
        res.status(err.statusCode).json({
            code: err.statusCode,
            msg: err.message
        });
    } else {
        res.status(500).json({
            code: 500,
            msg: '服务异常，请稍后再试'
        });
    }
};

export { AppError, errorHandler };
```

## 3. 日志系统优化

### 现状
- 只有简单的 `console.log` 输出
- 没有日志级别和持久化存储

### 优化方案
- 使用 `winston` 日志库实现专业日志系统
- 支持不同日志级别（debug, info, warn, error）
- 实现日志文件持久化和轮转

### 实现代码
```javascript
// src/middlewares/logger.js
import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';

// 创建日志目录
const logDir = path.join(process.cwd(), 'logs');

// 配置日志轮转
const transport = new winston.transports.DailyRotateFile({
    filename: path.join(logDir, 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d'
});

// 创建日志器
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] ${level}: ${message}`;
        })
    ),
    transports: [
        transport,
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ timestamp, level, message }) => {
                    return `[${timestamp}] ${level}: ${message}`;
                })
            )
        })
    ]
});

// HTTP 请求日志中间件
const httpLogger = (req, res, next) => {
    const start = Date.now();
    const { method, originalUrl, ip } = req;

    res.on('finish', () => {
        const duration = Date.now() - start;
        const { statusCode } = res;
        logger.info(`${method} ${originalUrl} ${statusCode} ${duration}ms - ${ip}`);
    });

    next();
};

export { logger, httpLogger };
```

## 4. Redis 缓存利用

### 现状
- 项目依赖了 `ioredis`，但没有实际使用
- 部分数据（如用户信息、模板）可以缓存以提高性能

### 优化方案
- 实现 Redis 缓存服务模块
- 缓存飞书 API 访问令牌和频繁访问的数据
- 实现缓存过期和更新机制

### 实现代码
```javascript
// src/services/cache.service.js
import redis from 'ioredis';
import { logger } from '../middlewares/logger.js';

class CacheService {
    constructor() {
        this.client = new redis();
        this.client.on('error', (err) => {
            logger.error(`Redis error: ${err.message}`);
        });
    }

    async get(key) {
        try {
            const data = await this.client.get(key);
            return data ? JSON.parse(data) : null;
        } catch (err) {
            logger.error(`Redis get error: ${err.message}`);
            return null;
        }
    }

    async set(key, value, expireTime = 3600) {
        try {
            await this.client.setex(key, expireTime, JSON.stringify(value));
            return true;
        } catch (err) {
            logger.error(`Redis set error: ${err.message}`);
            return false;
        }
    }

    async del(key) {
        try {
            await this.client.del(key);
            return true;
        } catch (err) {
            logger.error(`Redis del error: ${err.message}`);
            return false;
        }
    }
}

export default new CacheService();
```

## 5. 环境变量配置

### 现状
- 敏感信息（如 APP_ID、APP_SECRET）直接硬编码在代码中
- 不便于不同环境（开发、测试、生产）切换配置

### 优化方案
- 使用 `dotenv` 库管理环境变量
- 创建不同环境的配置文件
- 将敏感信息存储在环境变量中

### 实现代码
```javascript
// .env
APP_ID=your_app_id
APP_SECRET=your_app_secret
PORT=3000
REDIS_HOST=localhost
REDIS_PORT=6379
NODE_ENV=development
```

```javascript
// src/config/index.js
import dotenv from 'dotenv';

dotenv.config();

export const APP_ID = process.env.APP_ID;
export const APP_SECRET = process.env.APP_SECRET;
export const PORT = process.env.PORT || 3000;
export const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
export const REDIS_PORT = process.env.REDIS_PORT || 6379;
export const NODE_ENV = process.env.NODE_ENV || 'development';
```

## 6. 单元测试添加

### 现状
- 项目没有任何测试代码
- 代码质量和稳定性难以保证

### 优化方案
- 使用 `jest` 框架添加单元测试
- 为核心功能和工具函数编写测试用例
- 集成测试覆盖率报告

### 实现代码
```javascript
// package.json
{
  "scripts": {
    "test":