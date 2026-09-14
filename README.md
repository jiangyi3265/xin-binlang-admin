# xin-binlang-admin

新槟榔兑奖系统的总部运营管理后台，集中管理活动、奖池、门店、销售和兑奖订单。

## 项目简介

后台按账号角色展示业务入口，覆盖经营总览、活动配置、品牌素材、奖池、奖品库存、兑换码批次生成与导出、门店与店员账号、销售账号、兑奖订单、用户风控、审计日志和消息队列。

生产访问地址：[https://xbinglangsht.oksja.cn](https://xbinglangsht.oksja.cn)。发布入口统一位于 [xin-binlang-backend Actions](https://github.com/jiangyi3265/xin-binlang-backend/actions/workflows/deploy-split.yml)。

超级管理员、运营人员、只读审计和销售使用不同权限。销售仅查看及维护本人门店；最终权限和数据范围由后端校验。页面通过同源 `/api` 访问 xin-binlang-backend，并管理 xin-binlang-app 展示的活动内容。

## 技术栈

- 原生 HTML5、CSS3 和 JavaScript ES Modules。
- 浏览器 Fetch API、History hash 路由、LocalStorage 和响应式布局。
- 原生表单、弹窗、图片上传预览及报表下载交互。
- 无 Vue / React、无 Node 依赖安装、无前端打包流程。
- 运行时由后端 Node HTTP 服务或配有 API 反向代理的 Web 服务器托管。

## 关联仓库

| 项目 | 说明 | GitHub |
| --- | --- | --- |
| xin-binlang-backend | 后端服务 | [xin-binlang-backend](https://github.com/jiangyi3265/xin-binlang-backend) |
| xin-binlang-admin | 管理后台 | [xin-binlang-admin](https://github.com/jiangyi3265/xin-binlang-admin) |
| xin-binlang-app | 用户端 | [xin-binlang-app](https://github.com/jiangyi3265/xin-binlang-app) |

## 快速启动

本仓库没有 `package.json`，无需执行 `npm install`，也不存在 `npm run dev`。建议由后端按同源方式提供页面、资源与 API。

```bash
git clone https://github.com/jiangyi3265/xin-binlang-admin.git 总部管理后台
git clone https://github.com/jiangyi3265/xin-binlang-backend.git backend
cd backend
npm ci
```

按 [后端启动说明](https://github.com/jiangyi3265/xin-binlang-backend#快速启动) 创建独立 MySQL 数据库和账号，复制并填写后端 `.env`。确保 `ADMIN_DIR=../总部管理后台`，然后运行：

```bash
npm run db:init
npm start
```

打开 <http://127.0.0.1:8897/admin>。账号由管理员配置；开发演示账号的口令来自后端本地环境变量，前端不预填登录口令。新库默认不生成演示账号。

页面样式和脚本使用 `/assets/`，请求使用 `/api/`，因此不能通过双击 `index.html` 获得完整功能。若独立使用 Nginx 托管，应将 `/api/` 和 `/uploads/` 转发至本项目后端，并让后台与后端使用一致的 `assets/` 资源。浏览器不得持有数据库密码或微信 AppSecret。

### 代码检查

在本仓库根目录可使用已安装的 Node.js 执行 JavaScript 语法检查：

```bash
node --check assets/admin.js
```

GitHub Actions 执行相同检查；完整后台静态回归测试位于关联后端仓库的 `test/admin-static.test.js`。

## 项目结构

```text
index.html             页面入口、主容器与资源引用
favicon.svg            站点图标
assets/
  admin.js             路由、表单、业务页面与 API 交互
  admin.css            响应式布局、样式和主题
  *.jpg / *.png        活动、商品、奖品、门店和头像素材
docs/
  总部后台运营操作说明.md  基础运营步骤
.github/workflows/     静态检查 CI
```

其中业务图片也由后端提供给用户端。当前基础品牌与示例素材继承已有实现，后续通过活动设置或代码按新甲方资料替换。

## 简历描述示例

参与兑奖平台总部后台开发，以原生 JavaScript 构建活动配置、奖池库存、兑换码管理、门店账号和订单风控页面。对接统一后端 API，实现角色化导航、图片上传、业务报表导出和销售门店管理。
