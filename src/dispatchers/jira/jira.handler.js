
import {
  task_deadline_notify,
  issue_chat_lark
} from '../../services/jira_notify.service.js';

export async function handle_jira_notify(body){  
  console.log('收到的数据:', body);
  return await task_deadline_notify(body);
}


export async function handle_jira_webhook(body) {
  console.log('收到的数据:', body);
  return await issue_chat_lark(body);
}