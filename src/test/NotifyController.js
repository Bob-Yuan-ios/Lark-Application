import * as robot from '../utils/robotservice.js';
 
import  express from 'express';

export class NotifyController {

    constructor({ robot, tokenRef}) {
        this.robot = robot;
        this.tokenRef = tokenRef;
    }

    async handle(req, res){

        try{
            const body = express.json(req);   
            console.log('收到Google App Script参数==:', body);    

            let result;
            if(this.tokenRef.value.trim().length > 0){
                console.log('tenant-token非空');
                result = await this.sendMessage(body);
                // 待补充逻辑：如果拿到的值是token过期，需要刷新token
                if(result.code != 0){
                    // token过期
                    this.tokenRef.value = await robot.updateToken();
                    console.log('更新token:', this.tokenRef.value);
                    await this.sendMessage(body);
                }
            }
            else{
                this.tokenRef.value = await robot.updateToken();
                console.log('获取token:', this.tokenRef.value);
                await this.sendMessage(body);
            }

                res.writeHead(200, {
                'Content-Type': 'application/json; charset=utf-8'
                });
                res.end(JSON.stringify({
                code: 200
            }));

        }
        catch(err){

            console.error('处理异常:', err);
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ code: 500, msg: '服务器异常' }));
        }
    }


    async sendMessage(body){
    
        if(this.tokenRef.value.trim().length == 0) return {code : '0'};
        
        const params = {
                method : 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    Authorization: `Bearer ${this.tokenRef.value}` 
                },
                body   : JSON.stringify(body)
            };
                
        // 全局 fetch 已内置，无需安装
        const url = 'https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id';
        const response = await fetch(url, params);
        // 如果响应就是 JSON，可以直接：
        const result = await response.json();
        console.log('lark反馈模版消息结果：', result);
        try{
            const mentions = JSON.stringify(result.data.mentions);
            if(mentions){
                console.log('mentions id:', mentions);
                robot.saveMentions(JSON.parse(mentions));
            }
            return result;
        }catch(err){
            console.log(JSON.stringify(err));
            return false;
        }    
    }
}