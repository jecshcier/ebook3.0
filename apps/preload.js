/************************
 * app预加载js             *
 * author: Shayne C     *
 * createTime: 2017.4.5 *
 * updateTime: 2017.4.5 *
 ************************/

// 挂载全局变量app，作为html调用app主函数的入口
window.app = require('electron').ipcRenderer;
