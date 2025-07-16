import { 
    robotSendCardMessage
 } from "../../services/lark.service.js";

export default async function handleDocupdate(body) {
    console.log('接收到文档更新的script');
    console.log(body);
    return await robotSendCardMessage(body);
}