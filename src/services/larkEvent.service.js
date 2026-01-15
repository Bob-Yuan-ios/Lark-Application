import { 
  dedupEvent
} from "../utils/dedup.js";

import { 
  client, 
  Templates
} from "../utils/larkClient.js";

export async function handleEventCallback(data) {
    console.log('handleEventCallback:', data);

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
    
    // const { event_id, retry_cnt } = data;
    // if (retry_cnt > 0 || await dedupEvent(event_id)) return;

    // 如果 message_id +  sender_id 匹配的是完成升级 弹框
    // 提示框，显示验收结论
    // 所有产品回复、确认后，完成验收
    console.log('handleEventAsync:', data);

    // 取出 message_id
    const messageId = data?.event?.message?.parent_id;
    if (!messageId) {
      console.warn('No message_id found');
      return { code: 0 };
    }

    console.log('message_id', messageId);

    try {
      // 获取消息内容
      const result = await client.im.message.get({
        path: {
          message_id: messageId
        }
      });

      let base64Content =
      result.data?.items?.[0]?.body?.content ||
      result.data?.body?.content ||
      result.data?.content;

      if (!base64Content) {
        console.warn('No message content found for:', messageId);
        console.log('Full result:', JSON.stringify(result, null, 2));
        return;
      }

     console.log('content is:', base64Content);

     
    } catch (err) {
      console.error('Failed to get message content:', err);
    }
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