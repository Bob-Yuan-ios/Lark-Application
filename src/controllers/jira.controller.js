import dispatcher from '../dispatchers/jira/index.js';

/**
 * 处理jira事务
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
export async function handle_jira_event(req, res, next) {
    try {
        const body = req.body;
        if(body == undefined) {
            res.status(200).json({'code': 'ok'});
            return;
        }
        const result = await dispatcher.handle_jira_notify(body);
        res.status(200).json(result);
    } catch(err) {
        next(err);
    }
}


/**
 * 处理jira webhook
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
export async function handle_jira_webhook(req, res, next) {
    
    try {
        const body = req.body;
        if(body == undefined) {
            res.status(200).json({'code': 'ok'});
            return;
        }

        const result = await dispatcher.handle_jira_webhook(body);
        res.status(200).json(result);
    } catch(err) {
        next(err);
    }

}