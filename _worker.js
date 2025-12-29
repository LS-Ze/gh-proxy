// Cloudflare Pages Functions for gh-proxy
// 本地文件加载版本 - 最终版

// 全局配置
let config = {
  ASSET_URL: 'https://hunshcn.github.io/gh-proxy/',
  PREFIX: '/',
  Config: {
    jsdelivr: 0
  },
  whiteList: []
};

// 存储原gh-proxy的fetch处理函数
let originalFetchHandler;

// 加载并配置本地gh-proxy
async function initializeGhProxy(env) {
  try {
    // 1. 应用环境变量
    applyEnvironmentVariables(env);
    
    // 2. 保存原始的addEventListener
    const originalAddEventListener = globalThis.addEventListener;
    
    // 3. 重写addEventListener以捕获fetch处理函数
    globalThis.addEventListener = function(type, listener) {
      if (type === 'fetch') {
        originalFetchHandler = listener;
        console.log('Captured fetch handler from index.js');
      } else {
        originalAddEventListener.call(this, type, listener);
      }
    };
    
    // 4. 全局替换配置变量
    globalThis.ASSET_URL = config.ASSET_URL;
    globalThis.PREFIX = config.PREFIX;
    globalThis.Config = config.Config;
    globalThis.whiteList = config.whiteList;
    
    // 5. 加载本地index.js
    console.log('Loading local index.js...');
    await import('./index.js');
    
    // 6. 恢复原始的addEventListener
    globalThis.addEventListener = originalAddEventListener;
    
    if (!originalFetchHandler) {
      throw new Error('No fetch handler found in index.js');
    }
    
    console.log('✅ gh-proxy initialized successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Failed to initialize gh-proxy:', error);
    throw error;
  }
}

// 应用环境变量
function applyEnvironmentVariables(env) {
  if (env.ASSET_URL) {
    config.ASSET_URL = env.ASSET_URL;
    console.log('ASSET_URL:', config.ASSET_URL);
  }
  
  if (env.PREFIX) {
    config.PREFIX = env.PREFIX;
    console.log('PREFIX:', config.PREFIX);
  }
  
  if (env.JSDELIVR !== undefined) {
    config.Config.jsdelivr = parseInt(env.JSDELIVR);
    console.log('JSDELIVR:', config.Config.jsdelivr);
  }
  
  if (env.WHITE_LIST) {
    config.whiteList = env.WHITE_LIST.split(',').map(item => item.trim());
    console.log('WHITE_LIST:', config.whiteList);
  }
}

// 处理请求
async function handleProxyRequest(request) {
  try {
    if (!originalFetchHandler) {
      throw new Error('gh-proxy not initialized');
    }
    
    // 模拟FetchEvent对象
    const event = {
      request: request,
      respondWith: (responsePromise) => responsePromise
    };
    
    // 调用原fetch处理函数
    return await originalFetchHandler(event);
    
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
}

// Pages Functions导出
export default {
  async fetch(request, env) {
    try {
      // 初始化gh-proxy（只执行一次）
      if (!originalFetchHandler) {
        await initializeGhProxy(env);
      }
      
      // 处理请求
      return await handleProxyRequest(request);
      
    } catch (error) {
      console.error('Fatal error:', error);
      return new Response('Fatal error: ' + error.message, {
        status: 500,
        headers: {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
};
