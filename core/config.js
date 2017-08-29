const config = {
    "title":"ebook3.0",
    "useServer":false,
    "localServerConfig":{
        "PORT":53480,
        "root":process.cwd() + "/../html"
    },
    "width":800,
    "height":600,
    "minWidth":800,
    "minHeight":600,
    "fullscreen":false,
    "fullscreenable":true,
    "staticUrl":process.cwd() + "/../html/index.html",
    "dbUrl":process.cwd() + "/../userData/user.db",
    "downloadPath":process.cwd() + "/../userData"
}

module.exports = config
