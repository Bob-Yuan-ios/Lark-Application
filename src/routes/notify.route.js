/*
notify接口
响应 word/excel等事件
*/
import express from 'express';
import { handleNotify } from '../controllers/notify.controller.js';

const notifyRouter = express.Router();
notifyRouter.post('/', handleNotify);

export default notifyRouter;