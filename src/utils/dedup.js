import { redisClient } from './redisClient.js';

// 获取Redis客户端
const client = redisClient.getClient();

// 设置过期时间（秒）
const EVENT_EXPIRE_TIME = 3600; // 1小时
const CARD_EXPIRE_TIME = 86400; // 24小时

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
