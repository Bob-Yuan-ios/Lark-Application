import { sendTextMessage } from "../../services/lark.service.js";

export default async function handleDocupdate(body) {
    return await sendTextMessage(body);
}