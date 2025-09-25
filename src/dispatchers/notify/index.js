import handleDocupdate from "./docUpdate.handler.js";

const commandMap = {
    word_update: handleDocupdate,
};

export default {
    async dispatch(command, body) {
        const handler = commandMap[command];
        if(!handler){
            throw new Error(`未知指令：${command}`);
        }
        return await handler(body);
    }
};