import { redisClient } from '../utils/redisClient.js';
import { logger } from '../middlewares/logger.js';

class CacheService {
    constructor() {
        // 获取Redis客户端
        this.client = redisClient.getClient();
    }

    /**
     * 获取缓存
     * @param {string} key - 缓存键
     * @returns {Promise<any>} 缓存值
     */
    async get(key) {
        try {
            const data = await this.client.get(key);
            return data ? JSON.parse(data) : null;
        } catch (err) {
            logger.error(`Redis get error: ${err.message}`);
            return null;
        }
    }

    /**
     * 设置缓存
     * @param {string} key - 缓存键
     * @param {any} value - 缓存值
     * @param {number} expireTime - 过期时间（秒），默认3600秒
     * @returns {Promise<boolean>} 是否设置成功
     */
    async set(key, value, expireTime = 3600) {
        try {
            await this.client.setex(key, expireTime, JSON.stringify(value));
            return true;
        } catch (err) {
            logger.error(`Redis set error: ${err.message}`);
            return false;
        }
    }

    /**
     * 删除缓存
     * @param {string} key - 缓存键
     * @returns {Promise<boolean>} 是否删除成功
     */
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