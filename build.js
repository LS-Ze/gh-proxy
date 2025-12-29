#!/usr/bin/env node

/**
 * GH-Proxy 构建脚本
 * 用于在部署前将环境变量注入到index.js中
 */

const fs = require('fs');
const path = require('path');

// 读取环境变量
const env = {
  ASSET_URL: process.env.ASSET_URL || 'https://hunshcn.github.io/gh-proxy/',
  PREFIX: process.env.PREFIX || '/',
  JSDELIVR: process.env.JSDELIVR !== undefined ? parseInt(process.env.JSDELIVR) : 0,
  WHITE_LIST: process.env.WHITE_LIST || ''
};

console.log('🔧 构建配置:');
console.log(`   - ASSET_URL: ${env.ASSET_URL}`);
console.log(`   - PREFIX: ${env.PREFIX}`);
console.log(`   - JSDELIVR: ${env.JSDELIVR}`);
console.log(`   - WHITE_LIST: ${env.WHITE_LIST || 'none'}`);

// 读取原始index.js
const indexPath = path.join(__dirname, 'index.js');
let code = fs.readFileSync(indexPath, 'utf8');

// 替换配置变量
console.log('\n📝 正在注入环境变量...');

// 替换ASSET_URL
code = code.replace(
  /const ASSET_URL = 'https?:\/\/[^']+'/,
  `const ASSET_URL = '${env.ASSET_URL}'`
);
console.log('   ✅ ASSET_URL 已替换');

// 替换PREFIX
code = code.replace(
  /const PREFIX = '\/'/,
  `const PREFIX = '${env.PREFIX}'`
);
console.log('   ✅ PREFIX 已替换');

// 替换Config.jsdelivr
code = code.replace(
  /const Config = {\s*jsdelivr: \d\s*}/,
  `const Config = { jsdelivr: ${env.JSDELIVR} }`
);
console.log('   ✅ Config.jsdelivr 已替换');

// 替换whiteList
const whiteListArray = env.WHITE_LIST 
  ? env.WHITE_LIST.split(',').map(item => `'${item.trim()}'`).join(',') 
  : '';
code = code.replace(
  /const whiteList = \[\s*\]/,
  `const whiteList = [${whiteListArray}]`
);
console.log('   ✅ whiteList 已替换');

// 添加Pages Functions导出
console.log('\n📦 正在添加Pages Functions导出...');
const exportCode = `\n\n// Pages Functions导出\nexport default {
  async fetch(request) {
    const event = {
      request: request,
      respondWith: (responsePromise) => responsePromise
    };
    return fetchHandler(event);
  }
};\n`;

code += exportCode;
console.log('   ✅ Pages导出已添加');

// 保存修改后的文件
const outputPath = path.join(__dirname, '_worker.js');
fs.writeFileSync(outputPath, code);
console.log(`\n✅ 构建完成！已生成: ${outputPath}`);

// 创建wrangler.toml配置
const wranglerConfig = `name = "gh-proxy"
compatibility_date = "2025-12-29"
compatibility_flags = ["nodejs_compat"]

[env.production]
pages_build_output_dir = "."

[build]
command = "node build.js"
watch_dir = "."

[dev]
port = 8787
local_protocol = "http"
`;

fs.writeFileSync(path.join(__dirname, 'wrangler.toml'), wranglerConfig);
console.log('✅ wrangler.toml 已生成');

console.log('\n🎉 部署准备完成！');
console.log('   使用以下命令部署:');
console.log('   $ wrangler pages deploy');
