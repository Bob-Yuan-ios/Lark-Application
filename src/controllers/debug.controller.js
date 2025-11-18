import { AppError } from '../middlewares/errorHandler.js';
import fs from 'fs';

/**
 * 调试API控制器
 * 提供系统信息、环境变量等调试信息
 */

export async function getDebugInfo(req, res, next) {
    try {
        const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));

        // 获取系统信息
        const systemInfo = {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            cwd: process.cwd(),
            env: {
                nodeEnv: process.env.NODE_ENV,
                // 只暴露安全的环境变量
                version: pkg.version,
            }
        };

        // 获取请求信息
        const requestInfo = {
            method: req.method,
            url: req.originalUrl,
            headers: req.headers,
            query: req.query,
            body: req.body
        };

        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            system: systemInfo,
            request: requestInfo
        });
    } catch(err) {
        next(new AppError(`调试信息获取失败: ${err.message}`, 500));
    }
}

export async function testErrorHandler(req, res, next) {
    try {
        // 测试错误处理
        throw new AppError('这是一个测试错误', 400);
    } catch(err) {
        next(err);
    }
}