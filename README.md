# github-proxy

## 简介
基于项目：
- [https://github.com/hunshcn/gh-proxy](https://github.com/hunshcn/gh-proxy)
> github release、archive以及项目文件的加速项目，Cloudflare Workers无服务器版本.

## 演示

[https://github.lsdns.top/](https://github.lsdns.top/)

演示站为公共服务，如有大规模使用需求请自行部署，演示站有点不堪重负

![imagea272c95887343279.png](https://img.maocdn.cn/img/2021/04/24/imagea272c95887343279.png)

当然也欢迎[捐赠](#捐赠)以支持作者

## 使用

直接在copy出来的url前加`https://github.lsdns.top/`即可

也可以直接访问，在input输入

***大量使用请自行部署，以上域名仅为演示使用。***

以下都是合法输入（仅示例，文件不存在）：

- 分支源码：https://github.com/LS-Ze/project/archive/master.zip

- release源码：https://github.com/LS-Ze/project/archive/v0.1.0.tar.gz

- release文件：https://github.com/LS-Ze/project/releases/download/v0.1.0/example.zip

- 分支文件：https://github.com/LS-Ze/project/blob/master/filename

- commit文件：https://github.com/LS-Ze/project/blob/1111111111111111111111111111/filename

- gist：https://gist.githubusercontent.com/cielpy/351557e6e465c12986419ac5a4dd2568/raw/cmd.py

## cf worker版本部署

首页：https://workers.cloudflare.com

注册，登陆，`Start building`，取一个子域名，`Create a Worker`。

复制 [index.js](https://cdn.jsdelivr.net/gh/LS-Ze/github-proxy@master/index.js)  到左侧代码框，`Save and deploy`。如果正常，右侧应显示首页。

`ASSET_URL`是静态资源的url（实际上就是现在显示出来的那个输入框单页面）

`PREFIX`是前缀，默认（根路径情况为"/"），如果自定义路由为example.com/gh/*，请将PREFIX改为 '/gh/'，注意，少一个杠都会错！

## Cloudflare Workers计费

到 `overview` 页面可参看使用情况。免费版每天有 10 万次免费请求，并且有每分钟1000次请求的限制。

如果不够用，可升级到 $5 的高级版本，每月可用 1000 万次请求（超出部分 $0.5/百万次请求）。

## Changelog

* 2020.04.10 增加对`raw.githubusercontent.com`文件的支持
* 2020.04.09 增加Python版本（使用Flask）
* 2020.03.23 新增了clone的支持
* 2020.03.22 初始版本

## 参考

[jsproxy](https://github.com/EtherDream/jsproxy/)
