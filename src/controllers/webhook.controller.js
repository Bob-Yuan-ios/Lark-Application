import dispatcher from '../dispatchers/webhook/index.js';

export async function handleWebhookEvent(req, res) {
    const result = await dispatcher.handleEvent(req.body);
    res.status(200).json(result);
}

export async function handleWebhookCard(req, res) {
    const result = await dispatcher.handleCard(req.body);
    res.status(200).json(result);
}