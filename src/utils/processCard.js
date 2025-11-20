// 运维人员列表
const maintainIds = new Map();

// 验收人员列表
const mentionIds = new Map();

// 已完成验收人员列表
const completeIds = new Map();

// 验收结束后通知的人员列表
const doneTaskOpenIds = new Map();

// 漏验收提醒信息列表
const notifyInfos = new Map();

// 关联ID
const reflectKeys = new Map();

// 绑定ID
export function bindMessgeId(parent_messge_id, child_message_id){
    reflectKeys.set(child_message_id, parent_messge_id);
}

// 获取父消息ID
export function getParentMessageId(child_message_id){
    return reflectKeys.get(child_message_id);
}

// 删除关联ID
export function deleteCompleteBindId(parent_messge_id){
 for (const [key, value] of reflectKeys) {
    if (value === parent_messge_id) {
      reflectKeys.delete(key);
    }
  }
}


/**
 * 找出 A 的 value Map 中 B 不存在的元素
 * result: Map<key, Map<missingKey, missingValue>>
 */
export function diffMap() {
  const result = new Map();

  mentionIds.forEach((valueA, keyA) => {
    
    if (!completeIds.has(keyA)) {
      result.set(keyA, valueA);
      return;
    }

    const valueB = completeIds.get(keyA);
    const missingSubMap = new Map();

    // 遍历 A[key] 的子 map
    valueA.forEach((subValueA, subKeyA) => {
      if (!valueB.has(subKeyA)) {
        // B 的子 map 没有这个 key → 记录进 missingSubMap
        missingSubMap.set(subKeyA, subValueA);
      }
    });

    // 仅在存在差异时才设置到结果中
    if (missingSubMap.size > 0) {
      result.set(keyA, missingSubMap);
    }
  });

  return result;
}



/**
 * 返回漏提醒信息： Map
 * @param {string} key 消息id
 * @returns {Map} 漏提醒信息 Map
 */
export function findNotifyInfo(key) {
    const notify = notifyInfos.get(key);
    return notify;
}

/**
 * 初始化 @ 运维人员
 * @param {Array}  users 可以点击升级的运维人员列表
 * @param {string} key   消息id
 */
export function initProcessWithMaintainMentions(users, key = '', prodIds = '', doneId = '', deadline = '') {
    let innerMap = new Map();
    innerMap.set("prodIds", prodIds);
    innerMap.set("doneId", doneId);
    innerMap.set('deadline', deadline);

    let userMap = new Map();
    users.forEach(user => {
        console.log(`ID: ${user.id}, Name: ${user.name}`);
        userMap.set(user.id, user);
    });

    innerMap.set('user', userMap);
    maintainIds.set(key, innerMap);

    console.log('初始化运维消息ID:', key);
    console.log(maintainIds);
}

/**
 * 响应运维人员点击“已完成升级”
 * 同时支持白名单人员点击“已完成升级”
 * @param {string} open_id 运维人员的id
 * @param {string} key     消息id
 * @returns 
 */
export function processMaintainCompleteTask(open_id, key = ''){
    console.log('\n查询缓存运维信息ID:', open_id, key);
    if(maintainIds === undefined || maintainIds  == null){
        console.log('\n没有缓存运维人员');
        return new Map();
    }
    console.log(maintainIds);

   let innnerMap = maintainIds.get(key);
    if(innnerMap == undefined || innnerMap == null){
        console.log('没有查询到:完成升级后，需要响应验收的人员信息');
       return new Map();
    }

   // 白名单用户,不验证身份
   const opend_id_marina = process.env.OPEN_ID_MARINA || 'ou_b38d19b1aa686c6a976e8886283dd285';
   const opend_id_bob = process.env.OPEN_ID_BOB || 'ou_fe19f72fdf3cb17914be9b409ab5acd4';
    if(open_id === opend_id_marina || open_id === opend_id_bob){
        console.log('白名单用户，不做查询');
        innnerMap.delete('user');
        return innnerMap;
    }

    // 非白名单用户,验证身份
   let userMap = innnerMap.get('user');
   if(userMap == undefined || userMap == null){
       console.log('用户列表信息异常');
       return new Map();
    }

   let name = userMap.get(open_id);
   if(name == undefined || name == null){
        console.log('用户非授权运维人员，结束响应');
        return new Map();
    }

    innnerMap.delete('user');
    return innnerMap;
}

