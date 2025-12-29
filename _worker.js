// Cloudflare Pages Functions for gh-proxy
// 增强版 - 更健壮的代码分析

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
    
    // 3. 增强日志：显示获取的代码前200字符
    console.log('Fetched JS code preview:', jsCode.substring(0, 200) + '...');
    
    // 4. 转换代码为ES模块
    console.log('Transforming code to ES module...');
    const moduleCode = transformToESModule(jsCode, config);
    
    // 5. 创建并加载模块
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

// 将CommonJS代码转换为ES模块 - 增强版
function transformToESModule(jsCode, config) {
  try {
    // 1. 替换配置变量
    jsCode = replaceConfigVariables(jsCode, config);
    
    // 2. 增强版：查找fetch处理函数的多种方式
    let fetchHandlerCode = extractFetchHandler(jsCode);
    
    if (!fetchHandlerCode) {
      // 尝试直接查找fetchHandler函数定义
      const fetchHandlerFunc = jsCode.match(/async function fetchHandler\([\s\S]*?\)\s*\{[\s\S]*?\}/);
      if (fetchHandlerFunc) {
        fetchHandlerCode = fetchHandlerFunc[0];
        console.log('Found fetchHandler function definition');
      }
    }
    
    if (!fetchHandlerCode) {
      // 最后尝试：如果没有找到现有的fetchHandler，创建一个简单的包装器
      console.log('Creating wrapper fetchHandler');
      fetchHandlerCode = `async function fetchHandler(event) {
        return fetchHandler(event);
      }`;
    }
    
    // 3. 添加ES模块导出
    jsCode += `\n\n${fetchHandlerCode}\nexport { fetchHandler };`;
    
    console.log('Successfully transformed code to ES module');
    return jsCode;
    
  } catch (error) {
    console.error('Code transformation failed:', error);
    throw error;
  }
}

// 替换配置变量
function replaceConfigVariables(jsCode, config) {
  // 替换ASSET_URL
  jsCode = jsCode.replace(
    /const ASSET_URL = 'https?:\/\/[^']+'/,
    `const ASSET_URL = '${config.ASSET_URL}'`
  );
  
  // 替换PREFIX
  jsCode = jsCode.replace(
    /const PREFIX = '\/'/,
    `const PREFIX = '${config.PREFIX}'`
  );
  
  // 替换Config
  jsCode = jsCode.replace(
    /const Config = {\s*jsdelivr: \d\s*}/,
    `const Config = { jsdelivr: ${config.Config.jsdelivr} }`
  );
  
  // 替换whiteList
  jsCode = jsCode.replace(
    /const whiteList = \[\s*\]/,
    `const whiteList = ${JSON.stringify(config.whiteList)}`
  );
  
  return jsCode;
}

// 提取fetch处理函数 - 增强版
function extractFetchHandler(jsCode) {
  // 模式1: addEventListener('fetch', function(e) { ... })
  const pattern1 = /addEventListener\('fetch',\s*function\s*\(\w+\)\s*\{\s*([\s\S]*?)\s*\}\s*\)/;
  const match1 = jsCode.match(pattern1);
  
  if (match1 && match1[1]) {
    console.log('Found fetch handler pattern 1');
    return `async function fetchHandler(event) {\n${match1[1]}\n}`;
  }
  
  // 模式2: addEventListener('fetch', e => { ... })
  const pattern2 = /addEventListener\('fetch',\s*\w+\s*=>\s*\{\s*([\s\S]*?)\s*\}\s*\)/;
  const match2 = jsCode.match(pattern2);
  
  if (match2 && match2[1]) {
    console.log('Found fetch handler pattern 2');
    return `async function fetchHandler(event) {\n${match2[1]}\n}`;
  }
  
  // 模式3: addEventListener('fetch', (e) => { ... })
  const pattern3 = /addEventListener\('fetch',\s*\(\w+\)\s*=>\s*\{\s*([\s\S]*?)\s*\}\s*\)/;
  const match3 = jsCode.match(pattern3);
  
  if (match3 && match3[1]) {
    console.log('Found fetch handler pattern 3');
    return `async function fetchHandler(event) {\n${match3[1]}\n}`;
  }
  
  // 模式4: addEventListener("fetch", ...) (使用双引号)
  const pattern4 = /addEventListener\("fetch",\s*function\s*\(\w+\)\s*\{\s*([\s\S]*?)\s*\}\s*\)/;
  const match4 = jsCode.match(pattern4);
  
  if (match4 && match4[1]) {
    console.log('Found fetch handler pattern 4');
    return `async function fetchHandler(event) {\n${match4[1]}\n}`;
  }
  
  console.log('No fetch handler pattern matched');
  return null;
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
