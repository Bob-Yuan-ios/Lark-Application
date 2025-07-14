import axios from 'axios';

import {
  APP_ID,
  APP_SECRET
} from '../config/index.js';

const API = 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal';
export async function refreshToken() {
  const res = await axios.post(API, {
    app_id: APP_ID,
    app_secret: APP_SECRET
  });
  return res.data.tenant_access_token;
}
