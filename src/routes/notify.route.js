import express from 'express';

import { 
    handleNotify 
} from '../controllers/notify.controller.js';

/**
 * 多级嵌套的写法
 * const v1Router = express.Router();
 * v1Router.use('/users', userRouter); // /v1/users/...
 * const apiRouter = express.Router();
 * apiRouter.use('/v1', v1Router);
 * app.use('/api', apiRouter); // 最终路径：/api/v1/users
 * 
 * 
 * 
 * 
 * 多级嵌套带参数的写法
 * const userRouter = express.Router();
 * // /users/:userId/profile
 * userRouter.get('/profile', (req, res) => {
 *  const userId = req.params.userId; // 从父路由继承参数
 *  res.send(`Profile of user ${userId}`);
 * });
 * // 挂载到父级路径上（含路径参数）
 * app.use('/users/:userId', userRouter);
 * 
 */
const notifyRouter = express.Router();
notifyRouter.post('/', handleNotify);

export default notifyRouter;