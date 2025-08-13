import express from 'express';

import notifyRoutes from './src/routes/notify.route.js';
import larkwebhookRouter from './src/routes/webhook.route.js';
import debugRoutes from './src/routes/debug.route.js';

import httpLogger from './src/middlewares/logger.js';
import errorHandler from './src/middlewares/errorHandler.js';

const app = express();
app.use(express.json());
app.use(httpLogger);

app.use('/notify', notifyRoutes);
app.use('/webhook', larkwebhookRouter);
app.use('/debug', debugRoutes);

app.use(errorHandler);

export default app