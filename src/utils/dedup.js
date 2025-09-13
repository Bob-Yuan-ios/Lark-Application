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
    if (key.startsWith('card:') && now - timestamp > 86400000 * 7) {
      memoryStore.delete(key);
      cleaned = true;
    }
  }
  
  // 如果清理了数据，则保存到文件
  if (cleaned) {
    saveToFile();
  }
}

// 检查文件大小并在超过限制时清理旧数据
function checkFileSizeAndCleanup() {
  try {
    if (fs.existsSync(persistFilePath)) {
      const stats = fs.statSync(persistFilePath);
      const fileSizeInBytes = stats.size;
      const fileSizeInMB = fileSizeInBytes / (1024 * 1024);
      
      // 如果文件超过10MB，则清理旧数据
      if (fileSizeInMB > 10) {
        console.log(`dedup.json 文件大小 ${fileSizeInMB.toFixed(2)}MB 超过限制，开始清理旧数据`);
        
        // 按时间戳排序，清理最旧的一半数据
        const sortedEntries = Array.from(memoryStore.entries()).sort((a, b) => a[1] - b[1]);
        const halfIndex = Math.floor(sortedEntries.length / 2);
        
        // 删除前一半（最旧的）
        for (let i = 0; i < halfIndex; i++) {
          memoryStore.delete(sortedEntries[i][0]);
        }
        
        // 保存到文件
        saveToFile();
        console.log(`已清理 ${halfIndex} 条旧数据`);
      }
    }
  } catch (err) {
    console.error('检查文件大小时出错:', err);
  }
}

// 初始化时加载数据并清理过期数据
loadFromFile();
cleanupExpired();
// 检查文件大小
checkFileSizeAndCleanup();

// 定期清理过期数据（每周）
setInterval(cleanupExpired, 7 * 24 * 3600000);
// 定期检查文件大小（每周）
setInterval(checkFileSizeAndCleanup, 7 * 24 * 3600000);

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
    if (now - timestamp < 86400000 * 7) { // 24小时
      return true;
    }
  }
  
  // 设置或更新时间戳
  memoryStore.set(key, now);
  saveToFile();
  return false;
}
