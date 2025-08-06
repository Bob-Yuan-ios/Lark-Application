/**
 * 自定义错误类
 */
export class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * 错误处理中间件
 * Express 5 支持 async/await 中的错误被自动捕获并传递给下一个中间件，
 * 无需显式 .catch()。
 * @param {Error} err 
 * @param {Request} req 
 * @param {Response} res 
 * @param {import("express").NextFunction} next 
 */
export default function errorHandler(err, req, res, next) {
    err.statusCode = err.statusCode || 500;
    err.message = err.message || 'Internal Server Error';

    // 记录错误日志
    console.error('Error:', err);

    // 根据错误类型返回不同的响应
    if (err.isOperational) {
        res.status(err.statusCode).json({
            code: err.statusCode,
            msg: err.message
        });
    } else {
        // 对于非预期错误，不暴露详细信息
        res.status(500).json({
            code: 500,
            msg: '服务异常，请稍后再试'
        });
    }
}
