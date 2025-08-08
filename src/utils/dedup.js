import fs from 'fs';
import path from 'path';

// 内存存储
const memoryStore = new Map();

// 本地持久化文件路径
const persistFilePath = path.join(process.cwd(), 'data', 'dedup.json');

// 确保存储目录存在
const dataDir = path.dirname(persistFilePath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 从本地文件加载数据
function loadFromFile() {
  try {
    if (fs.existsSync(persistFilePath)) {
      const data = fs.readFileSync(persistFilePath, 'utf8');
      const parsed = JSON.parse(data);
      // 恢复到内存存储
      for (const [key, value] of Object.entries(parsed)) {
        memoryStore.set(key, new Date(value));
      }
    }
  } catch (err) {
    console.error('Failed to load dedup data from file:', err);
  }
}

// 保存数据到本地文件
function saveToFile() {
  try {
    const data = {};
    for (const [key, value] of memoryStore.entries()) {
      data[key] = value.toISOString();
    }
    fs.writeFileSync(persistFilePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Failed to save dedup data to file:', err);
  }
}

// 清理过期数据
function cleanupExpired() {
  const now = new Date();
  let cleaned = false;
  
  // 清理过期的事件数据（1小时过期）
  for (const [key, timestamp] of memoryStore.entries()) {
    if (key.startsWith('event:') && now - timestamp > 3600000) {
      memoryStore.delete(key);
      cleaned = true;
    }
  }
  
  // 清理过期的卡片数据（24小时过期）
  for (const [key, timestamp] of memoryStore.entries()) {
    if (key.startsWith('card:') && now - timestamp > 86400000) {
      memoryStore.delete(key);
      cleaned = true;
    }
  }
  
  // 如果清理了数据，则保存到文件
  if (cleaned) {
    saveToFile();
  }
}

// 初始化时加载数据并清理过期数据
loadFromFile();
cleanupExpired();

// 定期清理过期数据（每小时）
setInterval(cleanupExpired, 3600000);

/**
 * 响应事件防重复触发
 * @param {string} id 
 * @returns 
 */
export async function dedupEvent(id) {
  const key = `event:${id}`;
  const now = new Date();
  
  // 检查是否存在且未过期
  if (memoryStore.has(key)) {
    const timestamp = memoryStore.get(key);
    if (now - timestamp < 3600000) { // 1小时
      return true;
    }
  }
  
  // 设置或更新时间戳
  memoryStore.set(key, now);
  saveToFile();
  return false;
}

/**
 * 卡片回调防重复触发
 * @param {string} id 
 * @returns 
 */
export async function dedupCard(id) {
  const key = `card:${id}`;
  const now = new Date();
  
  // 检查是否存在且未过期
  if (memoryStore.has(key)) {
    const timestamp = memoryStore.get(key);
    if (now - timestamp < 86400000) { // 24小时
      return true;
    }
  }
  
  // 设置或更新时间戳
  memoryStore.set(key, now);
  saveToFile();
  return false;
}
