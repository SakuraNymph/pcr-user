# AGENTS.md

本文件适用于 `D:\uniapp\pcr_user` 及其全部子目录。本项目是 PCR 作业站的 uni-app 用户端，连接 Laravel 后端。

## 通用开发规则

1. 修改代码前先检查当前实现及相关调用关系，不要仅凭文件名推测功能。
2. 遵循最小修改原则，只处理当前需求涉及的代码，不进行无关重构。
3. 不擅自删除现有功能、修改数据库数据或执行破坏性操作。
4. 需求不明确、接口契约存在冲突或需要改变数据库结构时，先与用户讨论方案。
5. 修改前检查相关调用方，修改后根据项目条件进行适当的语法、类型或功能检查。
6. 不要将密码、Token、API Key、数据库凭据等敏感信息写入文档、日志或提交内容。
7. 不要把尚未验证的推测写成确定事实。
8. 不要擅自安装依赖、升级框架或更改构建工具。

## 技术与开发方式

- 使用 uni-app 和 Vue 3。
- 当前项目采用 HBuilderX 开发方式；`package.json` 只包含类型依赖，没有应用脚本或 uni-app CLI 构建配置。
- 不要擅自引入 Vite、Webpack、新的包管理器或另一套 uni-app 脚手架。
- `manifest.json` 当前声明 `vueVersion: "3"`，App 和小程序 appid 仍为空。
- 具体页面通过 `pages.json` 注册；当前没有 tabBar 和分包配置。
- TypeScript 当前 `strict: false`；不要在没有需求时进行全项目严格模式迁移。

## 目录职责

- `pages/`：页面，统一使用 `pages/<name>/index.vue` 结构。
- `components/`：公共组件，例如头部、菜单、页脚、作业卡片和角色头像。
- `layouts/`：页面布局，主要包括 `MainLayout.vue` 和 `AuthLayout.vue`。
- `router/`：页面路径常量和 `navigateTo`、`redirectTo` 辅助函数，不是 Vue Router。
- `api/`：请求封装、身份管理、错误类型、共享类型和业务 API。
- `config/index.ts`：API 基础地址。
- `static/`：静态资源。
- `types/`：类型声明。
- `App.vue`：应用启动和身份初始化。
- `main.js`：uni-app 入口，使用 Vue 3 `createSSRApp` 条件分支。

## 请求与身份现状

- API 基础地址当前集中在 `config/index.ts`，值为 `http://lara.test`。
- 业务 API 路径已经包含 `/api/...`；`api/request.ts` 使用基础地址加路径拼接 URL。
- 请求封装位于 `api/request.ts`，每次请求前调用 `ensureAccessToken()`。
- 请求头发送 `Accept: application/json`、`Content-Type: application/json` 和 `Authorization: Bearer <token>`。
- 请求封装只支持 GET/POST/PUT/DELETE，没有 PATCH。
- 非 2xx 响应会转换为 `RequestError`。
- 请求封装返回原始响应数据，不会像管理后台那样自动解包 `{status, code, msg, data}`。
- 业务 API 模块通常手动检查 `status === 0` 并读取 `data`；不要直接套用管理后台的自动解包逻辑。
- 身份存储键：
  - `pcr.user.access-token`
  - `pcr.visitor.access-token`
  - `pcr.user.profile`
- 正式用户 Token 优先于游客 Token；两者同时存在时删除游客 Token。
- `App.vue` 启动时调用 `bootstrapIdentity()`。
- 有正式用户 Token 时恢复本地用户信息和登录状态，不调用 `/me`。
- 没有正式用户 Token 时调用 `POST /api/user/visitor`，复用或获取游客 Token。
- 登录和注册成功后保存正式用户 Token/profile，并删除游客 Token。
- 当前源码未发现用户端退出登录调用、Token 自动刷新或全局 401 重新登录逻辑。
- 不要擅自改变游客/正式用户身份切换、登录和注册流程；相关改动必须先检查 Laravel 的 `user.identity` 和 Token 语义。

## 现有页面状态

- 首页：加载 BOSS、系统作业和新手指引，支持系统作业收藏/取消收藏。
- 作业管理：加载 BOSS、个人作业和角色选项，支持创建/修改自定义作业及取消收藏。
- 我的账号：仅正式用户可管理角色池；游客显示登录/注册提示。
- 我的账号中的部分功能按钮仍显示“该功能暂未接入”。
- 三刀套餐、六刀套餐：主体使用本地 `demoPackages`，仅调用 BOSS 和角色接口补充展示数据，尚未接入套餐后端接口。
- 大师币商店、抽卡统计、使用说明：当前是 `ModulePlaceholder` 占位页。
- 登录、注册：已接入 Laravel 用户认证接口。

修改页面前先检查现有组件、API 和路由，优先复用现有实现。三刀套餐、六刀套餐、大师币商店、抽卡统计等尚未接入后端的功能，不要在没有明确需求时擅自设计或实现后端接口。

## API 约定

当前已确认使用的主要接口：

```text
/api/user/visitor
/api/user/send-register-code
/api/user/login
/api/user/register
/api/user/teams
/api/user/teams/custom
/api/user/teams/from-system/:id
/api/user/role-pools
/api/user/guide-config
/api/game/bosses
/api/game/teams
/api/game/roles
```

- 大多数接口遵循 Laravel 的 `{status, code, msg, data}` 信封。
- `/api/user/guide-config` 的 GET 当前返回裸布尔值，用户端已有专门处理。
- 公共游戏接口本身不要求 Token，但当前请求封装仍会确保存在游客 Token 后再发送请求。
- 修改接口时必须对照 Laravel 实际路由、FormRequest、中间件和响应实现。

## UI 与样式

- PC 网页体验优先，同时尽量兼容移动端。
- 先保证功能和布局，再逐步优化视觉样式。
- 当前主要使用深蓝色背景、蓝色高亮和自定义响应式 CSS。
- 常见断点为 700、1000、1200 px；修改页面时优先沿用现有响应式方式。
- 项目混用 `<script setup>` 和 Options API；新代码应优先与相邻文件保持一致，不要进行无关迁移。

## 修改检查清单

1. 阅读相关页面、组件、布局、路由辅助函数和 API 模块。
2. 检查 `api/identity.ts` 中游客/正式用户 Token 的处理。
3. 对照 Laravel 实际接口，确认 URL、参数、响应信封和错误结构。
4. 检查 PC 与移动端布局，避免只验证单一宽度。
5. 使用现有 HBuilderX 条件进行语法、编译或功能检查；不要为了检查擅自安装依赖或引入新构建工具。
6. 不修改业务无关页面，不进行全局样式重构。

## 待核实事项

- `manifest.json` 的 appid、模块和 SDK 配置仍为空，正式打包参数尚未确认。
- API 基础地址是硬编码地址，尚未看到按环境切换机制。
- H5 实际开发端口与 Laravel CORS 的完整对应关系尚未验证。
- 正式用户 Token 过期后，本地 `authState` 可能仍显示已登录，直到后续接口失败。
- 以上内容只记录现状，不要在无关任务中顺带修复。

## 跨项目协作

- Laravel 是唯一后端和数据库所有者。
- Vue 管理后台与 uni-app 用户端是两个独立前端，不直接互相调用。
- 开发某个前端功能时，只在必要时修改 Laravel；不要顺带修改另一个前端。
- 修改公共 API 时，检查所有相关调用方，避免接口参数或响应字段不兼容。
- 三个项目分别维护自己的 `AGENTS.md`，不要求合并成一个共同文件。

