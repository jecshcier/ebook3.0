/**
 * 渲染进程
 * author:chenshenhao
 * createTime:2017.4.5
 * updateTime:2017.8.14
 */
const electron = require('electron')
const shell = electron.shell
const app = electron.ipcRenderer
const BrowserWindow = electron.remote.BrowserWindow
const fs = require('fs')
const path = require('path')
const config = require(path.resolve(__dirname, process.cwd() + '/../config'));


onload = () => {
    document.title = config.title
    let webview = document.getElementById('webview');
    webview.src = config.staticUrl
    webview.addEventListener('console-message', (e) => {
        console.log('Guest page logged a message:', e.message)
    })
    // 此处是对弹出新窗口的拦截，本app目前只支持一个窗口
    webview.addEventListener('new-window', (e) => {
        e.preventDefault();
        webview.loadURL(e.url);
    });
    webview.addEventListener('dom-ready', () => {
        // webview.openDevTools()
        // webview.loadURL();
    })
    webview.addEventListener('keydown', (e) => {
        if (process.platform !== 'darwin') {
            if (e.keyCode === 123) {
                if (webview.isDevToolsOpened()) {
                    webview.closeDevTools()
                } else {
                    webview.openDevTools()
                }
            }
        } else {
            if (e.keyCode === 123) {
                if (webview.isDevToolsOpened()) {
                    webview.closeDevTools()
                } else {
                    webview.openDevTools()
                }
            }
        }
    })
}

const downloadSucess = (event, message) => {
    let obj = JSON.parse(message);
    let webview = document.getElementById('webview');
    webview.send('downloadSuccess', message);
    console.log(obj.id + obj.message)
};
const downloadProgress = (event, message) => {
    let obj = JSON.parse(message);
    let webview = document.getElementById('webview');
    webview.send('downloadProgress', message);
    console.log("下载任务" + obj.id + ":" + obj.progress)
};
const downloadStart = (event, message) => {
    let obj = JSON.parse(message);
    let webview = document.getElementById('webview');
    webview.send('downloadStart', message);
    console.log(obj.id + obj.message)
};
const downloadFailed = (event, message) => {
    let obj = JSON.parse(message);
    let webview = document.getElementById('webview');
    webview.send('downloadFailed', message);
    console.log(obj.id + obj.message)
};
const uploadSucess = (event, message) => {
    let obj = JSON.parse(message);
    let webview = document.getElementById('webview');
    webview.send('uploadSucess', message);
    console.log(obj.id + obj.message)
};
const uploadProgress = (event, message) => {
    let obj = JSON.parse(message);
    let webview = document.getElementById('webview');
    webview.send('uploadProgress', message);
    console.log("上传" + obj.id + ":" + obj.progress)
};
const uploadStart = (event, message) => {
    let obj = JSON.parse(message);
    let webview = document.getElementById('webview');
    webview.send('uploadStart', message);
    console.log(obj.id + obj.message)
};
const uploadFailed = (event, message) => {
    let obj = JSON.parse(message);
    let webview = document.getElementById('webview');
    webview.send('uploadFailed', message);
    console.log(obj.id + obj.message)
};


app.on('uploadProgress', uploadProgress)
app.on('uploadStart', uploadStart)
app.on('uploadSuccess', uploadSucess)
app.on('uploadFailed', uploadFailed)
app.on('downloadProgress', downloadProgress)
app.on('downloadStart', downloadStart)
app.on('downloadSuccess', downloadSucess)
app.on('downloadFailed', downloadFailed)
