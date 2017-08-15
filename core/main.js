/*************************
 * 主函数                   *
 * author: Shayne C      *
 * createTime:2016.12.28 *
 * updateTime:2017.8.1   *
 *************************/

const {
    app,
    globalShortcut,
    BrowserWindow,
    session
} = require('electron')
const path = require('path')
const url = require('url')
const ipclistener = require('./apps/ipclistener')
const fs = require('fs')
const config = require(process.cwd() + '/../config');


// 若需要用到httpServer，则创建httpServer

if (config.useServer) {
    const creatServer = require('./apps/server')

    // 创建httpServer
    let PORT = config.localServerConfig.PORT
    let root = config.localServerConfig.root
    creatServer(PORT, root)
}

// 发起app监听

ipclistener.appListener();

// 创建窗口对象

let defaultUrl = url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
})

let win

// app加载完成事件

app.on('ready', () => {

    // 创建窗口

    win = createWindow({
        minWidth: config.minWidth,
        minHeight: config.minHeight,
        width: config.width,
        height: config.height,
        title: config.title,
        center: true,
        fullscreen:config.fullscreen,
        fullscreenable:config.fullscreenable
    }, defaultUrl)

    // 发起window监听

    ipclistener.windowListener(win);

})

// app监听窗口关闭事件
app.on('window-all-closed', () => {

    // 判断是否为mac os，若为mac os 启用command+q
    if (process.platform !== 'darwin') {
        app.quit()
    }
    win = null
})

app.on('activate', () => {

    // 此处为了适应mac os的dock
    if (win === null) {
        win = createWindow({
            minWidth: config.minWidth,
            minHeight: config.minHeight,
            width: config.width,
            height: config.height,
            title: config.title,
            center: true,
            fullscreen:config.fullscreen,
            fullscreenable:config.fullscreenable
        }, defaultUrl)
    }
})

// 全局键盘监听事件

function registerShortcut() {

    // 开发者工具

    // globalShortcut.register('CommandOrControl+Shift+i', () => {
    //     win.webContents.toggleDevTools()
    // })

    // 全屏

    globalShortcut.register('F2', () => {
        if (!win.isFullScreen()) {
            win.setFullScreen(true)
        } else {
            win.setFullScreen(false)
        }
    })
}

// 创建窗口函数

function createWindow(option, defaultUrl) {

    let mainWindow

    // 窗口对象配置

    mainWindow = new BrowserWindow(option)

    // 默认地址设定

    mainWindow.loadURL(defaultUrl)

    // 去除默认菜单

    mainWindow.setMenu(null)

    // 监听窗口关闭事件

    mainWindow.on('closed', (event) => {
        mainWindow = null
    })

    // 窗口失去焦点时移除快捷键以免与系统快捷键冲突

    mainWindow.on('blur', () => {
        let win = BrowserWindow.getFocusedWindow();
        if (win) {
            return;
        }
        globalShortcut.unregisterAll();
    });

    // 窗口获取焦点时绑定快捷键

    mainWindow.on('focus', () => {
        registerShortcut();
    });

    // 监听窗口创建完成事件

    app.on('browser-window-created', function(event, window) {})

    return mainWindow
}
