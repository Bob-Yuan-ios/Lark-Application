import express from 'express';

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
   checkChanges
} from './src/services/excel-update.notify.js';

const app = express();
app.use(express.json());
app.use(httpLogger);

app.use('/notify', notifyRouter);
app.use('/webhook', larkwebhookRouter);
app.use('/debug', debugRouter);

app.use(errorHandler);

// // 定时任务：每分钟检查
// setInterval(async () => {
//   notifyProdCompleteTask();
// }, 60 * 1000);

// 每天 9:00（Asia/Shanghai = UTC+8）分/时/日/月/年
// 检查漏提醒验收
// cron.schedule('0 9 * * *', async () => {
//   console.log('执行任务：每天早上 9 点（UTC+8）');
//     notifyProdCompleteTask();
// }, {
//   timezone: "Asia/Shanghai"
// });

// 检查文档更新
checkChanges();


export default app