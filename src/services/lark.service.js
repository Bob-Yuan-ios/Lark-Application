import axios from 'axios';
import dayjs from 'dayjs';

import * as lark from '@larksuiteoapi/node-sdk';

import {
  getTenantToken
} from './tokenManager.js';

import { 
  APP_ID, 
  APP_SECRET
} from '../config/index.js';

const API = 'https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id';


const template_upgrade_start = 'ctp_AAIy5bdcJ3Rl';
const template_upgrade_process = 'ctp_AAIV1SKqwXnP';
const template_upgrade_end = 'ctp_AAI1pp9Okj2I';

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

    console.log('\n接收到Lark的消息');
    console.log(JSON.stringify(data));

    // webhook验证
    if(data.type === 'url_verification'){
      return { challenge: data.challenge };
    }

    setImmediate(() => handleEventReal(data));  // 业务异步跑  
    return {code: 0};   
}

/**
 * Lark事件真实业务处理
 * @param {JSON} data 
 * @returns 
 */
async function handleEventReal(data) {
   /***        消息去重        ***/ 
    const { event_id, retry_cnt } = data;
    if (retry_cnt > 0) return { code: 0 };
    if (seenEvents.has(event_id)) return { code: 0 };
    seenEvents.add(event_id);
    /***        消息去重        ***/ 

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
 * 响应卡片点击消息
 * @param {Object} data lark发送的数据
 * @returns 
 */
export async function handleCardCallback(data) {
  console.log('\n接收到用户点击事件:');
  console.log(JSON.stringify(data));

  // webhook验证
  if(data.type === 'url_verification'){
    return { challenge: data.challenge };
  }

  setImmediate(() => handleCardReal(data));  // 业务异步跑  
  return {code: 0};
}

/**
 * Lark卡片真实业务处理
 * @param {JSON} data 
 * @returns 
 */
async function handleCardReal(data) {
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
        titleTxt,
        redirectUrlTxt 
      }
    }
  } = data.event;

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
     titleTxt: titleTxt,
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
        template_id: template_upgrade_process,
        template_variable: params
      }
  });

  if(mentionIds.size > 0 && completeIds.size == mentionIds.size){
    console.log('所有人已完成');

    const men_id = 'ou_b38d19b1aa686c6a976e8886283dd285';
    const template_variable = {
      timeStr: timeStr,  
      titleTxt: titleTxt,
      mentionUser: `<at id="${men_id}"></at>`
    };

    // 生成新的弹框：反馈完成状态
    await client.im.message.createByCard({
        params: {
          receive_id_type: "chat_id"
        },
        data: {
          receive_id: open_chat_id,
          template_id: template_upgrade_end,
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
            template_id: template_upgrade_start,
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
 * 给lark发送文本消息
 * @param {string} payload 发送的内容
 * @returns 
 */
export async function sendTextMessage(payload) {

  let token = await getTenantToken();

  console.log('发送的数据');
  console.log(payload);

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try{
    const res = await axios.post(API, payload, { headers });

    if(0 === res.data.code){
      console.log('返回的结果:');
      console.log(res.data);

      const mentions = JSON.stringify(res.data.data.mentions);
      if(mentions){
        console.log('mentions id:', mentions);
        saveMentions(JSON.parse(mentions));
      }
      
      return {code: 0};
    }else if (res.data.msg?.includes('access token is invalid')) {

      token = await getTenantToken(); // 强制刷新
      headers.Authorization = `Bearer ${token}`;
      const retryRes = await axios.post(url, data, { headers });
      const mentions = JSON.stringify(retryRes.data.data.mentions);
      if(mentions){
        console.log('mentions id:', mentions);
        saveMentions(JSON.parse(mentions));
      }

      return {code: 0};
    }

  }catch(err){
    console.log(JSON.stringify(err));
    return res.data;
  } 
}

function saveMentions(users) {
   users.forEach(user => {
        if (!mentionIds.get(user.id)){
            console.log(`ID: ${user.id}, Name: ${user.name}`);
            mentionIds.set(user.id, user);
        } 
    });
    console.log('数组信息:');
    console.log(mentionIds);
}