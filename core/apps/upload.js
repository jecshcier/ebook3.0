const fs = require('fs-extra')
const request = require('request')

process.on('message', (m) => {
    "use strict";
    let files = m.files
    let info = {
        flag: "",
        message: "",
        data: null
    }
    let data = m.data
    let fileWholeSize = 0;
    let uploadUrl = data.url
    let fileArr = [];


    files.forEach((el, index) => {
        console.log(index);
        console.log(el);
        let fileObj = fs.statSync(el)
        console.log(fileObj.size);
        fileWholeSize += fileObj.size
        fileArr.push(fs.createReadStream(files[index]))
    })
    data.data[data.data.files] = fileArr[0];
    delete data.data.files
    console.log(data.data)
    info.flag = "start"
    info.message = "文件开始上传"
    process.send(info)
    console.log("上传中...");
    let rUpload = request.post({
        url: uploadUrl,
        formData: data.data
    }, function optionalCallback(err, httpResponse, body) {
        console.log(body)
        let bodyObj
        try {
            bodyObj = JSON.parse(body)
        } catch (e) {
            info.flag = "fail"
            info.message = "文件上传失败-->网络错误！"
            process.send(info)
            process.exit(0)
        }
        if (err || httpResponse.statusCode !== 200 || !bodyObj.ok) {
            console.error('upload failed:', err);
            if (bodyObj) {
                info.flag = "fail"
                info.message = "文件上传失败-->" + bodyObj.message
                process.send(info)
                process.exit(0)
            }
            info.flag = "fail"
            info.message = "文件上传失败-->网络错误！"
            process.send(info)
            process.exit(0)
        } else {
            info.flag = "success"
            info.data = bodyObj
            info.message = "文件上传成功"
            process.send(info)
            process.exit(0)
        }
    }).on('drain', (data) => {
        let progress = rUpload.req.connection._bytesDispatched / fileWholeSize;
        progress = (progress * 100).toFixed(2)
        info.flag = "progress"
        info.message = ""
        info.data = progress
        process.send(info)
        console.log(progress)
    })
})