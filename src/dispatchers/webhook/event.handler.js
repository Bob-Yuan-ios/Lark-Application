import {  
    handleEventCallback 
} from '../../services/lark.service.js';

export default async function handleEvent(body) {
    console.log('处理lark事件消息');
    return await handleEventCallback(body);
}