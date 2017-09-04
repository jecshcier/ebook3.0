const path = require('path')
const config = require(path.resolve(__dirname, process.cwd() + '/config'));
const fs = require('fs-extra')
const request = require('request')

// 重名检测
const fileAutoRename = (dirPath, filePath, itemName, num, callback) => {
    if (!num) {
        num = 0;
    }
    fs.pathExists(filePath).then((exists) => {
        if (exists) {
            // console.log(filePath);
            num++;
            filePath = path.resolve(__dirname, dirPath + '/' + '(' + num + ')' + itemName)
            fileAutoRename(dirPath, filePath, itemName, num, callback);
        } else {
            if (callback) {
                callback(filePath)
            }
        }
    })
}


const startDownload = (url, newName, dirPath) => {
    let itemName = '';
    let writerStream;
    let fileSize = 0;
    let itemSize = 0;
    let filePath = '';
    let progress
    let progressInt
    let info = {
        flag: "",
        message: "",
        data: null,
        itemName: null
    }
    request(url, {timeout: 10000}, (error, response, body) => {
        if (progressInt) {
            clearInterval(progressInt);
        }
        if (!error) {
            writerStream.end();
            if (newName) {
                let newFileName = path.resolve(__dirname, dirPath + '/' + newName)
                fs.renameSync(filePath, newFileName)
                info.flag = "success"
                info.message = "下载成功"
                process.send(info)
                process.exit(0)
            } else {
                info.flag = "success"
                info.message = "下载成功"
                process.send(info)
                process.exit(0)
            }
        } else {
            info.flag = "fail"
            info.message = "网络连接失败"
            process.send(info)
            process.exit(0)
        }
    }).on('data', (data) => {
        // decompressed data as it is received
        writerStream.write(data);
        fileSize += data.length;
        progress = fileSize / itemSize
        progress = (progress * 100).toFixed(2)
    }).on('response', (res) => {
        itemName = res.headers['content-disposition'].replace(/attachment; filename=/, '');
        itemSize = parseInt(res.headers['content-length'])
        filePath = path.resolve(__dirname, dirPath + '/' + itemName);
        info.itemName = itemName
        console.log(filePath)
        writerStream = fs.createWriteStream(filePath)
        writerStream.on('error', (err) => {
            info.flag = "fail"
            info.message = "文件写入失败"
            info.itemName = itemName
            process.send(info)
            process.exit(0)
        });
        info.flag = "start"
        info.message = "开始下载"
        process.send(info)
    })
    progressInt = setInterval(() => {
        info.flag = "progress"
        info.message = ""
        info.data = progress
        process.send(info)
    }, 100)
}

const auto_download = (itemUrl, dirPath, filePath, itemName, itemSize) => {
    let progress;
    let progressInt;
    let info = {
        flag: "",
        message: "",
        data: null,
        itemName: itemName
    }
    // 文件重命名
    fileAutoRename(dirPath, filePath, itemName, 0, (newFilePath) => {
        let writerStream = fs.createWriteStream(newFilePath)
        writerStream.on('error', (err) => {
            info.flag = "fail"
            info.message = "文件写入失败"
            process.send(info)
            process.exit(0)
        });
        let fileSize = 0;
        info.flag = "start"
        info.message = "文件开始下载"
        process.send(info)
        request(itemUrl, {timeout: 10000}, (error, response, body) => {
            if (progressInt) {
                clearInterval(progressInt);
            }
            if (!error) {
                info.flag = "success"
                info.message = "文件下载成功"
                process.send(info)
                process.exit(0)
            } else {
                info.flag = "fail"
                info.message = "网络连接失败"
                process.send(info)
                process.exit(0)
            }
            writerStream.end();
        }).on('response', (res) => {
            console.log(res.headers['content-disposition'].replace(/attachment; filename=/, ''))
        }).on('data', (data) => {
            // decompressed data as it is received
            writerStream.write(data);
            fileSize += data.length;
            progress = fileSize / itemSize
            progress = (progress * 100).toFixed(2)

        })
        progressInt = setInterval(() => {
            info.flag = "progress"
            info.message = ""
            info.data = progress
            process.send(info)
        }, 100)
    })
}

process.on('message', (m) => {
    if (m.type) {
        startDownload(m.url, m.newName, m.dirPath)
    } else {
        auto_download(m.itemUrl, m.dirPath, m.filePath, m.itemName, m.itemSize)
    }
});
