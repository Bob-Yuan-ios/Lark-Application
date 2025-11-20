import fs from "fs";
import path from "path";

import { google } from "googleapis";
import { GoogleAuth } from 'google-auth-library';

import { 
    client, 
    Templates
} from '../utils/larkClient.js';


/**
 * 检查文档改动内容改动
 * 遍历excel 每个sheet，分别输出sheet改变的内容
 */
export function checkChanges() {
  const file_path = get_file_path("config_data.json");
  const spreads = loadSnapshot(file_path);
  spreads.SHEET_RANGE.forEach(async item => {
    const spreadsheetId = spreads.SPREADSHEET_ID;
    await diffData(spreadsheetId, item);
  });
}

/**
 * 具体的比对sheet
 * 拉取最新数据，拉取本地缓存快照数据
 * 如果本地没有缓存快照数据，则缓存快照数据，然后不提示
 * 本地缓存快照和最新数据一致，日志输入没有检测到改版
 * 本地缓存快照和最新数据不一致，汇总不一致的数据，发送lark卡片消息
 * @param {string} spreadsheetId  execel id
 * @param {string} sheet_range    excel sheet name
 * @returns 
 */
async function diffData(spreadsheetId, sheet_range) {
  try {
        const newData = await fetchSheetValues(spreadsheetId, sheet_range);

        const file_name = spreadsheetId + sheet_range + ".json";
        console.log('file_name is:', file_name);
        const file_path = get_file_path(file_name);
        const oldData = loadSnapshot(file_path);
        if(oldData.length === 0) {
          console.log("✅ No saved data.");
          saveSnapshot(file_path, newData);
          return [];
        }
        
        const changes = diffSheets(oldData, newData);
        if (changes.length > 0) {
          console.log("🔄 Detected changes:");

          const result = formatChangesAsGroupedTable(changes);
        
          const sheet_url = 'https://docs.google.com/spreadsheets/d/' + spreadsheetId;
          await sendLarkSheetCardMessage(sheet_url, sheet_range, result);
        } else {
          console.log("✅ No changes detected.");
        }
        saveSnapshot(file_path, newData);
        return changes;

      } catch (err) {
        console.error("❌ Error checking sheet:", err.message);
        return [];
      }
}

/**
 * 方式一：本地开发无需 JSON key，用 gcloud ADC
 * 文件路径：~/.config/gcloud/application_default_credentials.json
 * 
 * 方式二：可通过配置api_key实现接口调用
 * 需要给api_key配置好访问权限
 * @returns excel内容转换为数组
 */
async function fetchSheetValues(spreadsheetId, range) {
  // 使用gcloud ADC实现鉴权
  // const authOptions = {
  //   scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  // };
  // const auth = new GoogleAuth(authOptions);

  // // const auth = await google.auth.getClient({
  // //   scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
  // // });
  // const sheets = google.sheets({ version: "v4", auth });

  // 使用 API Key 直接调用Google sheet api
  const sheets = google.sheets({
    version: "v4",
    auth: process.env.SHEET_API_KEY
  });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: range,
  });

  return res.data.values || [];
}


/**
 * 获取文件的绝对路径
 * @param {string} file_name 文件名
 * @returns 
 */
function get_file_path(file_name){
  const __dirname = path.dirname(new URL(import.meta.url).pathname);
  const file_path = path.join(__dirname, "../resource", file_name);
  console.log('file_path is:', file_path);
  return file_path;
}

/**
 * 保存最新快照
 * @param {string} file_name 快照名称
 * @param {json} data 快照内容
 */
function saveSnapshot(file_name, data) {
  fs.writeFileSync(file_name, JSON.stringify(data, null, 2));
}

/**
 * 读取本地缓存快照
 * @param {string} file_name 快照名称
 * @returns 
 */
