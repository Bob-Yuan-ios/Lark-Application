import {
    sendText
} from '../../services/larkEvent.service.js';

export default async function handleExcelUpdate(body) {
    console.log("接收到excel文档更新事件:", body);

    const chat_id = body.receive_id;
    const msg = body.content;
    return await sendText(chat_id, msg);
}