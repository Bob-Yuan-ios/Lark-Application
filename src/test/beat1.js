import http from 'http';
import * as lark from '@larksuiteoapi/node-sdk';

import {parseBody} from './src/utils/network.js';
import * as robot from './src/utils/robotservice.js';

import * as Test from './src/utils/test.js';

import express from 'express';

import { NotifyController  } from './src/controller/NotifyController.js';

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

// const SERVER_PORT = 3000;
// const server = http.createServer();
// server.on('request', lark.adaptDefault('/webhook/event', eventDispatcher, { autoChallenge: true }));
// server.on('request', lark.adaptDefault('/webhook/message-card', messageCardHandler, { autoChallenge: true }));

// const tokenRef = { value: '' };
// const controller = new NotifyController({ robot, tokenRef });
// server.on('request', async(req, res) => {
//     console.log('🔵 收到请求:', req.method, req.url); // ✅ 这句一定要加
//     const handled = await controller.handle(req, res);
//     if(!handled){
//         res.writeHead(404);
//     }
// });

// server.listen(SERVER_PORT, ()=>{    
//     console.log(`The service started successfully, port ${SERVER_PORT}`);
// });

/*
  // // 只处理 POST /notify 请求
    // const url = new URL(req.url, `http://${req.headers.host}`);

    // if (req.method === 'POST' && url.pathname === '/notify') {

    //     try{

    //         const body = await parseBody(req);   
    //         console.log('收到Google App Script参数:', body);    

    //         let result;
    //         if(TENANT_ACCESS_TOKEN.trim().length > 0){
    //             console.log('tenant-token非空');
    //             result = await sendMessage(body);
    //             // 待补充逻辑：如果拿到的值是token过期，需要刷新token
    //             if(result.code != 0){
    //                 // token过期了
    //                 TENANT_ACCESS_TOKEN = await robot.updateToken();
    //                 console.log('更新token:', TENANT_ACCESS_TOKEN);
    //                 await sendMessage(body);
    //             }
    //         }else{
    //             TENANT_ACCESS_TOKEN = await robot.updateToken();
    //             console.log('获取token:', TENANT_ACCESS_TOKEN);
    //             await sendMessage(body);
    //         }

    //         res.writeHead(200, {
    //             'Content-Type': 'application/json; charset=utf-8'
    //         });
    //         res.end(JSON.stringify({
    //             'code': '200'
    //         }));

    //     }catch(err){
    //         console.error('处理请求异常:', err);

    //         res.writeHead(500, {
    //             'Content-Type': 'application/json; charset=utf-8'
    //         });
    //         res.end(JSON.stringify({ code: 500, msg: '服务器异常' }));
    //     }
    // }  
*/

// async function sendMessage(body){

//     if(tokenRef.value.trim().length == 0) return {code : '0'};
    
//     const params = {
//             method : 'POST',
//             headers: { 
//                 'Content-Type': 'application/json', 
//                 Authorization: `Bearer ${TENANT_ACCESS_TOKEN}` 
//             },
//             body   : JSON.stringify(body)
//         };
            
//     // 全局 fetch 已内置，无需安装
//     const url = 'https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id';
//     const response = await fetch(url, params);
//     // 如果响应就是 JSON，可以直接：
//     const result = await response.json();
//     console.log('lark反馈模版消息结果：', result);
//     const mentions = JSON.stringify(result.data.mentions);
//     if(mentions){
//         console.log('mentions id:', mentions);
//         robot.saveMentions(JSON.parse(mentions));
//     }

//     return result;
// }

// Test.test();