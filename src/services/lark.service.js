import axios from 'axios';
import dayjs from 'dayjs';

import * as lark from '@larksuiteoapi/node-sdk';

import { 
  refreshToken
 } from './token.service.js';

import { 
  APP_ID, 
  APP_SECRET, 
  TENANT_TOKEN
 } from '../config/index.js';


const API = 'https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id';

// 事件去重
const seenEvents = new Set();

// 卡片回调去重
const messageIds = new Set();

// 升级文档提到要参与验收的ID信息
const mentionIds = new Map();

// 已参与验收的ID信息
const completeIds = new Map();

const client = new lark.Client({
    appId: APP_ID,
    appSecret: APP_SECRET,
    domain: lark.Domain.Lark
});


 /**
  * 处理事件监听 发送给机器人的消息
  * @param {Object} data lark发送的数据
  * @returns 
  */
export async function handleEventCallback(data) {

    /***        消息去重        ***/ 
    const { event_id, retry_cnt } = data;
    if (retry_cnt > 0) return { code: 0 };
    if (seenEvents.has(event_id)) return { code: 0 };
    seenEvents.add(event_id);
    /***        消息去重        ***/ 

    console.log('\n接收到Lark的消息');
    console.log(JSON.stringify(data));

    const {
      message: { 
        chat_id,
        content
      },
      sender: {
        sender_id: {
           open_id
        }
      }
    } = data;

    const msg = JSON.parse(content).text;
    if (msg.includes('文档更新通知')) {
      robotSendCard(chat_id, open_id);
      return { code : '0'};
    }

    robotSendMessage(chat_id);
    return { code : '0'};
}

/**
 * 机器人发送卡片消息
 * @param {string} chat_id lark标识
 * @param {string} open_id lark标识
 * @returns 
 */
async function robotSendCard(chat_id, open_id) {
    const URL_INFO = 'https://docs.google.com/document/d/1vTr5gzR9SwkCUAZRXLNghyTlbpU4YR3VuftHrtH3cPY';
    const template_variable = {
        redirectUrl:  URL_INFO ,
        redirectUrlTxt: URL_INFO,
        mentionUser: `<at id="${open_id}"></at>`
    };

    await client.im.message.createByCard({
        params: {
              receive_id_type: "chat_id"
        },
        data: {
            receive_id: chat_id,
            template_id: 'ctp_AAIy5bdcJ3Rl',
            template_variable: template_variable
        }
    });
    return { code: 0 };                      
}

/**
 * 机器人发送文本消息
 * @param {string} chat_id lark标识
 * @returns 
 */
async function robotSendMessage(chat_id) {
  await client.im.message.create({
    params: {
        receive_id_type: 'chat_id'
    },
    data: {
        msg_type: 'text',
        receive_id: chat_id,
        content: JSON.stringify({text: chat_id})
    }
  });

  return { code: 0 };                        
}

/**
 * 响应卡片点击消息
 * @param {Object} data lark发送的数据
 * @returns 
 */
export async function handleCardCallback(data) {
  console.log('\n接收到用户点击事件:');
  console.log(JSON.stringify(data));

  const { 
    operator: {
      open_id
    },
    context: {
      open_chat_id,
      open_message_id
    },
    action: {
      value: { 
        redirectUrlTxt 
      }
    }
  } = data;

  /***        消息去重        ***/ 
  const key = open_chat_id + open_message_id + open_id;
  if (messageIds.has(key))  return { code: 0 };
  messageIds.add(key);
  /***        消息去重        ***/ 

  // 需要写回去的新变量值
  let openId = String(open_id);

  console.log('\n读取缓存数组:');
  console.log(mentionIds);

  if(mentionIds.get(openId)){
    const user = mentionIds.get(openId);
    completeIds.set(user.id, user);
    openId = user.name;

  }else{
    console.log('没有查找到用户信息');
    return { code: 0 };
  }

  console.log('\nuser_name:' + openId);
  const timeStr = dayjs().format('YYYY-MM-DD HH:mm');
  console.log(timeStr);

  const params = {
     users: openId,    
     timeStr: timeStr,  
     redirectUrl: redirectUrlTxt,
     redirectUrlTxt: redirectUrlTxt
  };
  console.log('\n生成新的弹框组装的参数:', params);

  // 生成新的弹框：显示已经完成的信息
  await client.im.message.createByCard({
      params: {
        receive_id_type: "chat_id"
      },
      data: {
        receive_id: open_chat_id,
        template_id: 'ctp_AAIV1SKqwXnP',
        template_variable: params
      }
  });

  if(mentionIds.size > 0 && completeIds.size == mentionIds.size){
    console.log('所有人已完成');

    const men_id = 'ou_b38d19b1aa686c6a976e8886283dd285';
    const template_variable = {
      timeStr: timeStr,  
      mentionUser: `<at id="${men_id}"></at>`
    };

    // 生成新的弹框：反馈完成状态
    await client.im.message.createByCard({
        params: {
          receive_id_type: "chat_id"
        },
        data: {
          receive_id: open_chat_id,
          template_id: 'ctp_AAI1pp9Okj2I',
          template_variable: template_variable
        }
    });
    mentionIds.clear();
    completeIds.clear();

  }else{
    console.log('未完成人数：', mentionIds.size - completeIds.size);
  }
}

/**
 * 给lark发送文本消息
 * @param {string} chat_id lark标识
 * @param {string} text    lark标识 
 * @returns 
 */
export async function sendTextMessage(chat_id, text) {
  if (!TENANT_TOKEN.value) TENANT_TOKEN.value = await refreshToken();
  console.log('token信息：', TENANT_TOKEN.value);

  const payload = {
    receive_id: chat_id,
    msg_type: 'text',
    content: JSON.stringify({ text }),
  };

  let result = await doSend(payload);
  if (result.code === 99991663) {
    TENANT_TOKEN.value = await refreshToken();
    result = await doSend(payload);
  }

  return result;
}

async function doSend(payload) {
  try {
    const res = await axios.post(API, payload, {
      headers: {
        Authorization: `Bearer ${TENANT_TOKEN.value}`,
        'Content-Type': 'application/json'
      }
    });
    return res.data;
  } catch (err) {
    console.error('发送失败:', err.message);
    return { code: -1, msg: err.message };
  }
}