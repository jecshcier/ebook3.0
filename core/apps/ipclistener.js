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
const md5File = require('md5-file')

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
            let info = {
                flag: false,
                message: '',
                data: null
            }
            let pId = uuid.v4().replace(/-/g, '')
            let currentTime = moment().format("YYYY-MM-DD HH:mm:ss");
            db.serialize(function() {
                let stmt = db.prepare("INSERT INTO teach_process (id,book_id,user_id,page_id,count,pos_x,pos_y,create_time,update_time) VALUES ($id,$book_id,$user_id,$page_id,$count,$pos_x,$pos_y,$create_time,$update_time)");
                stmt.run({
                    $id: pId,
                    $book_id: data.info.book_id,
                    $user_id: data.info.user_id,
                    $page_id: data.info.page_id,
                    $count: data.info.count,
                    $pos_x: data.info.pos_x,
                    $pos_y: data.info.pos_y,
                    $create_time: currentTime,
                    $update_time: currentTime
                }, (err) => {
                    stmt.finalize();
                    if (err) {
                        info.message = "新建教学过程错误"
                        event.sender.send(data.callback, JSON.stringify(info));
                        return false;
                    } else {
                        for (let i = 0; i < data.data.length; i++) {
                            let resourceID = uuid.v4().replace(/-/g, '')
                            let stmt2 = db.prepare("INSERT INTO process_files (id,file_id,process_id,detail_index,file_name,ext_name,convert_name,edit_name,create_time) VALUES ($id,$file_id,$process_id,$detail_index,$file_name,$ext_name,$convert_name,$edit_name,$create_time)");
                            stmt2.run({
                                $id: resourceID,
                                $file_id: data.data[i].file_id,
                                $process_id: pId,
                                $detail_index: data.data[i].detail_index,
                                $file_name: data.data[i].file_name,
                                $ext_name: data.data[i].ext_name,
                                $convert_name: data.data[i].file_id + '.' + data.data[i].ext_name,
                                $edit_name: data.data[i].edit_name,
                                $create_time: currentTime
                            }, (err) => {
                                stmt2.finalize();
                                if (err) {
                                    info.message = "新建教学过程错误"
                                    event.sender.send(data.callback, JSON.stringify(info));
                                    return false;
                                } else {
                                    if (i == data.data.length - 1) {
                                        info.flag = true
                                        info.message = "新建教学过程成功"
                                        event.sender.send(data.callback, JSON.stringify(info));
                                    }
                                }
                            });
                        }

                    }
                });
            });
        })

        // 更新教学过程

        ipc.on('editProcess', function(event, data) {
            let info = {
                flag: false,
                message: '',
                data: null
            }
            let pId = uuid.v4().replace(/-/g, '')
            let currentTime = moment().format("YYYY-MM-DD HH:mm:ss");
            db.serialize(function() {
                if (data.data) {
                    let stmt = db.prepare("update teach_process set update_time = $update_time,pos_x = $pos_x,pos_y=$pos_y,count = $count where id = $id");
                    stmt.run({
                        $pos_x: data.info.pos_x,
                        $pos_y: data.info.pos_y,
                        $count: data.info.count,
                        $id: data.info.id,
                        $update_time: currentTime
                    }, (err) => {
                        stmt.finalize();
                        if (err) {
                            info.message = "编辑教学过程错误"
                            event.sender.send(data.callback, JSON.stringify(info));
                            return false;
                        } else {
                            let stmt3 = db.prepare("delete from process_files where process_id = $id");
                            stmt3.run({
                                $id: data.info.id
                            }, (err) => {
                                stmt3.finalize();
                                if (err) {
                                    info.message = "编辑教学过程错误"
                                    event.sender.send(data.callback, JSON.stringify(info));
                                    return false;
                                } else {
                                    for (let i = 0; i < data.data.length; i++) {
                                        let resourceID = uuid.v4().replace(/-/g, '')
                                        let stmt2 = db.prepare("INSERT INTO process_files (id,file_id,process_id,detail_index,file_name,ext_name,convert_name,edit_name,isDownload,create_time) VALUES ($id,$file_id,$process_id,$detail_index,$file_name,$ext_name,$convert_name,$edit_name,$isDownload,$create_time)");
                                        stmt2.run({
                                            $id: resourceID,
                                            $file_id: data.data[i].file_id,
                                            $process_id: data.info.id,
                                            $detail_index: data.data[i].detail_index,
                                            $file_name: data.data[i].file_name,
                                            $ext_name: data.data[i].ext_name,
                                            $convert_name: null,
                                            $edit_name: data.data[i].edit_name,
                                            $isDownload: data.data[i].isDownload,
                                            $create_time: currentTime
                                        }, (err) => {
                                            stmt2.finalize();
                                            console.log("a")
                                            if (err) {
                                                info.message = "编辑教学过程错误"
                                                event.sender.send(data.callback, JSON.stringify(info));
                                                return false;
                                            } else {
                                                console.log(i)
                                                console.log(data.data.length - 1)
                                                if (i == data.data.length - 1) {
                                                    info.flag = true
                                                    info.message = "编辑教学过程成功"
                                                    console.log(JSON.stringify(info))
                                                    event.sender.send(data.callback, JSON.stringify(info));
                                                }
                                            }
                                        });
                                    }
                                }
                            });
                        }
                    })
                } else {
                    let stmt = db.prepare("update teach_process set update_time = $update_time,pos_x = $pos_x,pos_y=$pos_y where id = $id");
                    stmt.run({
                        $pos_x: data.info.pos_x,
                        $pos_y: data.info.pos_y,
                        $id: data.info.id,
                        $update_time: currentTime
                    }, (err) => {
                        stmt.finalize();
                        if (err) {
                            info.message = "编辑教学过程错误"
                            event.sender.send(data.callback, JSON.stringify(info));
                            return false;
                        } else {
                            info.flag = true
                            info.message = "编辑教学过程成功"
                            console.log(JSON.stringify(info))
                            event.sender.send(data.callback, JSON.stringify(info));
                        }
                    })
                }
            });
        })

        // 查找文件是否存在

        ipc.on('fileIsExsit', (event, data) => {
            let info = {
                flag: false,
                message: '',
                data: null
            }
            let filePath = path.resolve(__dirname, config.downloadPath + '/' + data.fileName)
            fs.pathExists(filePath).then((exists) => {
                if (exists) {
                    info.flag = true
                    info.message = "文件已存在"
                    event.sender.send(data.callback, JSON.stringify(info));
                } else {
                    info.flag = false
                    info.message = "文件不存在"
                    event.sender.send(data.callback, JSON.stringify(info));
                }
            })
        })

        // 更新文件状态位
        ipc.on('fileIsDownloaded', (event, data) => {
            let info = {
                flag: false,
                message: '',
                data: null
            }
            let stmt = db.prepare("update process_files set isDownload = 1 where file_id = $id");
            stmt.run({
                $id: data.file_id
            }, (err) => {
                if (err) {
                    info.message = "更新失败"
                    event.sender.send(data.callback, JSON.stringify(info));
                } else {
                    info.flag = true
                    info.message = "更新成功"
                    event.sender.send(data.callback, JSON.stringify(info));
                }
            })
        })


        // 加载所有教学过程
        ipc.on('loadProcess', (event, data) => {
            let info = {
                flag: false,
                message: '',
                data: null
            }
            let stmt = db.prepare("select * from teach_process order by create_time asc");
            stmt.all({}, (err, row) => {
                if (err) {
                    info.message = "加载失败"
                    event.sender.send(data.callback, JSON.stringify(info));
                } else {
                    info.flag = true
                    info.message = "加载成功"
                    info.data = row
                    event.sender.send(data.callback, JSON.stringify(info));
                }
            })
        })

        // 删除教学过程
        ipc.on('deleteProcess', (event, data) => {
            let info = {
                flag: false,
                message: '',
                data: null
            }
            let stmt = db.prepare("delete from teach_process where id=$process_id");
            stmt.all({
                $process_id: data.process_id
            }, (err) => {
                if (err) {
                    info.message = "删除失败"
                    event.sender.send(data.callback, JSON.stringify(info));
                } else {
                    let stmt2 = db.prepare("delete from process_files where process_id=$process_id");
                    stmt2.all({
                        $process_id: data.process_id
                    }, (err,row) => {
                        if (err) {
                            info.message = "删除失败"
                            event.sender.send(data.callback, JSON.stringify(info));
                        } else {
                            info.flag = true
                            info.message = "删除成功"
                            event.sender.send(data.callback, JSON.stringify(info));
                        }
                    })
                }
            })
        })

        //
        // 加载教学过程中的文件
        ipc.on('loadProcessFiles', (event, data) => {
            let info = {
                flag: false,
                message: '',
                data: null
            }
            let stmt = db.prepare("select * from process_files where process_id = $process_id order by detail_index asc");
            stmt.all({
                $process_id: data.process_id
            }, (err, row) => {
                if (err) {
                    info.message = "加载失败"
                    event.sender.send(data.callback, JSON.stringify(info));
                } else {
                    info.flag = true
                    info.message = "加载成功"
                    info.data = row
                    event.sender.send(data.callback, JSON.stringify(info));
                }
            })
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
                downloadArr[data.id].req.abort();
                event.sender.send(data.callback, "成功");
            } else {
                event.sender.send(data.callback, "失败");
            }
        })

        // 监听window默认下载事件
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
                    let progress;
                    let progressInt;
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
                            if (progressInt) {
                                clearInterval(progressInt);
                            }
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
                            progress = fileSize / itemSize
                            progress = (progress * 100).toFixed(2)

                        })
                        progressInt = setInterval(() => {
                            let progressObj = {
                                'id': download_id,
                                'progress': progress
                            }
                            win.webContents.send('downloadProgress', JSON.stringify(progressObj));
                        }, 500)
                    })
                } else {
                    console.log("用户取消下载")
                }
                downloadNum++;
            })
        })

        // 主动下载文件监听
        ipc.on('downloadFile', function(event, data) {
            if (!data.url) {
                return false;
            }
            if (data.dialog) {
                dialog.showOpenDialog({
                    'properties': ['openDirectory', 'createDirectory']
                }, (dirPath) => {
                    if (dirPath) {
                        startDownload(data.url, data.newName, dirPath[0], win, event)
                    } else {
                        console.log("用户取消下载")
                    }
                    downloadNum++;
                })
            } else {
                startDownload(data.url, data.newName, path.resolve(__dirname, config.downloadPath), win, event)
                downloadNum++;
            }
            // 设置下载路径

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
                    let timer;
                    let startObj = {
                        'id': upload_id,
                        'message': '开始上传'
                    }
                    event.sender.send('uploadStart', JSON.stringify(startObj));
                    console.log("上传中...");
                    uploadArr[upload_id] = request.post({
                        url: uploadUrl,
                        formData: data.data
                    }, function optionalCallback(err, httpResponse, body) {
                        if (err || httpResponse.statusCode !== 200) {
                            let failObj = {
                                'id': upload_id,
                                'message': '上传失败'
                            }
                            delete uploadArr[upload_id];
                            event.sender.send('uploadFailed', JSON.stringify(failObj));
                            return console.error('upload failed:', err);
                        } else {
                            let successObj = {
                                'id': upload_id,
                                'message': '请求成功',
                                'body': JSON.parse(body)
                            }
                            console.log(successObj);
                            delete uploadArr[upload_id];
                            event.sender.send('uploadSuccess', JSON.stringify(successObj));
                        }
                    }).on('drain', (data) => {
                        let progress = uploadArr[upload_id].req.connection._bytesDispatched / fileWholeSize;
                        progress = (progress * 100).toFixed(2)
                        let progressObj = {
                            'id': upload_id,
                            'progress': progress
                        }
                        event.sender.send('uploadProgress', JSON.stringify(progressObj));
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

const startDownload = (url, newName, dirPath, win, event) => {
    let download_id = downloadNum;
    let itemName = '';
    let writerStream;
    let fileSize = 0;
    let itemSize = 0;
    let filePath = '';
    let progress
    let progressInt
    downloadArr[download_id] = request(url, (error, response, body) => {
        if (progressInt) {
            clearInterval(progressInt);
        }
        if (!error) {
            writerStream.end();
            let successObj = {
                'id': download_id,
                'itemName': itemName,
                'message': "下载成功"
            }
            if (newName) {
                let newFileName = path.resolve(__dirname, dirPath + '/' + newName)
                fs.renameSync(filePath, newFileName)
                event.sender.send('downloadSuccess', JSON.stringify(successObj));
            } else {
                delete downloadArr[download_id];
                event.sender.send('downloadSuccess', JSON.stringify(successObj));
            }
        } else {
            let stopObj = {
                'id': download_id,
                'itemName': itemName,
                'message': "网络连接失败"
            }
            delete downloadArr[download_id];
            event.sender.send('downloadFailed', JSON.stringify(stopObj));
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
        writerStream = fs.createWriteStream(filePath)
        writerStream.on('error', (err) => {
            let stopObj = {
                'id': download_id,
                'itemName': itemName,
                'message': "文件写入失败"
            }
            delete downloadArr[download_id];
            event.sender.send('downloadFailed', JSON.stringify(stopObj));
        });
        let startObj = {
            'id': download_id,
            'itemName': itemName,
            "message": "开始下载"
        }
        event.sender.send('downloadStart', JSON.stringify(startObj));
    })
    progressInt = setInterval(() => {
        let progressObj = {
            'id': download_id,
            'progress': progress
        }
        event.sender.send('downloadProgress', JSON.stringify(progressObj));
    }, 100)
}

module.exports = appEvent
