/**
 * 计算漏验收天数
 * @param {string} input 验收截止日期
 * @returns string 漏验收天数
 */
export function calMissDate(input) {
    const now = new Date();

    const currentYear = now.getFullYear();
    const match = input.match(/(\d+)月(\d+)日/);
    const month = Number(match[1]);
    const day = Number(match[2]);

    const dateInUTC8 = new Date(Date.UTC(currentYear, month - 1, day) - 8 * 3600 * 1000);
    const targetTimestamp = dateInUTC8.getTime();
    const nowTs = Date.now();

    const diffDays = Math.floor((nowTs - targetTimestamp) / (24 * 3600 * 1000));
    if(diffDays <= 0){
        return -1;
    }

    if(diffDays > 14){
        // 超过最大天数
        console.log(`超过最大长度， 过去天数: ${diffDays} 天`);
        return -1;
    }

    console.log(`过去天数: ${diffDays} 天`);
    return `${diffDays}`;
}
