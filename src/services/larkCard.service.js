import dayjs from 'dayjs';

import { 
    dedupCard
} from '../utils/dedup.js';

import { 
    client, 
    Templates
} from '../utils/larkClient.js';

import { 
    isCompleteTask,
    processDoneTask, 
    initProcessWithMentions
} from '../utils/processCard.js';


export async function handleCardCallback(data) {
  if (data.type === 'url_verification') return { challenge: data.challenge };

  setImmediate(()=> handCardAsync(data));
  return { code: 0 };
}

/**
 * 异步响应卡片点击事件
 * @param {JSON} data 
 * @returns 
 */
async function handCardAsync(data) {

    const {
        operator: { open_id },
        context: { open_chat_id, open_message_id },
        action: {
            value: { titleTxt, redirectUrlTxt }
        }
    } = data.event;

    // 消息去重
    const cardKey = open_chat_id + open_message_id + open_id;
    if(dedupCard(cardKey)) return;

   // 需要写回去的新变量值
    let users = processDoneTask(String(open_id), open_message_id);
    if (users === '') {
        return { code: 0 };
    }

    const timeStr = dayjs().format('YYYY-MM-DD HH:mm');
    console.log(timeStr);

    const params = {
        users: users,    
        timeStr: timeStr,  
        titleTxt: titleTxt,
        redirectUrl: redirectUrlTxt,
        redirectUrlTxt: redirectUrlTxt
    };

    const body = {
        receive_id: open_chat_id,
        template_id: Templates.process,
        template_variable: params
        };
    await sendCardMessage(body);

    const doneTaskOpenId = isCompleteTask(open_message_id);
    if( doneTaskOpenId.trim() !== ''){
        const template_variable = {
            timeStr: timeStr,  
            titleTxt: titleTxt,
            mentionUser: `<at id="${doneTaskOpenId}"></at>`
        };

        const body = {
            receive_id: open_chat_id,
            template_id: Templates.done,
            template_variable: template_variable
        };
        await sendCardMessage(body);
    }
}

/**
 * 发送卡片消息
 * @param {JSON} payload 卡片内容
 * @param {bool} cached  是否需要缓存mention用户列表
 * @returns 
 */
export async function sendCardMessage(payload, cached = false) {

    console.log('发送卡片消息:', payload);
    console.log(payload);

    let doneTaskOpenId;
    if(cached){
        doneTaskOpenId = payload.doneUser;
        delete payload.doneUser;
    }

    const res = await client.im.message.createByCard({
        params: {
            receive_id_type: 'chat_id'
        },
        data: payload
    });

    if (res.code === 0) {
        console.log('✅ 卡片消息发送成功:', res.data);

        if (cached && res.data.mentions) {
            initProcessWithMentions(res.data.mentions, res.data.message_id, doneTaskOpenId);
        }
    }

    return {code: 0};
}