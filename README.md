# PCR User

**PCR 作业站用户端**

基于 uni-app 和 Vue 3 开发的 Princess Connect! Re:Dive（公主连结）游戏辅助平台用户端。

本项目主要用于记录个人开发成果，提供作业查询、作业管理、角色配置、公会管理等功能。

## 主要功能

- **作业管理**：浏览系统作业、管理个人作业，支持自定义作业。
- **套餐功能**：提供 D 面套餐、满补套餐等排刀辅助功能。
- **角色管理**：管理个人角色池及相关配置。
- **公会系统**：支持公会搜索、详情查看、邀请、加入申请及公会排刀表。
- **账号系统**：支持用户注册、登录和个人资料管理。
- **其他功能**：抽卡统计、大师币商店、使用说明、BUG 反馈等。

部分功能仍在持续开发和完善中，实际功能以项目当前代码为准。

## 技术栈

- uni-app
- Vue 3
- JavaScript / TypeScript
- Laravel REST API
- HBuilderX

## 项目结构

```text
pcr_user/
├── api/           # API 请求与业务接口
├── components/    # 公共组件
├── config/        # 项目配置
├── layouts/       # 页面布局
├── pages/         # 业务页面
├── router/        # 页面路由辅助
├── static/        # 静态资源
├── theme/         # 主题样式
├── types/         # 类型声明
├── App.vue        # 应用入口
├── main.js        # uni-app 入口文件
└── manifest.json  # 应用配置
```

## 开发说明

本项目使用 HBuilderX 进行开发，采用 uni-app 默认项目结构。

项目需要配合对应的 Laravel 后端服务使用。运行前需要根据自己的开发环境调整 `config/index.ts` 中的后端地址，以及 `manifest.json` 中 H5 开发代理的目标地址。

## 相关项目

- 管理端：[PcrAdmin](https://github.com/SakuraNymph/pcr-admin)
- 后端：计划独立开源

## 说明

本项目为个人开发作品，主要用于记录开发过程与技术实践。

项目中涉及的游戏名称、角色形象及其他第三方素材，其相关权利归原权利人所有。