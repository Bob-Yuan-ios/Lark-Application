import express from 'express';
import { handleWebhookThirdLogin } from '../controllers/thirdlogin.controller.js';

const thirdLoginRouter = express.Router();
thirdLoginRouter.get('/telegram', handleWebhookThirdLogin);

export default thirdLoginRouter;