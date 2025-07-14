import express from 'express';
import * as lark from '@larksuiteoapi/node-sdk';

import * as robot from './src/utils/robotservice.js';
import { NotifyController  } from './src/controllers/NotifyController.js';

const eventDispatcher = new lark.EventDispatcher({ 
    verificationToken: robot.verificationToken
}).register({'im.message.receive_v1': async (data) => {
        setImmediate(() => robot.handleEvent(data));
        return { code: 0 };                       
    }
});

const messageCardHandler = new lark.CardActionHandler({
    verificationToken: robot.verificationToken
}, async (data) => {
    setImmediate(() => robot.handleCard(data));
    return { code: 0 }; 
});

const app = express(); 

// 挂载 Lark webhook 事件
app.post('/webhook/event', lark.adaptExpress(eventDispatcher, { autoChallenge: true }));
app.post('/webhook/message-card',lark.adaptExpress( messageCardHandler, { autoChallenge: true }));

// 挂载自定义通知接口
const tokenRef = { value: '' };
const controller = new NotifyController({ robot, tokenRef });
app.post('/notify', (req, res) => controller.handle(req, res));

// 启动服务
const SERVER_PORT = 3000;
app.listen(SERVER_PORT, () => {
  console.log(`🚀 Express 服务已启动，端口 ${SERVER_PORT}`);
});
 