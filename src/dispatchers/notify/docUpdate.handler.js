import { 
    sendMaintainMessage
 } from "../../services/lark.service.js";

export default async function handleDocupdate(body) {
    console.log('接收到升级通知:', body);
    return await sendMaintainMessage(body);
}