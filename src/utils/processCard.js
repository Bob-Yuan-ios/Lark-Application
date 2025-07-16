const mentionIds = new Map();
const completeIds = new Map();


export function initProcessWithMentions(users) {

   users.forEach(user => {
        if (!mentionIds.get(user.id)){
            console.log(`ID: ${user.id}, Name: ${user.name}`);
            mentionIds.set(user.id, user);
        } 
    });
    console.log('初始化任务数组:');
    console.log(mentionIds);
}

export function processDoneTask(openId){

    console.log('\n读取缓存数组:');
    console.log(mentionIds);
    if(mentionIds === undefined || mentionIds  == null){
        return '';
    }

    if(mentionIds.get(openId)){
        const user = mentionIds.get(openId);
        completeIds.set(user.id, user);

        return user.name;
    }else{
        
        console.log('没有查找到用户信息');
        return '';
    }
}

export function isCompleteTask(){

    if(mentionIds === undefined || mentionIds  == null || mentionIds.size === 0){
        console.log('没有初始化信息');
        return false;
    }

    if(completeIds === undefined || completeIds  == null || completeIds.size === 0){
         console.log('没有完成信息');
        return false;
    }

    if(mentionIds.size - completeIds.size === 0){
        console.log('所有人已完成');
        mentionIds.clear();
        completeIds.clear();
        return true;
    }

    console.log('未完成人数:', resCount);
    return false;
}
