import { 
    client,
    Templates
} from '../utils/larkClient.js';


/**
 * 任务即将到期提醒
 * 任务状态更新提醒
 * @param {Array} param ['任务名称'， '负责人']
 * @returns 
 */
export async function task_deadline_notify(param){

  const command = param.command;
  const body = param.issues;

    if (!Array.isArray(body) || body.length === 0) {
        // 数组为空
        return {code: 0};
    }    

    // 过滤最后一个格式化的空元素
    let issues = (body || []).filter(
        i => i?.key
    );

    // 批量查询邮箱对应的user_id
    // 构造卡片
    // 发送卡片消息
    if (!Array.isArray(issues)) {
        throw new Error("issues is not array");
    }

    const emails = [...new Set(
        issues.map(i => i.assigneeEmail).filter(Boolean)
    )];
    console.log("emails:", emails);

    if(emails == null|| emails == undefined|| emails.length == 0){
      console.log('没有邮箱用户');
      return {code: 0};
    }

    const res = await client.contact.user.batchGetId({
    data: {
        emails: emails,
    },
        params: {
        user_id_type : "open_id"
        }
    });
    if (!res.data?.user_list?.length) {
        throw new Error(`找不到飞书用户: ${emails}`);
    } 

    const map = {};
    res.data?.user_list?.forEach(u => {
        if(u.user_id){
            map[u.email] = u.user_id;
        }
    });

    if(map.size == 0){
        console.log('查询不到用户id');
        return {code: 0};
    }

    // 绑定 user_id， 查不到的id的显示邮箱
    const validIssues = issues.map(i => ({
        ...i,
        userId: map[i.assigneeEmail],
    })); // 过滤飞书不存在的用户.filter(i => i.userId)

    if (validIssues.length === 0) {
        return {code: 0};
    }

    const cardPayload = buildCard(command, validIssues);  
    const message_id = process.env.JIRA_TIP_MESSAGE_ID;
    await client.im.message.create({
        params: {
            receive_id_type: "chat_id",
        },
        data: {
            receive_id: message_id,
            msg_type: "interactive",
            content: JSON.stringify(cardPayload),
        },
    });

    return {code: 0};
}


/**
 * 构造卡片
 * @param {Array} issues  ['任务名称'， '负责人']
 * @returns 
 */
function buildCard(command, issues) {

  let title =  "📋 JIRA 任务即将到期提醒";
  let content = "**以下任务即将到期，请及时处理：**";

  console.log('jira响应的指令', command);
  if(command == 'task_status_change_notify'){
    title =  "📋 JIRA 任务状态更新提醒";
    content = "**以下任务状态未按时更新，请及时处理：**";
  }
  
  // 按负责人分组
  const grouped = issues.reduce((acc, issue) => {
    const key = issue.userId || issue.displayName || "未分配";
    if (!acc[key]) {
      acc[key] = {
        assignee: issue,
        list: []
      };
    }
    acc[key].list.push(issue);
    return acc;
  }, {});

  return {
    header: {
      template: "orange",
      title: {
        tag: "plain_text",
        content: title
      }
    },
    elements: [
      {
        tag: "div",
        text: {
          tag: "lark_md",
          content: content
        }
      },
      ...Object.values(grouped).map(group => {
        const assigneeText = group.assignee.userId
          ? `<at id="${group.assignee.userId}"></at>`
          : (group.assignee.displayName || "未分配");

        const issuesText = group.list
          .map(issue => `[${issue.key}](https://jira.gts1668.com/browse/${issue.key})`)
          .join(" · ");

        return {
          tag: "div",
          text: {
            tag: "lark_md",
            content: `${assigneeText}：${issuesText}`
          }
        };
      })
    ]
  };
}

/**
 * jira-webhook消息
 * 
 * 1、issue_event_type_name: 'issue_comment_edited'  displayName 映射到邮箱有问题 [ 'reina.r' ]

 * 更新评论的单，手动检测是否有@
 * 检测到则调接口查询ID，然后单聊消息给对应的用户
 * 2、 issue_event_type_name: 'issue_updated', 
 * changelog: { id: '70911', items: [ [Object] ] }
 * @param {JSON} payload 
 * @returns 
 */
export async function issue_chat_lark(payload) {

  /* timestamp: 1767779570860,
   * webhookEvent: 'comment_created', 没有issue_event_type_name
    issue_event_type_name: 'issue_generic',
  */
  const issue_event_type_name = payload.issue_event_type_name;
  if(issue_event_type_name == null|| issue_event_type_name == undefined){
    console.log('没有解析到问题类型', payload);
    return {code: 0};
  }

  const {
    reporter,
    assignee,
    summary,
    comment
  } = payload.issue?.fields;

  console.log('问题字段里的评论内容,', comment);
  const request_url = jiraLink(payload.issue?.key);

  let request_comment = payload.comment?.body;
  if(request_comment == undefined){
    const comments = comment.comments;
    if(comments != undefined && comments.length > 0){
      request_comment = comments[comments.length - 1].body;
    }
  }

  if(request_comment == undefined){
      request_comment = '';
  }

  // 特定的逻辑
  const email = 'bob.b@min123.net';
  await send_email_lark_message(email, request_url, summary, request_comment);

  if(reporter != null && reporter != undefined){
     const email = reporter.emailAddress;
     console.log('reporter.email:', email);
     await send_email_lark_message(email, request_url, summary, request_comment);
  }

  if(assignee != null && assignee != undefined){
     const email = assignee.emailAddress;
     console.log('assignee.email:', email);
     await send_email_lark_message(email, request_url, summary, request_comment);
  }

  return {code: 0};
}

/**
 * 拼接jira超链接
 * @param {string} issueKey 
 * @returns 
 */
function jiraLink(issueKey) {
  return `[${issueKey}](https://jira.gts1668.com/browse/${issueKey})`;
}

/**
 * 通过邮箱发送lark单聊消息
 * @param {string} email                邮箱
 * @param {string} request_url          序号
 * @param {string} request_summary      描述
 * @param {string} request_comment      评论
 * @returns 
 */
async function send_email_lark_message(email, request_url, request_summary, request_comment) {
      const payload = {
        receive_id: email,
        template_id: Templates.def_content,
        template_variable: {
          request_url:     request_url,
          request_summary: request_summary,
          request_comment: request_comment
        }
      }
      return await client.im.message.createByCard({
        params: {
            receive_id_type: 'email'
        },
        data: payload
    });

}