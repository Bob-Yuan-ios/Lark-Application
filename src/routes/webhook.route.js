import express from 'express';

import {
    handleWebhookEvent,
    handleWebhookCard
} from '../controllers/webhook.controller.js';

const larkwebhookRouter = express.Router();

larkwebhookRouter.post('/event', handleWebhookEvent);
larkwebhookRouter.post('/message-card', handleWebhookCard);

export default larkwebhookRouter;