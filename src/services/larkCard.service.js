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
 * 发送带反馈的卡片信息
 * @param {JSON} payload 模板信息
 * @returns 
 */
export async function sendFeedBackMessage(payload) {

    const user_open_id = payload.open_id;
    if (!user_open_id) {
        return res.status(400).json({ error: "缺少 open_id" });
    }

   // v2 schema 正确写法
  const card = {
  "schema": "2.0", // 卡片 JSON 结构的版本。默认为 1.0。要使用 JSON 2.0 结构，必须显示声明 2.0。
  "body": {
    "elements": [
      {
        "tag": "input", // 输入框的标签。
        "element_id": "custom_id", // 操作组件的唯一标识。JSON 2.0 新增属性。用于在调用组件相关接口中指定组件。需开发者自定义。
        "margin": "0px 0px 0px 0px", // 组件的外边距。JSON 2.0 新增属性。默认值 "0"，支持范围 [-99,99]px。
        "name": "input1", // 输入框的唯一标识。当输入框内嵌在表单容器时，该属性生效，用于识别用户提交的文本属于哪个输入框。
        "required": false, // 输入框的内容是否必填。当输入框内嵌在表单容器时，该属性可用。其它情况将报错或不生效。
        "placeholder": {
          // 输入框中的占位文本。
          "tag": "plain_text",
          "content": "请输入"
        },
        "default_value": "demo", // 输入框中为用户预填写的内容。
        "disabled": false, // 是否禁用该输入框组件。默认值 false。
        "disabled_tips": { // 指禁用组件后，用户将光标悬浮在整个组件上时展示的禁用提示文案。
          "tag": "plain_text",
          "content": "用户禁用提示文案"
        },
        "width": "default", // 输入框的宽度。
        "behaviors": [
          { // 为组件配置自定义的回传交互参数。
            "type": "callback",
            "value": {
              // 回传交互数据。支持 object 数据类型。开放平台 SDK 仅支持 object 类型的回传交互数据。
              "key_1": "value_1"
            }
          }
        ],
        "max_length": 5, // 输入框可容纳的最大文本长度。默认值 1000。
        "input_type": "multiline_text", //指定输入框的输入类型。默认为 text，即文本类型。
        "rows": 1, // 当输入类型为多行文本时，输入框的默认展示行数。
        "auto_resize": true, // 当输入类型为多行文本时，输入框高度是否自适应文本高度。仅在 PC 端生效。
        "max_rows": 5, // 输入框的最大展示行数。仅当 `auto_resize` 为 true 时有效。
        "show_icon": false, // 当输入类型为密码类型时，是否展示前缀图标。                    
        "label": {
          // 文本标签，即对输入框的描述，用于提示用户要填写的内容。
          "tag": "plain_text",
          "content": "请输入文本："
        },
        "label_position": "left", // 文本标签的位置。默认值 top。
        "value": {
          // 回传数据，支持 string 或 object 数据类型。历史属性。
          "k": "v"
        },
        "confirm": {
          // 二次确认弹窗配置。
          "title": {
            "tag": "plain_text",
            "content": "title"
          },
          "text": {
            "tag": "plain_text",
            "content": "content"
          }
        }
      }
    ]
  }
};

  try {
    const result = await client.im.message.create({
      params: { receive_id_type: "open_id" },
      data: {
        receive_id: user_open_id,
        msg_type: "interactive",
        content: JSON.stringify({ card }) // ⚠️ 必须字符串化
      }
    });
    
    res.json(result);
  } catch (err) {
    console.error("发送失败:", err.response?.data || err);
    res.status(500).json({ error: "发送失败" });
  }

    return {code: 0};
}