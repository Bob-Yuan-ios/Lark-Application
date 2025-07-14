const PROP_KEY    = 'lastRevision';
const CONTENT_ID = '1r-NUnF8I5GQ5KVDmK761bBvcGOQPYI3ZYx1sxHikNrw'                     // 更新通知文档
  
// 用户需要验收的内容参照文档
const URL_INFO = 'https://docs.google.com/document/d/15pBQ8Qk1IDaeqQtgXok3NICPIuOzehTg17xLYP0Jqss';

/* ❷ 主函数：比较 revisionId */
function checkDocChange() {
  const props   = PropertiesService.getScriptProperties();

  // 1. 读取正文
  const doc   = DocumentApp.openById(CONTENT_ID);
  const text  = doc.getBody().getText();

  // 2. 计算 SHA‑256 哈希并转成 Base64 方便存储
  const hash  = Utilities.base64Encode(
                  Utilities.computeDigest(
                    Utilities.DigestAlgorithm.SHA_256,
                    text,
                    Utilities.Charset.UTF_8
                  )
                );

// 读取成员信息
  const regex = /#tag:([a-zA-Z0-9_-]+)/g;
  let match;
  const tags = [];

  while ((match = regex.exec(text)) !== null) {
    tags.push(match[1]);
  }

  Logger.log(tags);

  // 格式化成员信息
  let mentionUser = tags.map(tag => {
      return `<at id=${tag}></at>`;
  }).join('');
  Logger.log(mentionUser);

  // 文案去除成员信息
  const newStr = text.replace(regex, '');

  // 3. 跟上一次的哈希比对
  const last  = props.getProperty(PROP_KEY);
  if (hash !== last) {
    sendLarkCard(newStr, mentionUser);                    // ← 你的推送函数
    props.setProperty(PROP_KEY, hash);     // 记录最新哈希
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
function sendLarkCard(updateContent, mentionUser) {
  /* === 请替换下列变量 === */
  // const USER_ACCESS_TOKEN = 't-g2067a1fHVPOFSCQRX3LOCHPK5KHFDURVNDX2FIH';           // 或 tenant_access_token
  const CHAT_ID           = 'oc_1640c502ecda41fc35b07b1294d0e8a3';
  //oc_d13432d596f3114fa5c368e73ec873f4
  //oc_1640c502ecda41fc35b07b1294d0e8a3
  //'oc_c51dd2790c96ecc795e6061b41caae75';                  // 群聊 chat_id
  const CARD_ID           = 'ctp_AAIy5bdcJ3Rl';                                     // Card Builder 发布后的 ID
 
  /* === 组装请求体 === */
  // @多人 mentionUser: `<at id="${ouA}"></at> <at id="${ouB}"></at>`
  // @全部 mentionUser: '<at id="all"></at>'

  // const ouA = 'ou_b38d19b1aa686c6a976e8886283dd285'; //mar
  // const ouD = 'ou_0167a9164f7f7df29e282166e6daf84a'; //ly
  // const ouE = 'ou_34565f48f01d0c5520cd8d84652bde2e'; //hardy
  // const ouF = 'ou_11c16aed1b369fdae949c358f7a60c2d'; //alex
  // const template_variable = {
  //    redirectUrl:   URL_INFO ,
  //    redirectUrlTxt: URL_INFO,
  //    updateContent: updateContent,
  //    mentionUser: `<at id="${ouA}"></at><at id="${ouD}"></at><at id="${ouE}"></at><at id="${ouF}"></at>` 
  //  };
  // const ouB = 'ou_ae8ddbafa28f927db93a5f5515982a30'; //luke
  // const ouC = 'ou_fe19f72fdf3cb17914be9b409ab5acd4'; //bob

  const template_variable = {
     redirectUrl:   URL_INFO ,
     redirectUrlTxt: URL_INFO,
     updateContent: updateContent,
     mentionUser: mentionUser
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
  // const url   = 'https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id';
  const url = "https://aabf4efac417.ngrok-free.app/notify";
  const options = {
    method : 'post',
    muteHttpExceptions: true,               // 出错时也返回响应体
    contentType : 'application/json',
    payload : JSON.stringify(body)
  };
  
  const resp = UrlFetchApp.fetch(url, options);
  // const result = JSON.parse(resp.getContentText());
  
  // 打印日志，便于调试
  Logger.log('status: %s', resp.getResponseCode());
  Logger.log('response: %s', JSON.stringify(result, null, 2));
}
