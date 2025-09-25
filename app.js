import express from 'express';

import notifyRouter from './src/routes/notify.route.js';
import larkwebhookRouter from './src/routes/webhook.route.js';
import debugRouter from './src/routes/debug.route.js';

import httpLogger from './src/middlewares/logger.js';
import errorHandler from './src/middlewares/errorHandler.js';

const app = express();
app.use(express.json());
app.use(httpLogger);

app.use('/notify', notifyRouter);
app.use('/webhook', larkwebhookRouter);
app.use('/debug', debugRouter);

app.use(errorHandler);

export default app