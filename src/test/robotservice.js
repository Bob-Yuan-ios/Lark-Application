import * as lark from '@larksuiteoapi/node-sdk';
import dayjs from 'dayjs';

const appId = 'cli_a8ee51f3c5381010';
const appSecret = 'rxPI5UYCLVb5gC3VdsDRxdjZl3C0UEZU';
export const verificationToken = 'tkDYcJHl0TVaYd0hP3noOc3M1cdTShtD';

// 事件去重
const seenEvents = new Set();

// 卡片回调去重
const messageIds = new Set();

// 升级文档提到要参与验收的ID信息
const mentionIds = new Map();

// 已参与验收的ID信息
const completeIds = new Map();

const client = new lark.Client({
    appId: appId,
    appSecret: appSecret,
    domain: lark.Domain.Lark
});

// 处理事件监听
export async function handleEvent(data) {

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

// 机器人发送卡片消息
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

// 机器人发送文本消息
async function robotSendMessage(chat_id) {
  await client.im.message.create({
    params: {
        receive_id_type: 'chat_id'
    },
    data: {
        receive_id: chat_id,
        content: JSON.stringify({text: chat_id}),
        msg_type: 'text'
    }
  });

  return { code: 0 };                        
}

/*  处理卡片回调事件
    替换方法--更新对话框
      const body = {
      token,
      card: {
        // open_ids: [open_id], // 多人处理时，此参数忽略
        type: "template",
        data: {
          template_id: templateId,
          template_variable: params
        }
      }
    };
    console.log('\n响应点击事件参数:');
    console.log(JSON.stringify(body));
    client.request({
      method: "POST",
      url: '/open-apis/interactive/v1/card/update',
      data: body
    });
*/
export async function handleCard(data) {
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

export function saveMentions(users) {
   users.forEach(user => {
        if (!mentionIds.get(user.id)){
            console.log(`ID: ${user.id}, Name: ${user.name}`);
            mentionIds.set(user.id, user);
        } 
    });
    console.log('数组信息:');
    console.log(mentionIds);
}

// 更新机器人token
export async function updateToken(){
  const url = 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal';
  const payload = {
    app_id: appId,
    app_secret: appSecret
  };
  
  const params = {
            method : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify(payload)
        };

  // 全局 fetch 已内置，无需安装
  const response = await fetch(url, params);
  // 如果响应就是 JSON，可以直接：
  const result = await response.json();
  return result.tenant_access_token;
}


/*  获取用户基础资料 
  *  获取通讯录基础信息，需要审核权限,
  *  @open_id可以获取昵称，能满足显示需求
  *  @all 无数据返回
  let profile;
  try {
    profile = await getProfileByOpenId(open_id);
  } catch (err) {
    console.error('获取用户信息失败', err);
  }
*/
async function getProfileByOpenId(openId) {
  const resp = await client.contact.user.get({
    user_id_type: 'open_id',   // 告诉接口传的是 open_id
      path: {
         user_id: openId
      }
  });

  console.log(JSON.stringify(resp));
  if (resp.code !== 0) throw new Error(resp.msg);

  console.log("\n查询点击用户信息:");
  console.log(JSON.stringify(resp));
  return resp.data.user;       // 包含 name 等
}