function loadSnapshot(file_name) {

  if (!fs.existsSync(file_name)) {
    console.log('文件不存在，返回安全的默认值');
    return {};
  }

  try {
    const content = fs.readFileSync(file_name, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    console.error("Config load error:", err);
    return {}; // 返回安全的默认值
  }
}



/**
 * 对比表单数据
 * @param {json} oldData 
 * @param {json} newData 
 * @returns 
 */
function diffSheets(oldData, newData) {
  const changes = [];
  const maxRows = Math.max(oldData.length, newData.length);

  for (let i = 0; i < maxRows; i++) {
    const oldRow = oldData[i] || [];
    const newRow = newData[i] || [];
    const maxCols = Math.max(oldRow.length, newRow.length);

    for (let j = 0; j < maxCols; j++) {
      const oldVal = oldRow[j] || "";
      const newVal = newRow[j] || "";
      if (oldVal !== newVal) {
        changes.push({
          row: i + 1,
          col: j + 1,
          old: oldVal,
          new: newVal,
        });
      }
    }
  }
  return changes;
}

/**
 * 表单格式化的方式输出改动内容
 * @param {string} changes 改动内容
 * @returns 
 */
function formatChangesAsGroupedTable(changes) {
  if (!Array.isArray(changes) || changes.length === 0) {
    return "✅ 未检测到有效变更。";
  }

  // 按行号分组
  const grouped = {};
  for (const c of changes) {
    if (c.row == null || c.col == null) continue;
    const rowKey = String(c.row);
    if (!grouped[rowKey]) grouped[rowKey] = [];
    grouped[rowKey].push(c);
  }

  const rows = Object.keys(grouped)
    .sort((a, b) => Number(a) - Number(b))
    .map((row) => {
      const colChanges = grouped[row]
        .map((c) => {
          const oldVal = c.old != null ? String(c.old) : "";
          const newVal = c.new != null ? String(c.new) : "";
          let type = "";
          let content = "";

          if (!oldVal && newVal) {
            type = "新增";
            content = `C${c.col}: → ${newVal}`;
          } else if (oldVal && !newVal) {
            type = "删除";
            content = `C${c.col}: ${oldVal} → `;
          } else if (oldVal !== newVal) {
            type = "修改";
            content = `C${c.col}: ${oldVal} → ${newVal}`;
          }

          return type ? `${type} ${content}` : null;
        })
        .filter(Boolean)
        .join(";  ");

      return { row, changes: colChanges || "" };
    })
    .filter(r => r.changes); // 只保留有变化的行

  if (rows.length === 0) return "✅ 未检测到有效变更。";

  // 计算列宽
  const rowWidth = Math.max(...rows.map(r => (r.row ? r.row.length : 0)), "行号".length);
  const changeWidth = Math.max(...rows.map(r => (r.changes ? r.changes.length : 0)), "变更内容".length);

  const pad = (s, len) => String(s).padEnd(len, " ");

  // 构建表格
  const header = `${pad("行号", rowWidth)} | ${pad("变更内容", changeWidth)}`;
  const separator = `${"-".repeat(rowWidth)}-+-${"-".repeat(changeWidth)}`;
  const body = rows.map(r => `${pad(r.row, rowWidth)} | ${r.changes}`).join("\n");

  // return `📊 **Google Sheet 内容变更**\n\`\`\`\n${header}\n${separator}\n${body}\n\`\`\``;
    return `${header}\n${separator}\n${body}`;  
}

/**
 * 把改动内容发到到lark卡片消息
 * @param {string} sheet_url      excel完整的url
 * @param {string} sheet_range    具体有改动的sheet名
 * @param {json}   content        具体改动的内容
 * @returns 
 */
async function sendLarkSheetCardMessage(sheet_url, sheet_range, content) {
  console.log('lark content:', content);
  // 模版变量
  const template_variable = {
    sheet_url: sheet_url,
    sheet_range: sheet_range,
    content: content,  
  };

  //消息体参数
  const body = {
    receive_id: process.env.RECEIVE_ID,
    template_id: Templates.sheet_update,
    template_variable: template_variable
  };

  const res = await client.im.message.createByCard({
    params: {
      receive_id_type: 'chat_id'
    },
    data: body
  });

  if (res.code === 0) {
      console.log('✅ 卡片消息发送成功:', res.data);
  }else{
      console.log('✅ 卡片消息发送失败:', res.code);
  }

  return {code: 0};
}