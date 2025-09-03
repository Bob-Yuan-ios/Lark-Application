// 验收人员列表
const mentionIds = new Map();

// 运维人员列表
const maintainIds = new Map();

// 已完成验收人员列表
const completeIds = new Map();

// 验收结束后通知的人员列表
const doneTaskOpenIds = new Map();


/**
 * 初始化 @ 运维人员
 * @param {Array} users 
 * @param {string} key 
 */
export function initProcessWithMaintainMentions(user = '', key = '', prodIds = '', doneId = '', updateContent = '', deadline = '') {

    let innerMap = new Map();
    innerMap.set("prodIds", prodIds);
    innerMap.set("doneId", doneId);
    innerMap.set("doneId", doneId);
    innerMap.set('updateContent', updateContent);
    innerMap.set('deadline', deadline);

    let outterMap = new Map();
    outterMap.set(user, innerMap);
    maintainIds.set(key, outterMap);

    console.log('初始化运维消息ID:', key);
    console.log(maintainIds);
}

/**
 * 查询完成人员id
 * @param {string} open_id 
 * @param {string} key 
 * @returns 
 */
export function processMaintainCompleteTask(open_id, key = ''){
    console.log('\n查询缓存消息ID:', open_id, key);
    if(maintainIds === undefined || maintainIds  == null){
        console.log('\n没有缓存消息');
        return new Map();
    }
    console.log(maintainIds);

    let outterMap = maintainIds.get(key);
    if(outterMap == undefined || outterMap == null){
        console.log('outtermap is null');
       return new Map();
    }

    let innnerMap = outterMap.get(open_id);
    if(innnerMap == undefined || innnerMap == null){
        console.log('innnerMap is null');
        return new Map();
    }

    return innnerMap;
}

export function isCompleteMaintain(key = ''){
    maintainIds.delete(key);
    return '';
}


/**
 * 初始化 @ 产品人员
 * @param {users}  user 产品人员
 * @param {string} key 
 * @param {string} doneId 验收人员
 */
export function initProcessWithProdMentions(users, key = '', doneId = '') {

    doneTaskOpenIds.set(key, doneId);

    const innerMap = new Map();
    users.forEach(user => {
        console.log(`ID: ${user.id}, Name: ${user.name}`);
        innerMap.set(user.id, user);
    });
    mentionIds.set(key, innerMap);

    console.log('初始化产品消息ID:', key);
    console.log(mentionIds);
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
