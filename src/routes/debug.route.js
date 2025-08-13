import express from 'express';

import {
    getDebugInfo,
    testErrorHandler
} from '../controllers/debug.controller.js';

const debugRouter = express.Router();

// 获取调试信息
debugRouter.get('/info', getDebugInfo);

// 测试错误处理
debugRouter.get('/error', testErrorHandler);

export default debugRouter;