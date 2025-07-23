import { handleThirdLogin } from "../dispatchers/auth/thirdlogin.handle.js";

export async function handleWebhookThirdLogin(req, res) {
    const result = await handleThirdLogin(req);
    res.status(200).json({result});
}