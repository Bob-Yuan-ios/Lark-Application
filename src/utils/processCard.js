// 验收人员列表
const mentionIds = new Map();

// 运维人员列表
const maintainIds = new Map();

// 已完成验收人员列表
const completeIds = new Map();

// 验收结束后通知的人员列表
const doneTaskOpenIds = new Map();

/**
 * 初始化 @ 产品人员
 * @param {Array} users 
 * @param {string} key 
 * @param {string} doneId 
 */
export function initProcessWithProdManMentions(users, key = '', doneId = '') {

    doneTaskOpenIds.set(key, doneId);

    const innerMap = new Map();
    users.forEach(user => {
        console.log(`ID: ${user.id}, Name: ${user.name}`);
        innerMap.set(user.id, user);
    });
    mentionIds.set(key, innerMap);

    console.log('初始化消息ID:', key);
    console.log(mentionIds);
}


/**
 * 初始化 @ 运维人员
 * @param {Array} users 
 * @param {string} key 
 */
export function initProcessWithMaintainMentions(users, key = '', prodIds = '') {

    const innerMap = new Map();
    users.forEach(user => {
        console.log(`ID: ${user.id}, Name: ${user.name}`);
        innerMap.set(user.id, user);
    });
    maintainIds.set(key, innerMap);

    console.log('初始化消息ID:', key);
    console.log(maintainIds);
}

/**
 * 查询完成消息人员的昵称；用于回显
 * @param {string} openId 
 * @param {string} key 
 * @returns 
 */
export function processDoneTask(openId, key = ''){

    console.log('\n缓存消息ID:', key);
    console.log(mentionIds);

    if(mentionIds === undefined || mentionIds  == null){
        return '';
    }

    const innerMap = mentionIds.get(key);
    if(innerMap === undefined || innerMap  == null){
        return '';
    }

    if(innerMap.get(openId)){
        const user = innerMap.get(openId);

        let innerCompleteMap;
        if(completeIds.get(key)){
            innerCompleteMap = completeIds.get(key);
        }else{
            innerCompleteMap = new Map();
        }
        innerCompleteMap.set(openId, user);
        completeIds.set(key, innerCompleteMap);

        return user.name;
    }else{
        
        console.log('没有查找到用户信息');
        return '';
    }
}

/**
 * 产品 -- 确认验收
 * @param {string} key 
 * @returns 
 */
export function isCompleteTask(key = ''){

    console.log('完成消息ID:', key);
    const doneTaskId = doneTaskOpenIds.get(key);
    if(doneTaskId === undefined || doneTaskId  == null){
        console.log('没有初始化信息');
        return '';
    }
    console.log('完成人:', doneTaskId);

    if(mentionIds === undefined || mentionIds  == null || mentionIds.size === 0){
        console.log('没有初始化信息');
        return '';
    }

    const innerMap = mentionIds.get(key);
    if(innerMap === undefined || innerMap  == null){
        console.log('没有初始化信息');
        return '';
    }

    if(completeIds === undefined || completeIds  == null || completeIds.size === 0){
         console.log('没有完成信息');
        return '';
    }


    const innerCompleteMap = completeIds.get(key);
    if(innerCompleteMap === undefined || innerCompleteMap  == null){
        console.log('没有完成信息');
        return '';
    }


    const resCount = innerMap.size - innerCompleteMap.size;
    if(innerMap.size > 0 && (resCount === 0)){
        console.log('所有人已完成');
        doneTaskOpenIds.delete(key);
        mentionIds.delete(key);
        completeIds.delete(key);
        return doneTaskId;
    }

    console.log('未完成人数:', resCount);
    return '';
}
