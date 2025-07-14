import axios from 'axios';

import { 
    APP_ID,
    APP_SECRET
 } from '../config/index.js';

let tenatToken = '';
let expireAt = 0;

const API = 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal';

/**
 * 维护token更新    
 * @returns 返回有效的token
 */
export async function getTenantToken() {

    const now = Math.floor(Date.now()/1000);

    if(tenatToken && now - expireAt - 60){
        return tenatToken;
    }

    const res = await axios.post(API, {
        app_id: APP_ID,
        app_secret: APP_SECRET
    });

    if(0 === res.data.code){
        tenatToken = res.data.tenant_access_token;
        expireAt = now + res.data.expire;
        console.log('Lark token 已刷新');
        return tenatToken;
    }else{
        console.error('Lark token 获取失败', res.data);
        throw new Error('Lark token 获取失败:' + res.data.msg);
    }
}