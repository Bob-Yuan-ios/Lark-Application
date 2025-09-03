import { 
    sendMaintainMessage
 } from "../../services/lark.service.js";

export default async function handleDocupdate(body) {
    console.log('接收到文档更新的script:', body);
    return await sendMaintainMessage(body);
}