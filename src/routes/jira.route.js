import express from 'express';

import { 
    handle_jira_event,
    handle_jira_webhook
} from '../controllers/jira.controller.js';

const jiraRouter = express.Router();
jiraRouter.post('/webhook',  handle_jira_webhook);
jiraRouter.post('/', handle_jira_event);

export default jiraRouter;