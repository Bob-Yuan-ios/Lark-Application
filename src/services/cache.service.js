// 简单的内存缓存实现
const memoryCache = new Map();

export class CacheService {
    static async get(key) {
        const item = memoryCache.get(key);
        if (item && item.expire > Date.now()) {
            return item.value;
        }
        // 清除过期项
        if (item) {
            memoryCache.delete(key);
        }
        return null;
    }

    static async set(key, value, expireTime) {
        const expire = expireTime ? Date.now() + (expireTime * 1000) : null;
        memoryCache.set(key, { value, expire });
    }

    static async del(key) {
        memoryCache.delete(key);
    }

    static async exists(key) {
        const item = memoryCache.get(key);
        if (item && item.expire > Date.now()) {
            return true;
        }
        // 清除过期项
        if (item) {
            memoryCache.delete(key);
        }
        return false;
    }
}