/**
 * 响应升级弹框 删除缓存信息
 * @param {string} key 消息id
 * @returns 
 */
export function isCompleteMaintain(key = ''){
    maintainIds.delete(key);
    return '';
}

/**
 * 初始化 @ 产品人员
 * @param {users}  users         产品人员
 * @param {string} key           关键标识
 * @param {string} doneId        验收人员
 * @param {string} titleTxt      通知标题
 * @param {string} receive_id    消息群
 * @param {string} deadline      验收截止时间
 * @param {string} updateContent 升级内容

 */
export function initProcessWithProdMentions(users, key = '', doneId = '', titleTxt, receive_id, deadline, updateContent) {
    doneTaskOpenIds.set(key, doneId);

    const innerMap = new Map();
    users.forEach(user => {
        console.log(`ID: ${user.id}, Name: ${user.name}`);
        
        innerMap.set(user.id, user);
    });
    mentionIds.set(key, innerMap);
    console.log('初始化产品消息ID:', key);
    console.log(mentionIds);

    const outterMap = new Map();
    outterMap.set('title', titleTxt);
    outterMap.set('receive_id', receive_id);
    outterMap.set('deadline', deadline);
    outterMap.set('updateContent', updateContent);

    notifyInfos.set(key, outterMap);
}

/**
 * 查询完成消息人员的昵称；用于回显
 * @param {string} openId   用户唯一标识
 * @param {string} key      消息id
 * @returns 
 */
export function processDoneTask(openId, key = ''){
    console.log('\n缓存完成消息ID:', key);

    if(mentionIds === undefined || mentionIds  == null){
        console.log('mentionIds 数据异常');
        return '';
    }
    console.log(mentionIds);

    const innerMap = mentionIds.get(key);
    if(innerMap === undefined || innerMap  == null){
        console.log('innerMap 数据异常');
        return '';
    }

    if(innerMap.get(openId)){
        const user = innerMap.get(openId);
        const name = user.name;

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
 * 产品 -- 检查是否已全部验收
 * @param {string} key 
 * @returns 完成验收后，需要通知的人员id
 */
export function isCompleteTask(key = ''){
    console.log('确认验收消息ID:', key);
    const doneTaskId = doneTaskOpenIds.get(key);
    if(doneTaskId === undefined || doneTaskId  == null){
        console.log('没有初始化完成人员信息');
        return '';
    }
    console.log('完成人:', doneTaskId);

    if(mentionIds === undefined || mentionIds  == null || mentionIds.size === 0){
        console.log('没有初始化验收人员信息');
        return '';
    }

    const innerMap = mentionIds.get(key);
    if(innerMap === undefined || innerMap  == null){
        console.log('没有初始化验收人员信息');
        return '';
    }

    if(completeIds === undefined || completeIds  == null || completeIds.size === 0){
       console.log('没有初始化已完成人员信息');
        return '';
    }


    const innerCompleteMap = completeIds.get(key);
    if(innerCompleteMap === undefined || innerCompleteMap  == null){
       console.log('没有已完成人员信息');
        return '';
    }

    const resCount = innerMap.size - innerCompleteMap.size;
    if(innerMap.size > 0 && (resCount === 0)){
        console.log('所有人已完成验收');
        doneTaskOpenIds.delete(key);

        mentionIds.delete(key);
        notifyInfos.delete(key);
        completeIds.delete(key);

        return doneTaskId;
    }

    console.log('未完成验收人数:', resCount);
    return '';
}
