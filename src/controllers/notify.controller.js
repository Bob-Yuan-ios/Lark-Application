
import dispatcher from '../dispatchers/notify/index.js';
import { AppError } from '../middlewares/errorHandler.js';

export async function handleNotify(req, res, next) {
    try {        
        const { command } = req.body;
        
        if(!command) {
            throw new AppError('没有提供命令', 400);
        }

        const body = req.body;
        delete body.command;
        
        const result = await dispatcher.dispatch(command, body);
        res.json(result);
    } catch(err) {
        next(err);
    }  
}