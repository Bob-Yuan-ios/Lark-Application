
import { handleCardCallback } from "../../services/lark.service.js";

export default async function handleCard(body) {
    console.log('处理lark按钮点击消息');
    return await handleCardCallback(body);
}