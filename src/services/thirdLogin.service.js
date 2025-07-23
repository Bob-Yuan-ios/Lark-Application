/**
 * curl -X GET https://your-ngrok-url/webhook \
  -H "Content-Type: application/json" \
  -d '{"token": ""}'
 * @param {*} body 
 * @returns 
 */
export async function handleTelegramLogin(body) {
   
    const data_check_string = body.token;
    const secret_key = SHA256('');

    console.log('user token is:', data_check_string);
    if (hex(HMAC_SHA256(data_check_string, secret_key)) == hash) {
        // data is from Telegram
        console.log('data is from telegram');
        return {code : 0};
    }else{
        console.log('data is not from telegram');
        return {code : -1};
    }
}