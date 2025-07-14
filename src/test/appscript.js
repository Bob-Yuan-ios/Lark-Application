const DOC_ID      = '1vTr5gzR9SwkCUAZRXLNghyTlbpU4YR3VuftHrtH3cPY';                  // ← 换成文档 ID
const PROP_KEY    = 'lastRevision';

/* ❷ 主函数：比较 revisionId */
function checkDocChange() {
  const props   = PropertiesService.getScriptProperties();

  // 1. 读取正文
  const doc   = DocumentApp.openById(DOC_ID);
  const text  = doc.getBody().getText();

  // 2. 计算 SHA‑256 哈希并转成 Base64 方便存储
  const hash  = Utilities.base64Encode(
                  Utilities.computeDigest(
                    Utilities.DigestAlgorithm.SHA_256,
                    text,
                    Utilities.Charset.UTF_8
                  )
                );

  // 3. 跟上一次的哈希比对
  const last  = props.getProperty(PROP_KEY);
  if (hash !== last) {
    sendLarkCard();                    // ← 你的推送函数
    props.setProperty(PROP_KEY, hash); // 记录最新哈希
    console.log('正文发生变化，已触发推送');
  }else{
    console.log('正文没有任何改变');
  }
}

/**
 * 向指定群聊发送一条已发布的卡片（card_id）消息
 *
 * 前提：
 * 1. 项目在 Lark 后台已勾选 “Send message as user” (im:message.send_as_user) 并发布
 * 2. USER_ACCESS_TOKEN 包含该权限
 * 3. 目标群聊 chat_id 已知，且 Bot 已加入该群
 */
function sendLarkCard() {
  /* === 请替换下列变量 === */
  const USER_ACCESS_TOKEN = 't-g206782sTE7I2CXU2WNL4NADQCLBVOTAHXEKGPDV';           // 或 tenant_access_token
  const CHAT_ID           = 'oc_c51dd2790c96ecc795e6061b41caae75';                  // 群聊 chat_id
  const CARD_ID           = 'ctp_AAIy5bdcJ3Rl';                                     // Card Builder 发布后的 ID
 
  /* === 组装请求体 === */
  // @多人 mentionUser: `<at id="${ouA}"></at> <at id="${ouB}"></at>`
  // @全部 mentionUser: '<at id="all"></at>'
  const URL_INFO = 'https://docs.google.com/document/d/' + DOC_ID;

  const openId = 'ou_fe19f72fdf3cb17914be9b409ab5acd4';
  const template_variable = {
     redirectUrl:   URL_INFO ,
     redirectUrlTxt: URL_INFO,
     mentionUser: `<at id="${openId}"></at>`
  };

  const data = {
     template_id : CARD_ID,
     template_variable: template_variable
  }

  const contentObj = {
    type : 'template',
    data : data 
  };

  const body = {
    receive_id: CHAT_ID,
    msg_type  : 'interactive',
    content   : JSON.stringify(contentObj)   // 再次 stringify
  };
  
  /* === 发起 HTTP 请求 === */
  const url   = 'https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id';
  const options = {
    method : 'post',
    muteHttpExceptions: true,               // 出错时也返回响应体
    contentType : 'application/json',
    headers : {
      'Authorization': 'Bearer ' + USER_ACCESS_TOKEN
    },
    payload : JSON.stringify(body)
  };
  
  const resp = UrlFetchApp.fetch(url, options);
  const result = JSON.parse(resp.getContentText());
  
  // 打印日志，便于调试
  Logger.log('status: %s', resp.getResponseCode());
  Logger.log('response: %s', JSON.stringify(result, null, 2));
}
