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
    initProcessWithProdManMentions,
    initProcessWithMaintainMentions
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

    console.log('发送升级消息:', data);

    const {
        operator: { open_id },
        context: { open_chat_id, open_message_id },
        action: {
            value: { titleTxt, redirectUrlTxt }
        }
    } = data.event;

    // 消息去重
    const cardKey = open_chat_id + open_message_id + open_id;
    if(await dedupCard(cardKey)) return;

   // 需要写回去的新变量值
    let users = processDoneTask(String(open_id), open_message_id);
    if (users === '') {
        return { code: 0 };
    }

    const timeStr = dayjs().format('YYYY-MM-DD HH:mm');
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
    console.log('doneTaskOpenId.', doneTaskOpenId);
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
 * 发送 提示运维升级弹框
 * @param {JSON} payload 
 * @returns 
 */
export async function sendMaintainMessage(payload) {
    console.log('发送升级消息:', payload);

    // 所有产品，完成验收后，需要通知的成员
    let prodMentionIds = payload.prodUser;
    if(prodMentionIds != undefined && prodMentionIds != null){
        delete payload.prodUser;
    }

    // 需要通知的产品
    const res = await client.im.message.createByCard({
        params: {
            receive_id_type: 'chat_id'
        },
        data: payload
    });

    if (res.code === 0) {
        console.log('✅ 升级消息发送成功:', res.data);

        if (cached && res.data.mentions) {
            console.log('找到缓存升级消息');
            initProcessWithMaintainMentions(res.data.mentions, res.data.message_id, prodMentionIds);
        }else{
            console.log("没有缓存的升级消息");
        }
    }

    return {code: 0};
}

/**
 * 发送卡片消息
 * @param {JSON} payload 卡片内容
 * @param {bool} cached  是否需要缓存mention用户列表
 * @returns 
 */
export async function sendCardMessage(payload, cached = false) {

    console.log('发送卡片消息:', payload);

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
            console.log('缓存卡片消息');
            initProcessWithProdManMentions(res.data.mentions, res.data.message_id, doneTaskOpenId);
        }else{
            console.log("没有缓存卡片消息");
        }
    }

    return {code: 0};
}