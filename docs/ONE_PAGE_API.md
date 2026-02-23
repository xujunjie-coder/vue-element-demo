## 四、前端 Axios 示例（静默刷新 + 401 自动续签，比赛用最小实现）

后端确认：`access_token` 有效期 15 分钟（900 秒），`refresh_token` 有效期 7 天（604800 秒）。`exp` 字段以 Unix 时间戳（秒）返回，前端可据此计算静默刷新时机。

说明：下面示例为比赛演示级别的最小实现，适配常见后端 `POST /auth/refresh` 返回新 `access_token`。生产请优先使用 HttpOnly cookie、refresh 旋转与更严格的安全策略。
- 功能要点：
  - 静默（无感）刷新：根据 access token 的 `exp` 提前定时刷新。可选（若后端返回 exp）。
  - 401 自动续签：响应拦截器捕获 401，执行单飞刷新（single-flight），刷新成功后重试失败请求。
  - 并发保护：在刷新期间挂起所有需要重试的请求，刷新完成后统一重放。

示例文件位置建议：`src/utils/authAxios.js`。

示例代码（概念实现，请按项目风格微调）：

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: '/', // 本地开发用 proxy，构建后由后端托管时直接采用相对路径
  timeout: 10000,
});

let isRefreshing = false;
let refreshPromise = null;
const requestQueue = [];

