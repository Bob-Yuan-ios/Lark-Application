import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const DEBOUNCE_DELAY = 1000;

class PersistentMap {
  constructor(name) {
    this.map = new Map();
    this.name = name;
    this.filePath = path.join(DATA_DIR, `${name}.json`);
    this.debounceTimer = null;
    this.pendingSave = false;
    
    this.ensureDataDir();
    this.loadFromFile();
  }

  ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  loadFromFile() {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(data);
        
        for (const [key, value] of Object.entries(parsed.data || {})) {
          if (Array.isArray(value) && value.length > 0 && Array.isArray(value[0])) {
            this.map.set(key, new Map(value));
          } else if (Array.isArray(value)) {
            this.map.set(key, new Set(value));
          } else {
            this.map.set(key, value);
          }
        }
        
        console.log(`✅ 加载 ${this.name} 数据成功，共 ${this.map.size} 条记录`);
      } else {
        console.log(`ℹ️  ${this.name} 数据文件不存在，使用空 Map`);
      }
    } catch (error) {
      console.error(`❌ 加载 ${this.name} 数据失败:`, error.message);
      console.log(`ℹ️  使用空 Map 初始化 ${this.name}`);
    }
  }

  saveToFile() {
    try {
      const data = {};
      
      for (const [key, value] of this.map.entries()) {
        if (value instanceof Map) {
          data[key] = Array.from(value.entries());
        } else if (value instanceof Set) {
          data[key] = Array.from(value);
        } else {
          data[key] = value;
        }
      }
      
      const saveData = {
        data,
        savedAt: Date.now()
      };
      
      fs.writeFileSync(this.filePath, JSON.stringify(saveData, null, 2), 'utf8');
      console.log(`💾 保存 ${this.name} 数据成功，共 ${this.map.size} 条记录`);
    } catch (error) {
      console.error(`❌ 保存 ${this.name} 数据失败:`, error.message);
    }
  }

  scheduleSave() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(() => {
      this.saveToFile();
      this.debounceTimer = null;
      this.pendingSave = false;
    }, DEBOUNCE_DELAY);
    
    this.pendingSave = true;
  }

  set(key, value) {
    this.map.set(key, value);
    this.scheduleSave();
  }

  get(key) {
    return this.map.get(key);
  }

  has(key) {
    return this.map.has(key);
  }

  delete(key) {
    this.map.delete(key);
    this.scheduleSave();
  }

  clear() {
    this.map.clear();
    this.scheduleSave();
  }

  get size() {
    return this.map.size;
  }

  forEach(callback) {
    this.map.forEach((value, key) => {
      callback(value, key, this);
    });
  }

  keys() {
    return this.map.keys();
  }

  values() {
    return this.map.values();
  }

  entries() {
    return this.map.entries();
  }

  forceSave() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.saveToFile();
    this.pendingSave = false;
  }
}

export { PersistentMap };
