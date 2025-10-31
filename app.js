import express from 'express';

import notifyRouter from './src/routes/notify.route.js';
import larkwebhookRouter from './src/routes/webhook.route.js';
import debugRouter from './src/routes/debug.route.js';

import httpLogger from './src/middlewares/logger.js';
import errorHandler from './src/middlewares/errorHandler.js';

import checkChanges from './src/long-task/check-excel-update.js';

const app = express();
app.use(express.json());
app.use(httpLogger);

app.use('/notify', notifyRouter);
app.use('/webhook', larkwebhookRouter);
app.use('/debug', debugRouter);

app.use(errorHandler);



// // 定时任务：每分钟检查
// setInterval(async () => {
//   await checkChanges();
// }, 60 * 1000);

  await checkChanges();

  
export default app