function enqueueRequest(cb) {
  return new Promise((resolve, reject) => {
    requestQueue.push({ resolve, reject, cb });
  });

function processQueue(error, token = null) {
  requestQueue.forEach(p => {
    if (error) p.reject(error);
    else p.resolve(p.cb(token));
  });
  requestQueue.length = 0;

function getAccessToken() {
  return localStorage.getItem('access_token');
}

function setAccessToken(token) {
  localStorage.setItem('access_token', token);
}

async function refreshToken() {
  const refresh_token = localStorage.getItem('refresh_token');
  if (!refresh_token) throw new Error('no refresh token');
  const res = await axios.post('/auth/refresh', { refresh_token });
  // 假设后端返回 { access_token: '...', refresh_token: '...' }
  const { access_token, refresh_token: new_refresh } = res.data;
  if (access_token) setAccessToken(access_token);
  if (new_refresh) localStorage.setItem('refresh_token', new_refresh);
  return access_token;

// 请求拦截器：挂载 access token
api.interceptors.request.use(cfg => {
  const token = getAccessToken();
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// 响应拦截器：遇到 401 尝试刷新并重试
api.interceptors.response.use(
  res => res,
  async err => {
    const { config, response } = err;
    if (!response) return Promise.reject(err);
  if (response.status !== 401) return Promise.reject(err);

  // 已经在刷新中，挂起当前请求
    if (isRefreshing) {
      return enqueueRequest(token => {
        config.headers.Authorization = `Bearer ${token}`;
        return api(config);
      });
    }

  // 发起刷新
  isRefreshing = true;
  refreshPromise = refreshToken()
      .then(newToken => {
        processQueue(null, newToken);
        return newToken;
      })
      .catch(e => {
        processQueue(e, null);
  // 清理并跳转登录
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        throw e;
      })
      .finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });

    try {
  const token = await refreshPromise;
  config.headers.Authorization = `Bearer ${token}`;
  return api(config);
    } catch (e) {
      return Promise.reject(e);
    }
  }
);

export default api;
```

静默刷新（可选）实现思路：在登录或拿到 token 时解析 JWT `exp`，计算剩余时间，用 `setTimeout` 在提前窗口（例如 30 秒）触发一次 `refreshToken()`，以避免用户交互时出现 401。

Dev 代理说明（本地测试）：
- 在 `vue.config.js` 中配置 `devServer.proxy`，示例：

```javascript
module.exports = {
  devServer: {
    proxy: {
      '/': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
};
```

构建发布时：如果后端会托管静态文件，可直接把构建输出放到后端静态目录，前端请求用相对路径（`/api/...` 或 `/`），无需额外写完整 base URL。

注意事项（简短）：
- 该实现为比赛级别最小实现，`localStorage` 用于保存 token 有 XSS 风险；若后端支持则优先使用 HttpOnly cookie。 
- 如果后端返回的 401 包含具体 body（如 `code=401`），可在拦截器中根据 body 做更细粒度判断。
# 同花顺前端-后端 API 对接信息汇总（比赛版，最小可复现）

下面文档已参考后端 `README.md`（已实现项写明），并按比赛优先级整理需要后端补充或修改的最小列表：

## 一、后端 README 中已提供（不需要后端再次回复）
- `POST /reg` — 注册（后端示例要求 `application/x-www-form-urlencoded`，返回 `status` 字段示例）
- `POST /auth` — 登录（后端示例返回 `access_token`, `token_type`, `status`）
- `GET /stock_last` — 单股最新数据（query: `code`，README 已给 `data` 示例）
- `GET /history/minute` — 分钟级历史（params: `code, scale, datalen`）
- `GET /history/day` — 天级历史（params: `code, period, start_date, end_date, adjust`）

这些接口的存在和基础字段示例已来自后端 README，后端无需重复说明上述路径本身。

## 二、后端需**修改或补充**（比赛优先；若冲突请按“前端格式优先”修改后端）
下面为比赛演示所必须最小信息与兼容要求。后端直接回复中按下列条目给出明确内容。

### 1) 注册/登录路径与请求格式兼容
- 后端目前 `/reg` 使用表单，`/auth` 为登录。为减少前端改动，请后端至少提供：
  - `POST /user/register` 支持 `application/json`（或 `/reg` 同时支持 JSON）。
  - `POST /user/login` 作为 `/auth` 的 alias 或保证 `/auth` 同时接受 `/user/login` 的请求。比赛阶段以前端现有调用为准。

### 2) 响应封装（兼容前端）
- 后端 README 使用 `status/data`，前端优先使用 `code/msg/data`。请后端同时兼容两种格式或直接改为 `code/msg/data`。至少请在回执中给出 200/401/403/500 的完整 HTTP+body 示例。

### 3) refresh token 与刷新接口（必须提供）
- README 未说明 refresh。比赛阶段需要 `POST /auth/refresh`（body `{ "refresh_token":"..." }`）或明确说明使用 HttpOnly cookie（若 cookie，请给 cookie 名称并确保 CORS/credentials 配置）。

### 4) access_token 是否为 JWT 与有效期
- README 返回 `access_token`，请后端确认是否为 JWT（含 `exp`），并给出默认过期秒数（用于前端自动刷新逻辑）。

### 5) 字段命名与单位（必须统一）
- README 示例中混用 `lod` 与 `low`，前端代码目前使用 `lod`，请后端统一返回 `lod`。
- 请明确 `vol` 的单位（股/手）以及 `amount` 的单位（元/万元），并写明任何需要做的换算（例如前端是否需除以 100）。
- 时间字段格式与时区（建议 `YYYY-MM-DD HH:mm:ss`，UTC+8）。

### 6) AI/交易的消息封装
- 前端对 `ai/select` 与 `trade/order` 支持 `buildRequestMsg`（`{type,size,data:"..."}`）封装。README 未提及。请后端说明是否支持该封装，若不支持请实现兼容或告知改用标准 JSON（比赛阶段按前端实现优先）。

### 7) CORS / Cookie
- README 未说明 CORS。若后端将 refresh token 以 HttpOnly cookie 下发，请务必：
  - 返回 `Access-Control-Allow-Credentials: true` 并列出允许的 origin；
  - 前端将根据说明设置 axios `withCredentials`（比赛演示常用 ngrok + cookie 时需正确配置）。

### 8) 401/403 行为（必须明确）
- 请后端在回执中给出 401 与 403 的完整示例（HTTP 状态 + 响应 body + 如有的 headers/cookie）。前端将根据 HTTP 401 或 body.code=401 执行刷新或跳转登录。

### 9) 接口兼容性（JSON vs 表单）
- 比赛阶段请尽量同时支持 `application/json` 与现有表单格式（至少注册/登录支持 JSON），以减少前端分支处理。

### 10) 限流与超时（比赛级最小化）
- 若无特殊限流，请在回执中写“无限流”或给出一个宽松阈值（例如每秒 20 req）。

## 三、比赛级最小回执清单（后端请直接回复这些项目）
请直接在回执中按 JSON 或文本填下列最小信息：

1. 开发 Base URL（例如 `http://localhost:3000`）及是否有全局前缀；
2. 登录成功示例（HTTP 状态、响应 headers、body）；
3. 注册接口路径与请求类型（是否同时支持 JSON）；
4. 是否提供 `POST /auth/refresh`（若有请给请求/响应示例）；
5. `access_token` 是否为 JWT（含 `exp`）以及默认有效期（秒）；
6. 401/403 的 HTTP 状态与 body 示例；
7. 字段命名确认：`lod`/`low`（请统一为 `lod`）、`vol` 单位、`amount` 单位、时间格式；
8. 是否支持 AI/Trade 的消息封装（`{type,size,data:"..."}`），若不支持请说明采用的标准 JSON。