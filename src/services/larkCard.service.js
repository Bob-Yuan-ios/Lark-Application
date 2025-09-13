import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

import { 
    dedupCard
} from '../utils/dedup.js';

import { 
    client, 
    Templates
} from '../utils/larkClient.js';

import { 
    initProcessWithProdMentions,
    isCompleteTask,
    processDoneTask, 
    initProcessWithMaintainMentions,
    processMaintainCompleteTask,
    isCompleteMaintain
} from '../utils/processCard.js';


dayjs.extend(utc);
dayjs.extend(timezone);


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

    console.log('响应卡片点击:', data);

    const {
        operator: { open_id },
        context: { open_chat_id, open_message_id },
        action: {
            value: { titleTxt, redirectUrlTxt, isMaintain,updateContent, maintainUser }
        }
    } = data.event;

    // 消息去重
    const cardKey = open_chat_id + open_message_id + open_id;
    if(await dedupCard(cardKey)) return;

    console.log('isMaintain is:', isMaintain);
    if(isMaintain){
        // 处理的是运维弹框
        let innerMap = processMaintainCompleteTask(String(open_id), open_message_id);   
        console.log("innerMap 内容:", Array.from(innerMap.entries()));

        if (Array.from(innerMap.entries()).length === 0) {
            return { code: 0 };
        }

        let prodIds = innerMap.get("prodIds");
        let doneId = innerMap.get("doneId");
        let deadline = innerMap.get('deadline');

        const timeStr =  dayjs().tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm [UTC+8]');
        const params = {
            timeStr:        timeStr,  
            redirectUrl:    redirectUrlTxt ,
            redirectUrlTxt: redirectUrlTxt,
            titleTxt:       titleTxt,
            deadline:       deadline,
            mentionUser:    prodIds,
        };

        const body = {
           doneUser:  doneId,
            msg_type  : 'interactive',
            receive_id: open_chat_id,
            template_id: Templates.maintain,
            template_variable: params
        };
        await sendCardMessage(body, true);
        isCompleteMaintain(open_message_id);

        await updateMaintainCard(titleTxt, updateContent, maintainUser, open_message_id);
        return { code: 0 };
    }


    // 处理的是升级弹框
   // 需要写回去的新变量值
    let users = processDoneTask(String(open_id), open_message_id);
    if (users === '') {
        return { code: 0 };
    }

    const timeStr = dayjs().tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm [UTC+8]');
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
    
    // 发过去也不会返回，需要保存 所有产品，完成验收后，需要通知的成员
    let prodMentionIds = payload.mentionUser;
    delete payload.mentionUser;
        
    let doneTaskOpenId = payload.doneUser;
    delete payload.doneUser;

    let deadline = payload.deadline;

    // 通知运维
    const res = await client.im.message.createByCard({
        params: {
            receive_id_type: 'chat_id'
        },
        data: payload
    });

    if (res.code === 0) {
        console.log('✅ 升级消息发送成功:', res.data);
        initProcessWithMaintainMentions(res.data.mentions, res.data.message_id, prodMentionIds, doneTaskOpenId, deadline);
    }

    return {code: 0};
}


/**
 * 更新运维人员卡片， 按钮设置为不可点击
 * @param {string} titleTxt 
 * @param {string} updateContent 
 * @param {string} mentionUser 
 * @param {string} maintainUser 
 * @param {string} open_message_id 
 * @returns 
 */
async function updateMaintainCard(titleTxt, updateContent, maintainUser, open_message_id) {

    const updatedCard = {
        "config": {
            "update_multi" : true,
            "wide_screen_mode" : true
        },
        "header": {
            "template": "blue",
            "title": {
                "content": `📢  ${titleTxt}`,
                "tag": "plain_text"
            }
        },
        "elements": [
            {
                "tag": "div",
                "text": {
                    "content": `${updateContent}`,
                    "tag": "lark_md"
                }
            },
            {
                "tag": "hr"
            },
            {
                "tag": "div",
                "text": {
                    "content": `**升级人员：**\n${maintainUser} `,
                    "tag": "lark_md"
                }
            },
            {
              "tag": "hr"
            },
           {
                "tag": "action",
                "layout": "bisected",
                "actions": [
                    {
                        "tag": "button",
                        "text": {
                            "tag": "plain_text",
                            "content": "已完成升级"
                        },
                        "type": "default",
                        "multi_url": {
                            "url": "",
                            "pc_url": "",
                            "android_url": "",
                            "ios_url": ""
                        }
                    }
                ]
            }
        ]
    };


    await client.im.message.patch({
        path: { message_id: open_message_id }, 
        data: { content: JSON.stringify(updatedCard) }
    });

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
            initProcessWithProdMentions(res.data.mentions, res.data.message_id, doneTaskOpenId);
        }else{
            console.log("没有缓存卡片消息");
        }
    }

    return {code: 0};
}
