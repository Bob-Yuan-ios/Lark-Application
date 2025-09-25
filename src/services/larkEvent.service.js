import { 
  dedupEvent
} from "../utils/dedup.js";

import { 
  client, 
  Templates
} from "../utils/larkClient.js";

export async function handleEventCallback(data) {
    if (data.type === 'url_verification') return { challenge: data.challenge };
    setImmediate(() => handleEventAsync(data));
    return { code: 0 };
}

/**
 * 异步响应事件
 * @param {string} data 
 * @returns 
 */
async function handleEventAsync(data) {
    
    const { event_id, retry_cnt } = data;
    if (retry_cnt > 0 || await dedupEvent(event_id)) return;

}

async function sendCard(chat_id, open_id, redirectUrlTxt) {
  await client.im.message.createByCard({
    params: { receive_id_type: 'chat_id' },
    data: {
      receive_id: chat_id,
      template_id: Templates.start,
      template_variable: {
        redirectUrl: redirectUrlTxt,
        redirectUrlTxt: redirectUrlTxt,
        mentionUser: `<at id="${open_id}"></at>`
      }
    }
  });
  return { code: 0 };
}

export async function sendText(chat_id, text) {
  await client.im.message.create({
    params: { receive_id_type: 'chat_id' },
    data: {
      receive_id: chat_id,
      msg_type: 'text',
      content: JSON.stringify({ text })
    }
  });
   return { code: 0 };
}