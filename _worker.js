// 导入原gh-proxy的index.js代码
importScripts('https://cdn.jsdelivr.net/gh/LS-Ze/gh-proxy@master/index.js');

// Pages Functions需要的默认导出
export default {
  async fetch(请求, env) {
    // 保留原Worker的fetch处理逻辑
    return handleRequest(请求);
  }
};
