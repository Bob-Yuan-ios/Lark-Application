import express from 'express';

import jiraRouter from './src/routes/jira.route.js';
import notifyRouter from './src/routes/notify.route.js';
import larkwebhookRouter from './src/routes/webhook.route.js';
import debugRouter from './src/routes/debug.route.js';

import httpLogger from './src/middlewares/logger.js';
import errorHandler from './src/middlewares/errorHandler.js';

import cron from 'node-cron';

import {
  notifyProdCompleteTask
} from './src/services/larkCard.service.js';

import {
  merge_product_sheet
} from './src/services/excel_merge.service.js';

const app = express();
app.use(express.json());
app.use(httpLogger);

app.use('/jira', jiraRouter);
app.use('/notify', notifyRouter);
app.use('/webhook', larkwebhookRouter);
app.use('/debug', debugRouter);

app.use(errorHandler);

// 每天 9:00（Asia/Shanghai = UTC+8）分/时/日/月/年
// 检查漏提醒验收
cron.schedule('0 9 * * *', async () => {
  console.log('执行任务：每天早上 9 点（UTC+8）');
    notifyProdCompleteTask();
}, {
  timezone: "Asia/Shanghai"
});


// 周一到周四 17:00
cron.schedule('55 17 * * 1-4', () => {
  console.log('📅 周一到周四 17:00 执行');
  merge_product_sheet();
}, {
  timezone: 'Asia/Shanghai'
});

// // 周五 14:00
// cron.schedule('0 14 * * 5', () => {
//   console.log('📅 周五 14:00 执行');
//   merge_product_sheet();
// }, {
//   timezone: 'Asia/Shanghai'
// });
 
  merge_product_sheet();

  
export default app