import dayjs from 'dayjs';

// 测试代码
export async function test() {

    const userA = {
        "id":"ou_fe19f72fdf3cb17914be9b409ab5acd4",
        "id_type":"open_id",
        "key":"@_user_1",
        "name":"bob.b",
        "tenant_key":"1608a52e2443d743"
    };

     const userB = {
        "id":"ou_829dab5738b0a1aef15c187811b9a511",
        "id_type":
        "open_id",
        "key":"@_user_2",
        "name":"Tim Yang",
        "tenant_key":"1608a52e2443d743"
    }; 
    const users = [userA, userB];

    const mentionIds = new Map();
    users.forEach(user => {
        if (!mentionIds.get(user.id)){
            console.log(`ID: ${user.id}, Name: ${user.name}`);
            mentionIds.set(user.id, user);
        } 
    });
    console.log('数组信息:');
    console.log(mentionIds);

    const completeIds = new Map(); 


    let open_id = 'ou_fe19f72fdf3cb17914be9b409ab5acd4';
    if(mentionIds.get(open_id)){
        const user = mentionIds.get(open_id);
        completeIds.set(user.id, user);
    }

    if(completeIds.size == mentionIds.size){
        console.log('所有人已完成');
    }else{
        console.log('未完成人数：', mentionIds.size - completeIds.size);
    }

    open_id = 'ou_829dab5738b0a1aef15c187811b9a511';
    if(mentionIds.get(open_id)){
        const user = mentionIds.get(open_id);
        completeIds.set(user.id, user);
    } 

    if(completeIds.size == mentionIds.size){
        console.log('所有人已完成');
    }else{
        console.log('未完成人数：', mentionIds.size - completeIds.size);
    }

    const result = mentionIds.get('ou_fe19f72fdf3cb17914be9b409ab5acd4');
    console.log('缓存的名称：' + result.name);

    robot.saveMentions(users);

    const token = await robot.updateToken();
    console.log('获取到的token信息：', token);

    // 格式化输出时间戳
    console.log(dayjs().format('YYYY-MM-DD HH:mm')); 
}
