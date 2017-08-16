/************************
 * 渲染进程监听器              *
 * author: Shayne C     *
 * createTime: 2017.4.5 *
 * updateTime: 2017.8.14 *
 ************************/

const ipc = require('electron').ipcMain
const app = require('electron').app
const dialog = require('electron').dialog
const path = require('path')
const config = require(path.resolve(__dirname, process.cwd() + '/config'));
const request = require('request')
const fs = require('fs-extra')
const querystring = require('querystring');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(config.dbUrl);
const uuid = require('uuid')
const moment = require('moment');

let uploadArr = {};
let downloadArr = {};
let downloadNum = 0;

const appEvent = {
    appListener: () => {

        // post请求

        ipc.on('httpPost', function(event, data) {
            let info = {
                flag: false,
                message: '',
                data: null
            }
            request.post({
                url: data.url,
                body: data.data,
                json: true
            }, function optionalCallback(err, httpResponse, body) {
                if (err) {
                    info.message = err
                    event.sender.send(data.callback, info);
                    return console.error('error:', err)
                }
                info.flag = true
                info.message = "请求成功"
                info.data = body
                info = JSON.stringify(info)
                event.sender.send(data.callback, info);
            });
        })

        // get请求

        ipc.on('httpGet', function(event, data) {
            let info = {
                flag: false,
                message: '',
                data: null
            }
            request.get({
                url: data.url
            }, function optionalCallback(err, httpResponse, body) {
                if (err) {
                    info.message = err;
                    event.sender.send(data.callback, info);
                    return console.error('error:', err)
                }
                info.flag = true
                info.message = "请求成功"
                info.data = body
                info = JSON.stringify(info)
                event.sender.send(data.callback, info);
            });
        })

        // get请求query方式

        ipc.on('httpGet_Query', function(event, data) {
            let info = {
                flag: false,
                message: '',
                data: null
            }
            var stringify = querystring.stringify(data.data);
            request.get({
                url: data.url + '?' + stringify
            }, function optionalCallback(err, httpResponse, body) {
                if (err) {
                    info.message = err;
                    event.sender.send(data.callback, info);
                    return console.error('error:', err)
                }
                info.flag = true
                info.message = "请求成功"
                info.data = body
                info = JSON.stringify(info)
                event.sender.send(data.callback, info);
            });
        })

        // 新建教学过程

        ipc.on('addProcess', function(event, data) {
            // console.log(uuid.v4())
            // let pId = uuid.v4()
            // let currentTime = moment().format("YYYY-MM-DD HH:mm:ss");
            // db.serialize(function() {
            //     let stmt = db.prepare("INSERT INTO teach_process (id,book_id,user_id,page_id,count,pos_x,pos_y,create_time,update_time) VALUES ($id,$book_id,$user_id,$page_id,$count,$pos_x,$pos_y,$create_time,$update_time)");
            //     stmt.run({
            //         $id: pId,
            //         $book_id: data.info.book_id,
            //         $user_id: data.info.user_id,
            //         $page_id: data.info.page_id,
            //         $count: data.info.count,
            //         $pos_x: data.info.pos_x,
            //         $pos_y: data.info.pos_y,
            //         $create_time: currentTime,
            //         $update_time: currentTime
            //     });
            //     stmt.finalize();
            //     for (var i = 0; i < data.data.length; i) {
            //         let resourceID = uuid.v4()；
            //         let stmt2 = db.prepare("INSERT INTO process_files (id,file_id,process_id,detail_index,file_name,ext_name,convert_name,edit_name,create_time,update_time) VALUES ($id,$file_id,$process_id,$detail_index,$file_name,$ext_name,$convert_name,$edit_name,$create_time,$update_time)");
            //         stmt2.run({
            //             $id: resourceID,
            //             $file_id: data.data[i].file_id,
            //             $process_id: pId,
            //             $detail_index: data.data[i].detail_index,
            //             $file_name: data.data[i].file_name,
            //             $ext_name: data.data[i].ext_name,
            //             $convert_name: null,
            //             $edit_name: data.data[i].edit_name,
            //             $create_time: currentTime,
            //             $update_time:currentTime
            //         });
            //         stmt2.finalize();
            //     }
            //
            // });
            // event.sender.send(data.callback, 'ok');
        })

    },
    windowListener: (win) => { // 程序最小化

        ipc.on('minimize', function(event) {
            win.minimize()
            console.log("ok")
        })

        // 程序最大化

        ipc.on('Maximization', function(event) {
            win.maximize()
        })

        // 退出程序
        ipc.on('exit', function(event) {
            app.quit();
        })

        // 全屏
        ipc.on('fullscreen', function(event) {
            if (!win.isFullScreen()) {
                win.setFullScreen(true)
            } else {
                win.setFullScreen(false)
            }
        })

        // 开发者工具
        ipc.on('developTools', function(event) {
            win.webContents.toggleDevTools()

        })

        ipc.on('stopUpload', function(event, data) {
            // console.log(uploadArr[id]);
            if (uploadArr[data.id]) {
                uploadArr[data.id].req.abort();
                event.sender.send(data.callback, "成功");
            } else {
                event.sender.send(data.callback, "失败");
            }
        })
        //
        ipc.on('stopDownload', function(event, data) {
            // console.log(uploadArr[id]);
            if (downloadArr[data.id]) {
                // console.log(downloadArr[data.id])
                downloadArr[data.id].req.abort();
                event.sender.send(data.callback, "成功");
            } else {
                event.sender.send(data.callback, "失败");
            }
        })

        // 监听下载事件
        win.webContents.session.on('will-download', (event, item, webContents) => {
            event.preventDefault();
            var itemName = item.getFilename();
            var itemUrl = item.getURL();
            var itemSize = item.getTotalBytes();
            // 设置下载路径
            dialog.showOpenDialog({
                'properties': ['openDirectory', 'createDirectory']
            }, (dirPath) => {
                if (dirPath) {
                    let filePath = path.resolve(__dirname, dirPath[0] + '/' + itemName);
                    let download_id = downloadNum;
                    // 文件重命名
                    fileAutoRename(dirPath, filePath, itemName, 0, (newFilePath) => {
                        let writerStream = fs.createWriteStream(newFilePath)
                        writerStream.on('error', (err) => {
                            let stopObj = {
                                'id': download_id,
                                'itemName': itemName,
                                'message': "文件写入失败"
                            }
                            delete downloadArr[download_id];
                            win.webContents.send('downloadFailed', JSON.stringify(stopObj));
                        });
                        let fileSize = 0;
                        let startObj = {
                            'id': download_id,
                            'itemName': itemName,
                            "message": "开始下载"
                        }
                        win.webContents.send('downloadStart', JSON.stringify(startObj));
                        downloadArr[download_id] = request(itemUrl, (error, response, body) => {
                            if (!error) {
                                let successObj = {
                                    'id': download_id,
                                    'itemName': itemName,
                                    'message': "下载成功"
                                }
                                delete downloadArr[download_id];
                                win.webContents.send('downloadSuccess', JSON.stringify(successObj));
                            } else {
                                let stopObj = {
                                    'id': download_id,
                                    'itemName': itemName,
                                    'message': "网络连接失败"
                                }
                                delete downloadArr[download_id];
                                win.webContents.send('downloadFailed', JSON.stringify(stopObj));
                            }
                            writerStream.end();
                        }).on('response', (res) => {
                            console.log(res.headers['content-disposition'].replace(/attachment; filename=/, ''))
                        }).on('data', (data) => {
                            // decompressed data as it is received
                            writerStream.write(data);
                            fileSize += data.length;
                            let progress = fileSize / itemSize
                            let progressObj = {
                                'id': download_id,
                                'progress': progress
                            }
                            win.webContents.send('downloadProgress', JSON.stringify(progressObj));
                        })
                    })
                } else {
                    console.log("用户取消下载")
                }
                downloadNum++;
            })
        })

        // 下载文件监听
        ipc.on('downloadFile', function(event, url) {
            // 设置下载路径
            dialog.showOpenDialog({
                'properties': ['openDirectory', 'createDirectory']
            }, (dirPath) => {
                if (dirPath) {
                    let download_id = downloadNum;
                    let itemName = '';
                    let writerStream;
                    let fileSize = 0;
                    let itemSize = 0;
                    downloadArr[download_id] = request(url, (error, response, body) => {
                        if (!error) {
                            let successObj = {
                                'id': download_id,
                                'itemName': itemName,
                                'message': "下载成功"
                            }
                            delete downloadArr[download_id];
                            win.webContents.send('downloadSuccess', JSON.stringify(successObj));
                        } else {
                            let stopObj = {
                                'id': download_id,
                                'itemName': itemName,
                                'message': "网络连接失败"
                            }
                            delete downloadArr[download_id];
                            win.webContents.send('downloadFailed', JSON.stringify(stopObj));
                        }
                        writerStream.end();
                    }).on('data', (data) => {
                        // decompressed data as it is received
                        writerStream.write(data);
                        fileSize += data.length;
                        let progress = fileSize / itemSize
                        let progressObj = {
                            'id': download_id,
                            'progress': progress
                        }
                        win.webContents.send('downloadProgress', JSON.stringify(progressObj));
                    }).on('response', (res) => {
                        itemName = res.headers['content-disposition'].replace(/attachment; filename=/, '');
                        itemSize = parseInt(res.headers['content-length'])
                        let filePath = path.resolve(__dirname, dirPath[0] + '/' + itemName);
                        writerStream = fs.createWriteStream(filePath)
                        writerStream.on('error', (err) => {
                            let stopObj = {
                                'id': download_id,
                                'itemName': itemName,
                                'message': "文件写入失败"
                            }
                            delete downloadArr[download_id];
                            win.webContents.send('downloadFailed', JSON.stringify(stopObj));
                        });
                        let startObj = {
                            'id': download_id,
                            'itemName': itemName,
                            "message": "开始下载"
                        }
                        win.webContents.send('downloadStart', JSON.stringify(startObj));
                    })
                } else {
                    console.log("用户取消下载")
                }
                downloadNum++;
            })
        })

        // 上传文件监听

        ipc.on('uploadFiles', function(event, data) {
            dialog.showOpenDialog({
                properties: ['openFile', 'multiSelections']
            }, (files) => {
                if (files) {
                    let upload_id = downloadNum;
                    let fileWholeSize = 0;
                    let uploadUrl = data.url
                    delete data.url
                    let fileArr = [];
                    files.forEach((el, index) => {
                        console.log(index);
                        console.log(el);
                        let fileObj = fs.statSync(el)
                        console.log(fileObj.size);
                        fileWholeSize += fileObj.size
                        fileArr.push(fs.createReadStream(files[index]))
                    })
                    data.upload_file = fileArr[0]
                    let timer;
                    let startObj = {
                        'id': upload_id,
                        'message': '开始上传'
                    }
                    win.webContents.send('uploadStart', JSON.stringify(startObj));
                    console.log("上传中...");
                    uploadArr[upload_id] = request.post({
                        url: uploadUrl,
                        formData: data
                    }, function optionalCallback(err, httpResponse, body) {
                        if (err) {
                            let failObj = {
                                'id': upload_id,
                                'message': '上传失败'
                            }
                            delete uploadArr[upload_id];
                            win.webContents.send('uploadFailed', JSON.stringify(failObj));
                            return console.error('upload failed:', err);
                        }
                        console.log('上传ok');
                        // clearInterval(timer);
                        let successObj = {
                            'id': upload_id,
                            'message': '上传成功'
                        }
                        delete uploadArr[upload_id];
                        win.webContents.send('uploadSuccess', JSON.stringify(successObj));
                    }).on('drain', (data) => {
                        console.log(uploadArr[upload_id].req.connection._bytesDispatched)
                        console.log(fileWholeSize)
                        console.log(uploadArr[upload_id].req.connection._httpMessage._headers['content-length'])
                        let progress = uploadArr[upload_id].req.connection._bytesDispatched / fileWholeSize;
                        let progressObj = {
                            'id': upload_id,
                            'progress': progress
                        }
                        win.webContents.send('uploadProgress', JSON.stringify(progressObj));
                        console.log(progress)
                    })

                } else {
                    console.log("用户取消了上传");
                }
            })
        })
    }
}

const fileDelete = (filePath) => {
    fs.ensureFile(filePath).then(() => {
        return fs.remove(filePath)
    }, (err) => {
        console.error(err)
    }).then(() => {
        console.log("删除成功");
    }, () => {
        console.log("删除失败");
    })
}

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

module.exports = appEvent
