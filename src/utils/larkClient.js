import * as lark from '@larksuiteoapi/node-sdk';

import {
    APP_ID,
    APP_SECRET
} from '../config/index.js';

export const client = new lark.Client({
    appId: APP_ID,
    appSecret: APP_SECRET,
    domain: lark.Domain.Lark
});


// lark卡片模版ID
export const Templates = {
  start: 'ctp_AAIy5bdcJ3Rl',
  maintain: 'ctp_AAzJjIoCQcvV',
  maintain_content: 'ctp_AA9WiWPx5t6e',
  process: 'ctp_AAIV1SKqwXnP',
  done: 'ctp_AAI1pp9Okj2I',
  done_without_prod: 'ctp_AAz5YbXs6Fps',


  sheet_update: 'ctp_AAhcWY9L32d5'
};