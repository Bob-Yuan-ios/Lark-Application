const seenEvents = new Set();
const seenCards = new Set();

/**
 * 响应事件防重复触发
 * @param {string} id 
 * @returns 
 */
export function dedupEvent(id){
    if(seenEvents.has(id)) return true;

    seenEvents.add(id);
    return false;
}

/**
 * 卡片回调防重复触发
 * @param {string} id 
 * @returns 
 */
export function dedupCard(id){
    if(seenCards.has(id)) return true;

    seenCards.add(id);
    return false;
}
