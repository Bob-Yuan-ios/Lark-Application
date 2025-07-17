/**
 * Express 5 终于支持 async/await 中的错误被自动捕获并传递给下一个中间件，
 * 无需显式 .catch()。
 * @param {Error} err 
 * @param {Request} req 
 * @param {Response} res 
 * @param {import("express").NextFunction} next 
 */
export default function errorHandler(err, req, res, next) {
    console.log('全局异常:', err);
    res.status(500).json({ code: 500, msg: 'service error'});
}
