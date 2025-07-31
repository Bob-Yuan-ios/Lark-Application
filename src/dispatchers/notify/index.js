import handleDocupdate from "./docUpdate.handler.js";
import handleExcelUpdate from "./excelUpdate.handler.js";

const commandMap = {
    word_update: handleDocupdate,
    excel_update: handleExcelUpdate
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