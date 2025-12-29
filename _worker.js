// Cloudflare Pages Functions for gh-proxy
// 终极解决方案 - 不使用URL.createObjectURL()

// 配置
const CONFIG = {
  // 远程gh-proxy代码URL
  REMOTE_JS_URL: 'https://cdn.jsdelivr.net/gh/LS-Ze/gh-proxy@master/index.js',
  
  // 默认配置（可通过环境变量覆盖）
  DEFAULT_CONFIG: {
    ASSET_URL: 'https://hunshcn.github.io/gh-proxy/',
    PREFIX: '/',
    Config: {
      jsdelivr: 0
    },
    whiteList: []
  }
};

// 存储gh-proxy的fetch处理函数
let fetchHandler = null;

// 主处理函数
export default {
  async fetch(request, env) {
    try {
      console.log('Received request:', request.url);
      
      // 初始化gh-proxy（首次请求时）
      if (!fetchHandler) {
        await initializeGhProxy(env);
      }
      
      // 处理请求
      return await handleProxyRequest(request);
      
    } catch (error) {
      console.error('Fatal error:', error);
      console.error('Error stack:', error.stack);
      return new Response('Proxy error: ' + error.message, {
        status: 500,
        headers: {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
};

// 初始化gh-proxy
async function initializeGhProxy(env) {
  try {
    console.log('Initializing gh-proxy...');
    
    // 1. 获取环境变量配置
    const config = getConfigFromEnv(env);
    
    // 2. 获取远程JS代码
    console.log('Fetching remote JS:', CONFIG.REMOTE_JS_URL);
    const jsCode = await fetchRemoteJS(CONFIG.REMOTE_JS_URL);
    
    // 3. 准备执行环境
    console.log('Preparing execution environment...');
    const executionScope = createExecutionScope(config);
    
    // 4. 执行代码（安全方式）
    console.log('Executing gh-proxy code...');
    executeCodeInScope(jsCode, executionScope);
    
    // 5. 获取fetch处理函数
    fetchHandler = executionScope.fetchHandler;
    
    if (!fetchHandler) {
      throw new Error('Failed to extract fetch handler from code');
    }
    
    console.log('✅ gh-proxy initialized successfully');
    
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    throw error;
  }
}

// 从环境变量获取配置
function getConfigFromEnv(env) {
  const config = { ...CONFIG.DEFAULT_CONFIG };
  
  if (env.ASSET_URL) {
    config.ASSET_URL = env.ASSET_URL;
    console.log('🔧 ASSET_URL:', config.ASSET_URL);
  }
  
  if (env.PREFIX) {
    config.PREFIX = env.PREFIX;
    console.log('🔧 PREFIX:', config.PREFIX);
  }
  
  if (env.JSDELIVR !== undefined) {
    config.Config.jsdelivr = parseInt(env.JSDELIVR);
    console.log('🔧 JSDELIVR:', config.Config.jsdelivr);
  }
  
  if (env.WHITE_LIST) {
    config.whiteList = env.WHITE_LIST.split(',').map(item => item.trim());
    console.log('🔧 WHITE_LIST:', config.whiteList);
  }
  
  return config;
}

// 获取远程JS代码
async function fetchRemoteJS(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch JS: ${response.status} ${response.statusText}`);
  }
  return await response.text();
}

// 创建执行作用域
function createExecutionScope(config) {
  // 创建一个隔离的作用域
  const scope = {
    // 全局对象
    console: console,
    fetch: fetch,
    Response: Response,
    Request: Request,
    Headers: Headers,
    URL: URL,
    
    // 配置变量
    ASSET_URL: config.ASSET_URL,
    PREFIX: config.PREFIX,
    Config: config.Config,
    whiteList: config.whiteList,
    
    // 存储fetch处理函数
    fetchHandler: null,
    
    // 重写addEventListener来捕获fetch处理
    addEventListener: function(type, listener) {
      if (type === 'fetch') {
        console.log('Captured fetch event listener');
        scope.fetchHandler = listener;
      }
    }
  };
  
  return scope;
}

// 在作用域中执行代码
function executeCodeInScope(code, scope) {
  try {
    // 使用函数构造器执行代码（最后手段，但在隔离作用域中）
    const func = new Function('scope', `
      with(scope) {
        ${code}
      }
    `);
    
    func(scope);
    
  } catch (error) {
    console.error('Code execution failed:', error);
    throw error;
  }
}

// 处理代理请求
async function handleProxyRequest(request) {
  try {
    if (!fetchHandler) {
      throw new Error('gh-proxy not initialized properly');
    }
    
    // 模拟FetchEvent
    const event = {
      request: request,
      respondWith: (responsePromise) => responsePromise
    };
    
    // 调用fetch处理函数
    return await fetchHandler(event);
    
  } catch (error) {
    console.error('Proxy request failed:', error);
    throw error;
  }
}
