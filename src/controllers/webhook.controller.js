import dispatcher from '../dispatchers/webhook/index.js';

export async function handleWebhookEvent(req, res, next) {
    try {
        const result = await dispatcher.handleEvent(req.body);
        res.status(200).json(result);
    } catch(err) {
        next(err);
    }
}

export async function handleWebhookCard(req, res, next) {
    try {
        const result = await dispatcher.handleCard(req.body);
        res.status(200).json(result);
    } catch(err) {
        next(err);
    }
}