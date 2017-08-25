/**
 * express Server 模块
 * 开启http服务，便于前端页面js直接访问本地html资源
 * author：Shayne C
 * createTime: 2017.3.30
 * updateTime：2017.4.5
 */
const path = require('path')
const express = require('express')
const expressServer = express()
const creatServer = function(lPORT, ldir) {
    let PORT = lPORT || 53480
    let dir = ldir || 'html'
    expressServer.listen(PORT, function() {
        console.log('HTTP Server is running on: http://localhost:%s', PORT)
    })
    console.log(ldir)
    expressServer.use('/', express.static(ldir))
}

module.exports = creatServer
