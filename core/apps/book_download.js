const path = require('path')
const config = require(path.resolve(__dirname,'../config'));
const fs = require('fs-extra')
const request = require('request')

const downloadThread = (num, downloadUrl, path) => {
    return new Promise((resolve, reject) => {
        request(downloadUrl, {timeout: 30000}, (error, response, body) => {
            if (error) {
                console.log("错误" + num)
                let info = {
                    id: num,
                    url: downloadUrl,
                    path: path,
                    error: error
                }
                reject(info)
            }
            resolve(path + "下载完成")
        }).pipe(fs.createWriteStream(path))
    })
}

const downloadBooks = (index, data) => {
    let progress = (tempNum / fileArr.length).toFixed(4)
    process.send({id: 'progress', data: progress})
    if (fileArr.length === tempNum) {
        clearInterval(timer)
        console.log("教材下载完成")
        console.log("耗时" + (time / 1000).toFixed(4) + "秒")
        let mess = {
            id: 'ok',
            code: 1
        }
        process.send(mess)
        return;
    }
    if (!data[index]) {
        return;
    }
    let num = index;
    let reg = new RegExp("(.*?)" + bookIsbn)
    let filePath = path.resolve(__dirname, config.bookUrl + '/' + bookIsbn + data[num].downloadUrl.replace(reg, ""))
    fs.ensureFile(filePath).then(() => {
        downloadThread(num, data[num].downloadUrl, filePath).then((body) => {
            console.log(body)
            if (errArr[num]) {
                delete errArr[num]
            }
            num += threadNum;
            tempNum++;
            downloadBooks(num, data)
        }, (info) => {
            let failNum = info.id
            if (!errArr[failNum]) {
                console.log("任务" + failNum + "下载失败，准备重试……");
                errArr[failNum] = info;
                errArr[failNum].count = 1;
                downloadBooks(failNum, data)
            }
            else {
                //超过三次，直接放弃
                if (errArr[failNum].count > 2) {
                    let mess = {
                        id: 'kill'
                    }
                    process.send(mess)
                }
                else {
                    console.log("任务" + failNum + "下载失败" + errArr[failNum].count + "次，准备重试……");
                    errArr[failNum].count++;
                    downloadBooks(failNum, data)
                }
            }

        })
    }, (err) => {
    })
}
// 已下载的文件数
let tempNum = 0
// 确定开启的线程数
let threadNum = 5
// 计时
let time = 0
let timer = setInterval(() => {
    time += 60;
}, 60)
// 下载失败队列
let errArr = {};

let fileArr = null;
let bookIsbn = null

process.on('message', (m) => {
    fileArr = m.fileArr
    bookIsbn = m.bookIsbn
    if (!fileArr.length) {
        let mess = {
            id: 'ok',
            code: 0
        }
        process.send(mess)
        process.exit(0)
    }
    // 开始下载
    for (let i = 0; i < threadNum; i++) {
        downloadBooks(i, fileArr)
    }
});
