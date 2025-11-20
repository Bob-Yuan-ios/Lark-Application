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
   lark_test
} from './test/lark.test.js';

const app = express();
app.use(express.json());
app.use(httpLogger);

app.use('/notify', notifyRouter);
app.use('/webhook', larkwebhookRouter);
app.use('/debug', debugRouter);

app.use(errorHandler);

// // 每天 9:00（Asia/Shanghai = UTC+8）分/时/日/月/年
// // 检查漏提醒验收
// cron.schedule('50 10 * * *', async () => {
//   console.log('执行任务：每天早上 9 点（UTC+8）');
//     notifyProdCompleteTask();
// }, {
//   timezone: "Asia/Shanghai"
// });

lark_test();

export default app