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

    // const { event_id, retry_cnt, message, sender } = data;
    // const { chat_id, content } = message;
    // const msg = JSON.parse(content || '{}')?.text || '';
    // const open_id = sender?.sender_id?.open_id;  
    // if (msg.includes('文档更新通知')) {
    //   const redirectUrlTxt = 'https://docs.google.com/document/d/1vTr5gzR9SwkCUAZRXLNghyTlbpU4YR3VuftHrtH3cPY';
    //   await sendCard(chat_id, open_id, redirectUrlTxt);
    // } else {
    //   await sendText(chat_id, msg);
    // }

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
}