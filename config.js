const config = {
    // app名称
    "title": "ebook3.0",
    // 是否使用http服务
    "useServer": false,
    // 本地http服务设置
    "localServerConfig": {
        // 端口
        "PORT": 53480,
        // 根目录
        "root": __dirname + "/html"
    },
    // 初始宽度
    "width": 800,
    // 初始高度
    "height": 600,
    // 最小宽度
    "minWidth": 800,
    // 最小高度
    "minHeight": 600,
    // 全屏模式
    "fullscreen": false,
    // 是否允许全屏
    "fullscreenable": true,
    // 静态根目录
    "staticUrl": __dirname + "/html/doc.html",
    // 本地数据库目录
    "dbUrl": __dirname + "/userData/user.db",
    // 默认资源下载地址
    "downloadPath": __dirname + "/userData",
    // 书本下载目录
    "bookUrl": __dirname + "/html/books",
    // 允许下载书本内容时的最大线程数
    "downloadMaxThread": 5,
    // 服务器地址
    "serverUrl": 'http:// es.tes-sys.com/ebook_services',
    // 书本下载url
    // "bookApiUrl": '/update/bymd5str.html?jsonstr='
    "bookApiUrl": '/update/bymd5str.html'
}

module.exports = config
