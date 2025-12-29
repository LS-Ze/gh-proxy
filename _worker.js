// Cloudflare Pages Functions for gh-proxy
// 智能加载并修改原gh-proxy代码，实现环境变量支持

let handleRequest;

// 加载并修改原gh-proxy代码
async function loadAndModifyGhProxy(env) {
  if (handleRequest) return;
  
  try {
    // 获取原gh-proxy的index.js代码
    const response = await fetch('https://cdn.jsdelivr.net/gh/LS-Ze/gh-proxy@master/index.js');
    let code = await response.text();
    
    // 智能替换环境变量
    // 1. 替换ASSET_URL
    if (env.ASSET_URL) {
      code = code.replace(
        /const ASSET_URL = 'https?:\/\/[^']+'/,
        `const ASSET_URL = '${env.ASSET_URL}'`
      );
    }
    
    // 2. 替换PREFIX
    if (env.PREFIX) {
      code = code.replace(
        /const PREFIX = '\/'/,
        `const PREFIX = '${env.PREFIX}'`
      );
    }
    
    // 3. 替换Config.jsdelivr
    if (env.JSDELIVR !== undefined) {
      code = code.replace(
        /const Config = {\s*jsdelivr: \d\s*}/,
        `const Config = { jsdelivr: ${env.JSDELIVR} }`
      );
    }
    
    // 4. 替换whiteList
    if (env.WHITE_LIST) {
      const whiteListArray = env.WHITE_LIST.split(',').map(item => `'${item.trim()}'`).join(',');
      code = code.replace(
        /const whiteList = \[\s*\]/,
        `const whiteList = [${whiteListArray}]`
      );
    }
    
    // 5. 添加handleRequest导出（如果原代码没有）
    if (!code.includes('export default')) {
      code += `\n\nexport default async function handleRequest(req) {
        const ret = fetchHandler({ request: req })
          .catch(err => makeRes('cfworker error:\\n' + err.stack, 502))
        return ret;
      }`;
    }
    
    // 创建模块并执行
    const module = { exports: {} };
    const require = (id) => {
      if (id === 'url') return URL;
      throw new Error(`Module not found: ${id}`);
    };
    
    // 使用Function构造函数执行代码
    const func = new Function('module', 'exports', 'require', code);
    func(module, module.exports, require);
    
    // 获取handleRequest函数
    handleRequest = module.exports.default || module.exports.handleRequest;
    
    console.log('gh-proxy code loaded and modified successfully');
    console.log('Environment variables applied:');
    if (env.ASSET_URL) console.log(`- ASSET_URL: ${env.ASSET_URL}`);
    if (env.PREFIX) console.log(`- PREFIX: ${env.PREFIX}`);
    if (env.JSDELIVR !== undefined) console.log(`- JSDELIVR: ${env.JSDELIVR}`);
    if (env.WHITE_LIST) console.log(`- WHITE_LIST: ${env.WHITE_LIST}`);
    
  } catch (error) {
    console.error('Failed to load and modify gh-proxy:', error);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

// Pages Functions导出
export default {
  async fetch(request, env) {
    try {
      // 确保gh-proxy代码已加载并修改
      await loadAndModifyGhProxy(env);
      
      // 使用修改后的handleRequest函数处理请求
      return await handleRequest(request);
      
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
};
