import express from 'express';
import { redisClient } from '../utils/redisClient.js';
import { logger } from '../middlewares/logger.js';

const router = express.Router();

// 测试Redis连接
router.get('/test-redis', async (req, res) => {
    try {
        const client = redisClient.getClient();
        // 尝试执行一个简单的Redis命令
        const result = await client.ping();
        logger.info('Redis ping result:', result);
        res.status(200).json({
            success: true,
            message: 'Redis connection test successful',
            result: result
        });
    } catch (err) {
        logger.error('Redis connection test failed:', err);
        res.status(500).json({
            success: false,
            message: 'Redis connection test failed',
            error: err.message
        });
    }
});

// 测试Redis设置和获取
router.get('/test-redis-set-get', async (req, res) => {
    try {
        const client = redisClient.getClient();
        const testKey = 'test:key';
        const testValue = 'test value ' + new Date().getTime();
        
        // 设置值
        await client.setex(testKey, 60, testValue);
        logger.info(`Set Redis key: ${testKey}, value: ${testValue}`);
        
        // 获取值
        const retrievedValue = await client.get(testKey);
        logger.info(`Retrieved Redis key: ${testKey}, value: ${retrievedValue}`);
        
        res.status(200).json({
            success: true,
            message: 'Redis set/get test successful',
            key: testKey,
            setValue: testValue,
            getValue: retrievedValue
        });
    } catch (err) {
        logger.error('Redis set/get test failed:', err);
        res.status(500).json({
            success: false,
            message: 'Redis set/get test failed',
            error: err.message
        });
    }
});

export default router;