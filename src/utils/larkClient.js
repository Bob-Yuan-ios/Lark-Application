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
  process: 'ctp_AAIV1SKqwXnP',
  done: 'ctp_AAI1pp9Okj2I'
};