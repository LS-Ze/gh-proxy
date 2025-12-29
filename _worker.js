// Cloudflare Pages Functions for gh-proxy
// 动态远程加载版本 - 完整解决方案

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

// 缓存已加载的模块
let ghProxyModule = null;

// 主处理函数
export default {
  async fetch(request, env) {
    try {
      console.log('Received request:', request.url);
      
      // 初始化gh-proxy（首次请求时）
      if (!ghProxyModule) {
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
    
    // 3. 转换代码为ES模块
    console.log('Transforming code to ES module...');
    const moduleCode = transformToESModule(jsCode, config);
    
    // 4. 创建并加载模块
    console.log('Creating and loading module...');
    ghProxyModule = await createAndLoadModule(moduleCode);
    
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

// 将CommonJS代码转换为ES模块
function transformToESModule(jsCode, config) {
  // 1. 替换配置变量
  jsCode = jsCode.replace(
    /const ASSET_URL = 'https?:\/\/[^']+'/,
    `const ASSET_URL = '${config.ASSET_URL}'`
  );
  
  jsCode = jsCode.replace(
    /const PREFIX = '\/'/,
    `const PREFIX = '${config.PREFIX}'`
  );
  
  jsCode = jsCode.replace(
    /const Config = {\s*jsdelivr: \d\s*}/,
    `const Config = { jsdelivr: ${config.Config.jsdelivr} }`
  );
  
  jsCode = jsCode.replace(
    /const whiteList = \[\s*\]/,
    `const whiteList = ${JSON.stringify(config.whiteList)}`
  );
  
  // 2. 提取fetchHandler函数
  // 查找addEventListener('fetch', ...)调用
  const fetchHandlerMatch = jsCode.match(
    /addEventListener\('fetch',\s*function\s*\(\w+\)\s*\{\s*([\s\S]*?)\s*\}\s*\)/
  );
  
  if (fetchHandlerMatch && fetchHandlerMatch[1]) {
    // 提取函数体
    const fetchHandlerBody = fetchHandlerMatch[1];
    
    // 添加ES模块导出
    jsCode += `\n\nexport async function fetchHandler(event) {\n${fetchHandlerBody}\n}`;
  } else {
    throw new Error('Could not find fetch handler in JS code');
  }
  
  return jsCode;
}

// 创建并加载模块
async function createAndLoadModule(moduleCode) {
  try {
    // 创建Blob
    const blob = new Blob([moduleCode], { type: 'application/javascript' });
    const moduleUrl = URL.createObjectURL(blob);
    
    // 动态导入
    const module = await import(moduleUrl);
    
    // 清理
    URL.revokeObjectURL(moduleUrl);
    
    if (!module.fetchHandler) {
      throw new Error('Module does not export fetchHandler');
    }
    
    return module;
    
  } catch (error) {
    console.error('Module loading failed:', error);
    throw error;
  }
}

// 处理代理请求
async function handleProxyRequest(request) {
  try {
    if (!ghProxyModule || !ghProxyModule.fetchHandler) {
      throw new Error('gh-proxy not initialized properly');
    }
    
    // 模拟FetchEvent
    const event = {
      request: request,
      respondWith: (responsePromise) => responsePromise
    };
    
    // 调用原fetch处理函数
    return await ghProxyModule.fetchHandler(event);
    
  } catch (error) {
    console.error('Proxy request failed:', error);
    throw error;
  }
}
