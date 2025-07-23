import {
    handleTelegramLogin
} from '../../services/thirdLogin.service.js';

export async function handleThirdLogin(body) {
    console.log('处理三方登录...');
    return await handleTelegramLogin(body);
}