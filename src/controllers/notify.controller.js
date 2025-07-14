
import dispatcher from '../dispatchers/notify/index.js';

export async function handleNotify(req, res) {

    const { command } = req.body;    
    try {
        if(!command) {
            return res.status(400).json({code: -1, msg: 'no command'});
        }

        const body = req.body;
        delete body.command;
        
        const result = await dispatcher.dispatch(command, body);
        res.json(result);
    } catch(err) {
        console.log('处理异常:', err);
        res.status(500).json({ code: -1, msg: '服务异常'});
    }  
}