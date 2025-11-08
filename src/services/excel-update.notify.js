import fs from "fs";
import { google } from "googleapis";
import { GoogleAuth } from 'google-auth-library';

import { 
    client, 
    Templates
} from '../utils/larkClient.js';

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

// 加载快照
function loadSnapshot(file_name) {
  if (fs.existsSync(file_name)) {
    return JSON.parse(fs.readFileSync(file_name, "utf-8"));
  }
  return [];
}

// 保存快照
function saveSnapshot(file_name, data) {
  fs.writeFileSync(file_name, JSON.stringify(data, null, 2));
}

// 对比新旧数据差异
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

// 主逻辑：检查改动
export default function checkChanges() {
  const spreads = JSON.parse(process.env.SPREADS);
  spreads.forEach(item => {
      const spreadsheetId = item.SPREADSHEET_ID;
      const sheet_range = item.SHEET_RANGE;
      diffData(spreadsheetId, sheet_range);
  });
}


async function diffData(spreadsheetId, sheet_range) {
  try {
        const newData = await fetchSheetValues(spreadsheetId, sheet_range);

        const file_name = spreadsheetId + sheet_range + ".json";
        const oldData = loadSnapshot(file_name);
        if(oldData.length === 0) {
          console.log("✅ No saved data.");
          saveSnapshot(file_name, newData);
          return [];
        }
        
        const changes = diffSheets(oldData, newData);
          if (changes.length > 0) {
            console.log("🔄 Detected changes:");

            // // 发送lark消息
            const result = formatChangesAsGroupedTable(changes);
          
            const sheet_url = 'https://docs.google.com/spreadsheets/d/' + spreadsheetId;
            await sendLarkSheetCardMessage(sheet_url, sheet_range, result);
          } else {
            console.log("✅ No changes detected.");
          }
        saveSnapshot(file_name, newData);
        return changes;

      } catch (err) {
        console.error("❌ Error checking sheet:", err.message);
        return [];
      }
}

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
      receive_id: 'oc_7574fa5ed3641b0d3381a7a1afcdf643',
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