import redis from 'ioredis';
import { REDIS_HOST, REDIS_PORT } from '../config/index.js';
import { logger } from '../middlewares/logger.js';

class RedisClient {
    constructor() {
        this.client = null;
        this.connectionAttempts = 0;
        this.maxRetries = 5;
        this.retryDelay = 2000; // 2秒
        this.connect();
    }

    async connect() {
        try {
            this.client = new redis({
                host: REDIS_HOST,
                port: REDIS_PORT,
                retryStrategy: (times) => {
                    // 当连接失败时的重试策略
                    if (times > this.maxRetries) {
                        logger.error(`Failed to connect to Redis after ${this.maxRetries} attempts`);
                        return null; // 停止重试
                    }
                    this.connectionAttempts++;
                    const delay = Math.min(times * this.retryDelay, 10000); // 最大延迟10秒
                    logger.warn(`Redis connection attempt ${this.connectionAttempts} failed. Retrying in ${delay}ms...`);
                    return delay;
                },
                reconnectOnError: (err) => {
                    // 当发生特定错误时重新连接
                    const targetError = 'READONLY';
                    if (err.message.includes(targetError)) {
                        logger.warn('Redis read-only error detected. Reconnecting...');
                        return true;
                    }
                    return false;
                },
                maxLoadingRetryTime: 10000, // 加载重试的最大时间
                enableReadyCheck: true // 启用就绪检查
            });

            // 监听连接事件
            this.client.on('connect', () => {
                logger.info('Redis client is connecting...');
            });

            this.client.on('ready', () => {
                logger.info('Redis client is ready');
                this.connectionAttempts = 0; // 重置连接尝试次数
            });

            this.client.on('error', (err) => {
                logger.error(`Redis error: ${err.message}`);
                // 如果发生连接错误，尝试重新连接
                if (err.code === 'ECONNREFUSED' && this.connectionAttempts < this.maxRetries) {
                    setTimeout(() => this.connect(), this.retryDelay);
                }
            });

            this.client.on('reconnecting', (info) => {
                logger.info(`Redis reconnecting: attempt ${info.attempt} after ${info.delay}ms`);
            });

            this.client.on('end', () => {
                logger.warn('Redis connection closed');
            });

        } catch (err) {
            logger.error(`Failed to initialize Redis client: ${err.message}`);
            // 尝试重新连接
            if (this.connectionAttempts < this.maxRetries) {
                setTimeout(() => this.connect(), this.retryDelay);
            }
        }
    }

    // 获取Redis客户端实例
    getClient() {
        if (!this.client) {
            logger.warn('Redis client not initialized yet. Attempting to connect...');
            this.connect();
        }
        return this.client;
    }
}

export const redisClient = new RedisClient();