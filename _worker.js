// Cloudflare Pages Functions for gh-proxy
// 安全版本 - 不使用Function构造函数

let ghProxyModule;

// 安全加载原gh-proxy代码
async function loadGhProxySafely(env) {
  if (ghProxyModule) return ghProxyModule;
  
  try {
    // 1. 创建一个新的模块作用域
    const moduleScope = {
      exports: {},
      console: console,
      fetch: fetch,
      Response: Response,
      Request: Request,
      Headers: Headers,
      URL: URL,
      setTimeout: setTimeout,
      clearTimeout: clearTimeout,
      setInterval: setInterval,
      clearInterval: clearInterval
    };
    
    // 2. 获取原gh-proxy代码
    const response = await fetch('./index.js');
    let code = await response.text();
    
    // 3. 修改代码以支持环境变量
    code = injectEnvironmentVariables(code, env);
    
    // 4. 添加模块导出代码
    code += `\n\nmodule.exports = {
      fetchHandler: fetchHandler,
      httpHandler: httpHandler,
      proxy: proxy,
      makeRes: makeRes,
      checkUrl: checkUrl,
      newUrl: newUrl
    };`;
    
    // 5. 使用安全的方式执行代码（模拟CommonJS模块）
    const require = (id) => {
      if (id === 'url') return { URL: URL };
      throw new Error(`Module ${id} not found`);
    };
    
    // 6. 创建函数并执行（不使用eval或Function构造函数）
    const moduleFunction = new Function('module', 'exports', 'require', 'global', code);
    moduleFunction(moduleScope, moduleScope.exports, require, moduleScope);
    
    // 7. 创建handleRequest函数
    const handleRequest = async (request) => {
      try {
        // 模拟FetchEvent对象
        const event = {
          request: request,
          respondWith: (responsePromise) => responsePromise
        };
        
        // 调用原fetchHandler
        return await moduleScope.exports.fetchHandler(event);
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
    };
    
    ghProxyModule = {
      handleRequest: handleRequest,
      module: moduleScope
    };
    
    console.log('✅ gh-proxy loaded successfully with environment variables:');
    logEnvironmentVariables(env);
    
    return ghProxyModule;
    
  } catch (error) {
    console.error('❌ Failed to load gh-proxy:', error);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

// 注入环境变量到代码中
function injectEnvironmentVariables(code, env) {
  // 1. 替换ASSET_URL
  if (env.ASSET_URL) {
    code = code.replace(
      /const ASSET_URL = 'https?:\/\/[^']+'/,
      `const ASSET_URL = '${env.ASSET_URL}'`
    );
    console.log(`🔧 Replaced ASSET_URL with: ${env.ASSET_URL}`);
  }
  
  // 2. 替换PREFIX
  if (env.PREFIX) {
    code = code.replace(
      /const PREFIX = '\/'/,
      `const PREFIX = '${env.PREFIX}'`
    );
    console.log(`🔧 Replaced PREFIX with: ${env.PREFIX}`);
  }
  
  // 3. 替换Config.jsdelivr
  if (env.JSDELIVR !== undefined) {
    code = code.replace(
      /const Config = {\s*jsdelivr: \d\s*}/,
      `const Config = { jsdelivr: ${env.JSDELIVR} }`
    );
    console.log(`🔧 Replaced Config.jsdelivr with: ${env.JSDELIVR}`);
  }
  
  // 4. 替换whiteList
  if (env.WHITE_LIST) {
    const whiteListArray = env.WHITE_LIST.split(',').map(item => `'${item.trim()}'`).join(',');
    code = code.replace(
      /const whiteList = \[\s*\]/,
      `const whiteList = [${whiteListArray}]`
    );
    console.log(`🔧 Replaced whiteList with: [${whiteListArray}]`);
  }
  
  return code;
}

// 记录环境变量
function logEnvironmentVariables(env) {
  if (env.ASSET_URL) console.log(`   - ASSET_URL: ${env.ASSET_URL}`);
  if (env.PREFIX) console.log(`   - PREFIX: ${env.PREFIX}`);
  if (env.JSDELIVR !== undefined) console.log(`   - JSDELIVR: ${env.JSDELIVR}`);
  if (env.WHITE_LIST) console.log(`   - WHITE_LIST: ${env.WHITE_LIST}`);
}

// Pages Functions导出
export default {
  async fetch(request, env) {
    try {
      // 加载并初始化gh-proxy
      const { handleRequest } = await loadGhProxySafely(env);
      
      // 处理请求
      return await handleRequest(request);
      
    } catch (error) {
      console.error('🚨 Fatal proxy error:', error);
      return new Response('Fatal proxy error: ' + error.message, {
        status: 500,
        headers: {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
};
