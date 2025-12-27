// 动态加载原gh-proxy代码
let handleRequest;

// 加载并执行原gh-proxy代码
async function loadGhProxy() {
  if (handleRequest) return;
  
  try {
    // 获取原gh-proxy的index.js代码
    const response = await fetch('https://cdn.jsdelivr.net/gh/LS-Ze/gh-proxy@master/index.js');
    const code = await response.text();
    
    // 创建一个函数来执行代码并捕获handleRequest
    const func = new Function('exports', code + '; return handleRequest;');
    handleRequest = func({});
    
    console.log('gh-proxy code loaded successfully');
  } catch (error) {
    console.error('Failed to load gh-proxy:', error);
    throw error;
  }
}

// Pages Functions导出
export default {
  async fetch(请求, env) {
    try {
      // 确保gh-proxy代码已加载
      await loadGhProxy();
      
      // 使用原gh-proxy的handleRequest函数处理请求
      return handleRequest(请求);
    } catch (error) {
      console.error('Proxy error:', error);
      return new Response('Proxy error: ' + error.message, {
        status: 500,
        headers: {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  },
};
