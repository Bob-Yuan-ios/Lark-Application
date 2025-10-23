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
 * 一、升级流程
 * 升级弹框：
 * 先更新运维完成升级
 * 然后判断是否需要验收
 * 不需要验收则弹框提示升级完成
 * 二、 验收流程
 * 验收弹框：
 * 先更新特定产品完成验收
 * 然后判断是否全部产品已完成验收
 * 全部完成则弹框提示验收完成
 * @param {JSON} data 
 * @returns 
 */
async function handCardAsync(data) {

    console.log('响应卡片点击:', data);

    const {
        operator: { open_id },
        context: { open_chat_id, open_message_id },
        action: {
            value: { titleTxt, redirectUrlTxt, isMaintain, updateContent, maintainUser, timeStr, mentionUser, deadline }
        }
    } = data.event;

    // 消息去重
    const cardKey = open_chat_id + open_message_id + open_id;
    if(await dedupCard(cardKey)) return;


    console.log('isMaintain is:', isMaintain);
    if(isMaintain){
        // 处理的是升级弹框
        let innerMap = processMaintainCompleteTask(String(open_id), open_message_id);   

        if (Array.from(innerMap.entries()).length === 0) {
            return { code: 0 };
        }

        let prodIds = innerMap.get("prodIds");
        console.log('prd is:' , prodIds);
        if (prodIds.trim() === "") {
            // 没有填写验收人员：完成升级则完成发布流程
            let doneTaskOpenId = innerMap.get("doneId");
            if( doneTaskOpenId.trim() !== ''){
                const template_variable = {
                    timeStr: timeStr,  
                    titleTxt: titleTxt,
                    mentionUser: `<at id="${doneTaskOpenId}"></at>`
                };

                const body = {
                    receive_id: open_chat_id,
                    template_id: Templates.done_without_prod,
                    template_variable: template_variable
                };
                await sendCardMessage(body);
            }

            isCompleteMaintain(open_message_id);
            await updateCompleteMaintainCard(titleTxt, updateContent, maintainUser, open_message_id);
            return { code: 0 };
        }
        
        console.log('发送验收弹框');
        let doneId = innerMap.get("doneId");
        let deadline = innerMap.get('deadline');

        // 统一换行符，避免 \r\n 和 \n 不一致导致 split 失败
        const normalized = updateContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        let result = normalized.split('**升级时间**')[0].trim(); 

        const timestamp =  dayjs().tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm [UTC+8]');
        const params = {
            timeStr:        timestamp,  
            redirectUrl:    redirectUrlTxt ,
            redirectUrlTxt: redirectUrlTxt,
            titleTxt:       titleTxt,
            deadline:       deadline,
            mentionUser:    prodIds,
            updateContent:  result
        };

        const body = {
            doneUser:  doneId,
            msg_type  : 'interactive',
            receive_id: open_chat_id,
            template_id: Templates.maintain_content,
            template_variable: params
        };
        await sendCardMessage(body, true);
        isCompleteMaintain(open_message_id);

        await updateCompleteMaintainCard(titleTxt, updateContent, maintainUser, open_message_id);
        return { code: 0 };
    }


    // 处理的是验收弹框
    // 需要写回去的新变量值
    let users = processDoneTask(String(open_id), open_message_id);
    if (users === '') {
        return { code: 0 };
    }

    const timestamp = dayjs().tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm [UTC+8]');
    const params = {
        users: users,    
        timeStr: timestamp,  
        titleTxt: titleTxt,
        redirectUrl: redirectUrlTxt,
        redirectUrlTxt: redirectUrlTxt,
    };

    const body = {
        receive_id: open_chat_id,
        template_id: Templates.process,
        template_variable: params
    };
    await sendCardMessage(body);

    // 检查全部完成验收
    const doneTaskOpenId = isCompleteTask(open_message_id);
    console.log('doneTaskOpenId:', doneTaskOpenId);
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
        await updateCompleteProdCard(titleTxt, updateContent, timeStr, mentionUser, deadline, open_message_id);
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
 * 运维人员完成升级后：卡片按钮设置置灰
 * @param {string} titleTxt 
 * @param {string} updateContent 
 * @param {string} mentionUser 
 * @param {string} maintainUser 
 * @param {string} open_message_id 
 * @returns 
 */
async function updateCompleteMaintainCard(titleTxt, updateContent, maintainUser, open_message_id) {

    const update_card = {
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
        data: { content: JSON.stringify(update_card) }
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
            console.log("不需要缓存或没有要缓存的消息");
        }
    }

    return {code: 0};
}

/**
 * 产品全部完成验收后：卡片按钮设置置灰
 * @param {string} titleTxt 
 * @param {string} updateContent 
 * @param {string} timeStr 
 * @param {string} mentionUser 
 * @param {string} deadline 
 * @param {string} open_message_id 
 * @returns 
 */
export async function updateCompleteProdCard(titleTxt, updateContent, timeStr, mentionUser, deadline, open_message_id) {
    
    const update_card =  {
        "config": {
            "update_multi": true,
            "wide_screen_mode": true
        },
        "header": {
            "template": "blue",
            "title": {
            "content": `📢 ${titleTxt}`,
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
                        "content": `已于 ${timeStr}   完成升级。请以下人员完成验收：`,
                        "tag": "lark_md"
                    }
                },
                {
                   "tag": "hr"
                },
                {
                    "tag": "div",
                    "text": {
                        "content": `${mentionUser}`,
                        "tag": "lark_md"
                    }
                },
                {
                  "tag": "hr"
                },
                    {
                    "tag": "div",
                    "text": {
                        "content": "**验收截止时间**",
                        "tag": "lark_md"
                    }
                },
                {
                    "tag": "div",
                    "text": {
                        "content": `${deadline}`,
                        "tag": "plain_text"
                    }
                },
                {
                    "tag": "hr"
                },
                {
                    "tag": "action",
                    "actions": [
                        {
                            "tag": "button",
                            "text": {
                                "tag": "plain_text",
                                "content": "已完成验收"
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
        data: { content: JSON.stringify(update_card) }
    });


    return {code: 0};
}

