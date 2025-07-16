import express from 'express';

import { 
    handleNotify 
} from '../controllers/notify.controller.js';

const notifyRouter = express.Router();
notifyRouter.post('/', handleNotify);

export default notifyRouter;