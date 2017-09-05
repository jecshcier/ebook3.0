/************************
 * 渲染进程监听器              *
 * author: Shayne C     *
 * createTime: 2017.4.5 *
 * updateTime: 2017.8.29 *
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
const child = require('child_process')
const download_process = path.resolve(__dirname,__dirname + '/download.js')
const downloadBook_process = path.resolve(__dirname,__dirname + '/book_download.js')
const upload_process = path.resolve(__dirname,__dirname + '/upload.js')
console.log(download_process)
console.log(downloadBook_process)
console.log(upload_process)
let uploadArr = {};
let downloadArr = {};
let downloadNum = 0;

const appEvent = {
    appListener: () => {

        // post请求

        ipc.on('httpPost', function (event, data) {
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

        ipc.on('httpGet', function (event, data) {
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

        ipc.on('httpGet_Query', function (event, data) {
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

        ipc.on('addProcess', function (event, data) {
            let info = {
                flag: false,
                message: '',
                data: null
            }
            let pId = uuid.v4().replace(/-/g, '')
            let currentTime = moment().format("YYYY-MM-DD HH:mm:ss");
            db.serialize(function () {
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
                                $convert_name: data.data[i].convert_name,
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
                                        info.data = {
                                            'id': pId
                                        }
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

        ipc.on('editProcess', function (event, data) {
            let info = {
                flag: false,
                message: '',
                data: null
            }
            let pId = uuid.v4().replace(/-/g, '')
            let currentTime = moment().format("YYYY-MM-DD HH:mm:ss");
            db.serialize(function () {
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
                                            $convert_name: data.data[i].convert_name,
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
            stmt.finalize();
        })

        // 加载所有教学过程
        ipc.on('loadProcess', (event, data) => {
            let info = {
                flag: false,
                message: '',
                data: null
            }
            let stmt = db.prepare("select * from teach_process where user_id = $user_id and book_id = $book_id order by create_time asc");
            stmt.all({
                $user_id: data.data.user_id,
                $book_id: data.data.book_id
            }, (err, row) => {
                stmt.finalize();
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

        // 导出教学过程
        ipc.on('exportProcess', (event, data) => {
            let info = {
                flag: false,
                message: '',
                data: null
            }
            dialog.showOpenDialog({
                'properties': ['openDirectory', 'createDirectory']
            }, (dirPath) => {
                if (dirPath) {
                    let filePath = path.resolve(__dirname, dirPath + '/user.db');
                    fs.pathExists(filePath).then((exists) => {
                        if (exists) {
                            info.message = "文件已存在"
                            event.sender.send(data.callback, JSON.stringify(info));
                        } else {
                            // 创建新db
                            let MyDB = new sqlite3.Database(filePath)
                            MyDB.run(require("./coreConfig").processSql, (err) => {
                                if (err) {
                                    info.message = "错误"
                                    event.sender.send(data.callback, JSON.stringify(info));
                                } else {
                                    MyDB.run(require("./coreConfig").process_files_Sql, (err) => {
                                        if (err) {
                                            info.message = "错误"
                                            event.sender.send(data.callback, JSON.stringify(info));
                                        } else {
                                            // 查找当前用户的教学过程
                                            let stmt = db.prepare("select * from teach_process where user_id = $user_id and book_id = $book_id");

                                            stmt.all({
                                                $user_id: data.data.user_id,
                                                $book_id: data.data.book_id
                                            }, (err, row) => {
                                                stmt.finalize();
                                                if (err) {
                                                    info.message = "错误"
                                                    event.sender.send(data.callback, JSON.stringify(info));
                                                } else {
                                                    // 插入新教学过程到新库
                                                    row.forEach((el, index) => {
                                                        let len1 = row.length - 1;
                                                        let currentNum = index;
                                                        let stmt2 = MyDB.prepare("INSERT INTO teach_process (id,book_id,user_id,page_id,count,pos_x,pos_y,create_time,update_time) VALUES ($id,$book_id,$user_id,$page_id,$count,$pos_x,$pos_y,$create_time,$update_time)");
                                                        stmt2.run({
                                                            $id: el.id,
                                                            $book_id: el.book_id,
                                                            $user_id: el.user_id,
                                                            $page_id: el.page_id,
                                                            $count: el.count,
                                                            $pos_x: el.pos_x,
                                                            $pos_y: el.pos_y,
                                                            $create_time: el.create_time,
                                                            $update_time: el.update_time
                                                        }, (err) => {
                                                            stmt2.finalize();
                                                            if (err) {
                                                                info.message = "插入失败"
                                                                event.sender.send(data.callback, JSON.stringify(info));

                                                            } else {
                                                                // 根据教学过程的id查找相关的文件
                                                                let stmt3 = db.prepare("select * from process_files where process_id = $process_id");
                                                                stmt3.all({
                                                                    $process_id: el.id
                                                                }, (err, file_row) => {
                                                                    stmt3.finalize()
                                                                    if (err) {
                                                                        info.message = "查找失败"
                                                                        event.sender.send(data.callback, JSON.stringify(info));
                                                                    } else {
                                                                        // 查找出来的文件插入到新库中
                                                                        file_row.forEach((el, index) => {
                                                                            let stmt5 = MyDB.prepare("INSERT INTO process_files (id,file_id,process_id,detail_index,file_name,ext_name,convert_name,file_md5,edit_name,create_time,isDownload) VALUES ($id,$file_id,$process_id,$detail_index,$file_name,$ext_name,$convert_name,$file_md5,$edit_name,$create_time,$isDownload)");
                                                                            stmt5.run({
                                                                                $id: el.id,
                                                                                $file_id: el.file_id,
                                                                                $process_id: el.process_id,
                                                                                $detail_index: el.detail_index,
                                                                                $file_name: el.file_name,
                                                                                $ext_name: el.ext_name,
                                                                                $convert_name: el.convert_name,
                                                                                $file_md5: el.file_md5,
                                                                                $edit_name: el.edit_name,
                                                                                $create_time: el.create_time,
                                                                                $isDownload: el.isDownload
                                                                            }, (err) => {
                                                                                stmt5.finalize();
                                                                                if (len1 === currentNum && index === file_row.length - 1) {
                                                                                    info.flag = true
                                                                                    info.message = "导出成功"
                                                                                    event.sender.send(data.callback, JSON.stringify(info));
                                                                                }
                                                                            })
                                                                        })
                                                                    }
                                                                })
                                                            }
                                                        })
                                                    })
                                                }
                                            })
                                        }
                                    })
                                }
                            })
                        }
                    })
                } else {
                    return false;
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
                stmt.finalize();
                if (err) {
                    info.message = "删除失败"
                    event.sender.send(data.callback, JSON.stringify(info));
                } else {
                    let stmt2 = db.prepare("delete from process_files where process_id=$process_id");
                    stmt2.all({
                        $process_id: data.process_id
                    }, (err, row) => {
                        stmt2.finalize();
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
                stmt.finalize();
                if (err) {
                    info.message = "加载失败"
                    event.sender.send(data.callback, JSON.stringify(info));
                } else {
                    info.flag = true
                    info.message = "加载成功"
                    info.data = row
                    console.log(info)
                    event.sender.send(data.callback, JSON.stringify(info));
                }
            })
        })

        ipc.on('downloadBooks', (event, data) => {
            let bookIsbn = data.isbn
            let info = {
                flag: null,
                message: '',
                data: null,
                pid: null
            }
            let url = config.serverUrl + "/update/bymd5str.html?jsonstr="
            let query = {
                count: 0,
                isbn: bookIsbn,
                data: []
            }
            let stringify = JSON.stringify(query);
            console.log(url + stringify);
            request.post(url + stringify, {timeout: 30000}, (error, response, body) => {
                if (error) {
                    info.message = "服务器连接失败"
                    event.sender.send(data.callback, JSON.stringify(info));
                    return;
                }
                if (body) {
                    console.log(body)
                    let result = JSON.parse(body)
                    // console.log(result)
                    if (result.stateCode === '100') {
                        //真.多线程下载 --->
                        let fileArr = result.data;
                        //这里丢一个线程出去处理
                        let p = child.fork(downloadBook_process, [], {})
                        info.flag = 'start'
                        info.message = "开始下载"
                        info.pid = p.pid;
                        event.sender.send(data.callback, JSON.stringify(info));
                        p.send({bookIsbn: bookIsbn, fileArr: fileArr})
                        p.on('message', function (m) {
                            if (m.id === 'kill') {
                                process.kill(p.pid)
                                console.log("线程结束")
                                info.flag = 'fail'
                                info.message = "下载失败"
                                event.sender.send(data.callback, JSON.stringify(info));
                            }
                            else if (m.id === 'ok') {
                                info.flag = 'success'
                                info.message = "下载成功"
                                process.kill(p.pid)
                                event.sender.send(data.callback, JSON.stringify(info));
                            } else if (m.id === 'progress') {
                                console.log('------->')
                                console.log(m.data)
                                info.flag = "progress"
                                info.message = ''
                                info.data = m.data
                                event.sender.send(data.callback, JSON.stringify(info));
                            }
                        });
                        p.on('close', (code) => {
                            "use strict";
                            console.log('线程结束标识：' + code)
                        })
                        console.log('child_process pid = ' + p.pid)
                    } else {
                        let result = JSON.parse(body)
                        info.message = result.comment
                        event.sender.send(data.callback, JSON.stringify(info));
                    }
                } else {
                    console.log('请求错误')
                    info.message = "服务器错误"
                    event.sender.send(data.callback, JSON.stringify(info));
                }
            })

        })

        ipc.on('killProcess', (event, data) => {
            "use strict";
            let info = {
                flag: false,
                message: '',
                data: null
            }
            try {
                process.kill(data.pid)
            } catch (e) {
                console.log(e)
                info.message = "错误！"
                event.sender.send(data.callback, JSON.stringify(info));
                return;
            }
            info.message = "成功！"
            event.sender.send(data.callback, JSON.stringify(info));
        })

        ipc.on('deleteBook', (event, data) => {
            "use strict";
            let info = {
                flag: false,
                message: '',
                data: null
            }
            let bookPath = path.resolve(__dirname, config.bookUrl + '/' + data.isbn)
            fs.emptyDir(bookPath).then(() => {
                return fs.rmdir(bookPath)
            }, (err) => {
                info.message = "删除失败" + err
                event.sender.send(data.callback, JSON.stringify(info));
            }).then(() => {
                info.flag = true
                info.message = "删除成功"
                event.sender.send(data.callback, JSON.stringify(info));
            }, (err) => {
                info.message = "删除失败" + err
                event.sender.send(data.callback, JSON.stringify(info));
            })
        })


        ipc.on('getBookList', (event, data) => {
            "use strict";
            let info = {
                flag: false,
                message: '',
                data: null
            }
            let bookArr = data.bookArr
            let listLen = data.bookArr.length
            let myBookArr = [];
            bookArr.forEach((el,index)=>{
                let bookPath = path.resolve(__dirname, config.bookUrl + '/' + el)
                fs.pathExists(bookPath).then((exists)=>{
                    if(exists) {
                        myBookArr.push(bookArr[index])
                    }
                    if (index === listLen - 1)
                    {
                        info.flag = true
                        info.message = "获取成功"
                        info.data = myBookArr
                        event.sender.send(data.callback, JSON.stringify(info));
                    }
                },(err)=>{
                    info.message = "获取失败" + err
                    event.sender.send(data.callback, JSON.stringify(info));
                    return false;
                })
            })

        })

        ipc.on('getServerUrl', (event, data) => {
            "use strict";
            let info = {
                flag: true,
                message: '',
                data: null
            }
            info.message = "成功！"
            info.data = config.serverUrl
            event.sender.send(data.callback, JSON.stringify(info));
        })

    },
    windowListener: (win) => { // 程序最小化

        ipc.on('minimize', function (event) {
            win.minimize()
            console.log("ok")
        })

        // 程序最大化

        ipc.on('Maximization', function (event) {
            win.maximize()
        })

        // 退出程序
        ipc.on('exit', function (event) {
            app.quit();
        })

        // 全屏
        ipc.on('fullscreen', function (event) {
            if (!win.isFullScreen()) {
                win.setFullScreen(true)
            } else {
                win.setFullScreen(false)
            }
        })

        // 开发者工具
        ipc.on('developTools', function (event) {
            win.webContents.toggleDevTools()

        })

        ipc.on('stopUpload', function (event, data) {
            // console.log(uploadArr[id]);
            if (uploadArr[data.id]) {
                uploadArr[data.id].req.abort();
                event.sender.send(data.callback, "成功");
            } else {
                event.sender.send(data.callback, "失败");
            }
        })
        //
        ipc.on('stopDownload', function (event, data) {
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
            let itemName = item.getFilename();
            let itemUrl = item.getURL();
            let itemSize = item.getTotalBytes();

            let p = child.fork('./apps/download.js', [], {})

            p.on('message', function (m) {
                console.log(m)
                if (m.flag === "start") {
                    let startObj = {
                        'id': p.pid,
                        'itemName': itemName,
                        'message': m.message
                    }
                    win.webContents.send('downloadStart', JSON.stringify(startObj));
                }
                else if (m.flag === "fail") {
                    let stopObj = {
                        'id': p.pid,
                        'itemName': itemName,
                        'message': m.message
                    }
                    win.webContents.send('downloadFailed', JSON.stringify(stopObj));
                }
                else if (m.flag === "success") {
                    let successObj = {
                        'id': p.pid,
                        'itemName': itemName,
                        'message': m.message
                    }
                    win.webContents.send('downloadSuccess', JSON.stringify(successObj))
                }
                else if (m.flag === "progress") {
                    let progressObj = {
                        'id': p.pid,
                        'progress': m.data
                    }
                    win.webContents.send('downloadProgress', JSON.stringify(progressObj));
                }
            })

            p.on('close', (code) => {
                console.log("process EXIT code:" + code)
            })

            // 设置下载路径
            dialog.showOpenDialog({
                'properties': ['openDirectory', 'createDirectory']
            }, (dirPath) => {
                if (dirPath) {
                    let filePath = path.resolve(__dirname, dirPath[0] + '/' + itemName);
                    p.send({
                        type: 0,
                        itemUrl: itemUrl,
                        dirPath: dirPath,
                        filePath: filePath,
                        itemName: itemName,
                        itemSize: itemSize
                    })

                } else {
                    console.log("用户取消下载")
                }
            })
        })

        // 主动下载文件监听
        ipc.on('downloadFile', function (event, data) {
            let p = child.fork('./apps/download.js', [], {})

            p.on('message', function (m) {
                console.log(m)
                if (m.flag === "start") {
                    let startObj = {
                        'id': p.pid,
                        'itemName': m.itemName,
                        'message': m.message
                    }
                    event.sender.send('downloadStart', JSON.stringify(startObj));
                }
                else if (m.flag === "fail") {
                    let stopObj = {
                        'id': p.pid,
                        'itemName': m.itemName,
                        'message': m.message
                    }
                    event.sender.send('downloadFailed', JSON.stringify(stopObj));
                }
                else if (m.flag === "success") {
                    let successObj = {
                        'id': p.pid,
                        'itemName': m.itemName,
                        'message': m.message
                    }
                    event.sender.send('downloadSuccess', JSON.stringify(successObj))
                }
                else if (m.flag === "progress") {
                    let progressObj = {
                        'id': p.pid,
                        'progress': m.data
                    }
                    event.sender.send('downloadProgress', JSON.stringify(progressObj));
                }
            })

            p.on('close', (code) => {
                console.log("process EXIT code:" + code)
            })

            if (!data.url) {
                return false;
            }
            if (data.dialog) {
                dialog.showOpenDialog({
                    'properties': ['openDirectory', 'createDirectory']
                }, (dirPath) => {
                    if (dirPath) {
                        p.send({
                            type: 1,
                            url: data.url,
                            newName: data.newName,
                            dirPath: dirPath[0]
                        })
                    } else {
                        console.log("用户取消下载")
                    }
                })
            } else {
                p.send({
                    type: 1,
                    url: data.url,
                    newName: data.newName,
                    dirPath: path.resolve(__dirname, config.downloadPath)
                })
            }
            // 设置下载路径

        })

        // 上传文件监听
        ipc.on('uploadFiles', function (event, data) {

            let p = child.fork('./apps/upload.js', [], {})

            p.on('message', function (m) {
                if (m.flag === "start") {
                    let startObj = {
                        'id': p.pid,
                        'message': m.message
                    }
                    event.sender.send('uploadStart', JSON.stringify(startObj));
                }
                else if (m.flag === "fail") {
                    let stopObj = {
                        'id': p.pid,
                        'message': m.message
                    }
                    event.sender.send('uploadFailed', JSON.stringify(stopObj));
                }
                else if (m.flag === "success") {
                    let successObj = {
                        'id': p.pid,
                        'message': m.message,
                        'data':m.data
                    }
                    event.sender.send('uploadSuccess', JSON.stringify(successObj))
                }
                else if (m.flag === "progress") {
                    let progressObj = {
                        'id': p.pid,
                        'progress': m.data
                    }
                    event.sender.send('uploadProgress', JSON.stringify(progressObj));
                }
            })

            p.on('close', (code) => {
                console.log("process EXIT code:" + code)
            })
            dialog.showOpenDialog({
                properties: ['openFile', 'multiSelections']
            }, (files) => {
                if (files) {
                    p.send({
                        data: data,
                        files: files
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

module.exports = appEvent
