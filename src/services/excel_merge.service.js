
/*
1、使用Google Auth调用Google接口读取google excel文档的内容
2、google excel文档有多个sheet，汇总多个sheet的数据
3、对汇总后的数据按日期列排序
4、使用Google Auth把排序后的内容写入新的sheet
5、那每天17:00汇总 ，周五的话14:00汇总(方便写周报)
*/           
import { google } from "googleapis";

const SPREADSHEET_ID = '1t1Ez6bDyRDnBvFPThvcNj1Tb0MmzebKzmvkRxaYmSfw';
const auth = new google.auth.GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({
  version: "v4",
  auth,
});


/**
 *读取多个sheet的数据
 *
 * @param {Array} sheetNames sheet名称
 * @return {Array} 汇总sheet后的数组
 */
async function read_mult_sheets(sheetNames) {
    
    const ranges = sheetNames.map(
        name => `${name}!A1:Z1000`
    );

    const res = await sheets.spreadsheets.values.batchGet({
        spreadsheetId: SPREADSHEET_ID,
        ranges: ranges
    });

    return res.data.valueRanges || [];
}

/**
 * 汇总多个sheet的数据
 * @param {Array} valueRanges 每个sheet的数据
 * @returns 
 */
function merge_sheets(valueRanges){
  const result = [];
  let headerWritten = false;

  for (const vr of valueRanges) {
    const values = vr.values || [];
    if (!Array.isArray(values) || values.length === 0) continue;

    const sheetName = vr.range.split("!")[0];
    const [header, ...rows] = values;

    if (!headerWritten && Array.isArray(header)) {
      result.push(["来源Sheet", ...header]);
      headerWritten = true;
    }

    for (const row of rows) {
      if (!Array.isArray(row)) continue;
      result.push([sheetName, ...row]);
    }
  }

  return result;
}

/**
 * 按照评审时间排序
 * @param {Array} values 
 * @param {int} dateColIndex 
 * @returns 
 */
function sort_by_review_time(values, dateColIndex){
    if(values.length <= 1) return values;

    const header = values[0];
    const rows = values.slice(1);

    rows.sort((a, b) => {
        const t1 = new Date(a[dateColIndex]).getTime() || 0;
        const t2 = new Date(b[dateColIndex]).getTime() || 0;
        return t2 - t1;
    });

    return [header, ...rows];
}

/**
 * 格式化要写入excel的数组
 * @param {Array} values 
 * @returns 
 */
function normal_values(values) {
  return values
    .filter(v => v != null)
    .map(row => {
      if (Array.isArray(row)) return row;
      return [String(row)];
    });
}

/**
 * 把排序后的数据写入目标excel
 * @param {string} spreadsheetId 
 * @param {string} targetSheet 
 * @param {Array} sorted 
 */
async function write_target_sheet(spreadsheetId, targetSheet, sorted){

  const safeValues = normal_values(sorted);

    // 4️⃣ 写入目标 Sheet（先清空再写）
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${targetSheet}!A:Z`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${targetSheet}!A1`,
    valueInputOption: "RAW",
    requestBody: {
      values: safeValues,
    },
  });

  console.log('完成excel数据更新');
}

export async function  merge_product_sheet() {
    
    const sourceSheets = ["版本周期2026", "Risk", "KOL", "Payment"];
    const DATE_COLUMN_INDEX = 6;

    const valueRanges = await read_mult_sheets(sourceSheets);
    // console.log('value ranges:', valueRanges);

    const merged = merge_sheets(valueRanges);
    // console.log('merged:', merged);

    const sorted = sort_by_review_time(merged, DATE_COLUMN_INDEX);
    
    write_target_sheet('1ap_2WKqn4D0Sxe0kWDTNaH25oMydvld3nQeRZzm2lJM', '123', sorted);
}