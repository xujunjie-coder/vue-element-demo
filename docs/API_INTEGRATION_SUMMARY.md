# 同花顺前端-后端 API 对接信息汇总

## 一、基础地址配置
| 环境 | Base URL（待后端补充真实地址） | 全局前缀 |
|------|--------------------------------|----------|
| 开发 | `http://localhost:3000`（示例） | 待确认（如 `/api`/`/ai-api`） |
| 生产 | `https://api.example.com`（示例） | 同开发/单独配置 |

## 二、鉴权与 Token 机制
### 1. 登录接口
- **路径**：`POST /auth`
- **Content-Type**：`application/json`
- **请求示例**：
  ```json
  { "username": "admin", "password": "123456" }
  ```
- **成功响应示例**（待后端确认最终格式）：
  ```json
  {
    "access_token": "eyJhb...",
    "token_type": "Bearer",
    "status": "ok"
    // 补充：是否返回 refresh_token？（JSON body / HttpOnly cookie）
  }
  ```
- **失败响应示例**（待后端补充）：
  ```json
  { "status": "error", "msg": "用户名或密码错误" }
  ```

### 2. Token 核心信息（待后端确认）
| 项 | 说明（需后端补充） |
|----|--------------------|
| access_token | 是否为标准 JWT（含 `exp`）？<br>默认有效期（秒）+ `exp` 单位？ |
| refresh_token | 是否返回？<br>返回位置（JSON body / HttpOnly cookie）？<br>有效期（秒）？ |
| 刷新接口 | 路径（如 `POST /auth/refresh`）？<br>请求/响应示例？ |

### 3. 认证失败响应（待后端补充完整示例）
| 场景 | HTTP 状态码 | 响应体示例 | Headers/Cookie |
|------|-------------|------------|----------------|
| 未认证/token 过期（401） | 待确认（401 / 200） | 待补充 | 待补充 |
| 权限拒绝（403） | 待确认（403 / 200） | 待补充 | 待补充 |

## 三、核心业务接口规范
### 1. 接口清单（示例）
| 方法 | 路径 | 描述 | 请求参数 | 响应示例 |
|------|------|------|----------|----------|
| GET | `/stock_last?code=sh600000` | 获取个股最新行情 | query：`code` | ```json
{ "status": "ok", "data": { "code": "sh600000", "name": "浦发银行", "open": 8.5, "close": 8.6, "last": 8.55, "hod": 8.7, "lod": 8.4, "bid": 8.54, "ask": 8.56, "vol": 10000, "amount": 85500, "date": "2026-02-11", "time": "14:30:00" } }
``` |
| GET | `/stock/quote` | 获取行情列表 | query：`page, size, market, sort, keyword` | ```json
{ "code": 200, "msg": "ok", "data": { "list": [{"code":"600519","name":"贵州茅台","price":1800.5}], "total":100, "page":1, "size":20 } }
``` |
| GET | `/stock/kline` | 获取K线 | query：`code, type`（day/week/month/min） | ```json
{ "code":200, "data": [{"date":"2026-01-25","open":1780,"close":1800.5}] }
``` |
| POST | `/ai-api/ai/select` | AI智能选股 | body：策略参数（JSON） | ```json
{ "code":200, "data": { "list":[{"code":"600519","score":9.5,"reason":"..."}] } }
``` |
| POST | `/api/trade/order` | 交易下单 | body：`{ "code":"600519","direction":"buy","price":1800.5,"amount":100 }` | ```json
{ "code":200, "data": { "order_no":"20260125001", "status":"success" } }
``` |
| POST | `/reg` | 注册 | Content-Type：`application/x-www-form-urlencoded` <br> body：`username=xxx&password=yyy` | ```json
{ "msg": "注册成功", "status": "ok" }
``` |

### 2. 字段命名与单位（待后端确认）
| 字段 | 确认项 | 示例/说明 |
|------|--------|-----------|
| 最低价 | 使用 `lod` 还是 `low`？ | 待补充 |
| vol | 单位：股 / 手？ | 待补充 |
| amount | 单位：元 / 万元？ | 待补充 |
| 时间字段（date/time） | 格式（如 `YYYY-MM-DD HH:mm:ss`）+ 时区？ | 待补充（建议 UTC+8） |

## 四、请求/响应格式规范
### 1. 请求格式
| 接口类型 | Content-Type | 特殊说明 |
|----------|--------------|----------|
| 大部分接口 | 建议统一为 `application/json` | 待确认是否兼容表单格式 |
| 注册接口（/reg） | `application/x-www-form-urlencoded` | 必须使用表单格式 |

### 2. 响应封装格式（二选一，待后端确认）
- **方案A（推荐）**：
  ```json
  { "code": 200, "msg": "ok", "data": { ... } }
  ```
- **方案B（兼容）**：
  ```json
  { "status": "ok", "data": { ... } }
  ```

## 五、CORS 与 Cookie 配置（待后端确认）
| 配置项 | 说明/要求 |
|--------|-----------|
| Access-Control-Allow-Origin | 允许的前端 origin 列表（如 `http://localhost:8090`/*） |
| Access-Control-Allow-Credentials | 是否返回 `true`？ |
| Access-Control-Allow-Headers | `Authorization, Content-Type`（必填） |
| Access-Control-Allow-Methods | `GET,POST,PUT,DELETE,OPTIONS`（必填） |
| 前端 axios 配置 | 是否需要设置 `withCredentials: true`？ |

## 六、限流与错误码
### 1. 速率限制（待后端补充）
| 限制类型 | 阈值 | 限流策略 |
|----------|------|----------|
| 每秒请求数 | 待补充 | 待补充 |
| 每分钟请求数 | 待补充 | 待补充 |
| 并发数 | 待补充 | 待补充 |

### 2. 错误码规范
| 错误码 | 含义 | 前端处理逻辑 |
|--------|------|--------------|
| 200 | 成功 | 正常解析数据 |
| 400 | 参数错误 | 提示 `msg` 内容 |
| 401 | 未认证/token 无效 | 清空 token，跳转登录页 |
| 403 | 权限拒绝 | 提示“无操作权限” |
| 404 | 资源不存在 | 提示“请求资源不存在” |
| 500 | 服务异常 | 提示“服务器内部错误，请重试” |

## 七、待后端补充的关键信息清单
1. 开发/生产环境真实 Base URL（含全局前缀）；
2. 登录接口完整响应（含 headers/cookie，需体现 refresh_token 相关）；
3. refresh_token 相关：是否返回、位置、有效期、刷新接口（路径+请求/响应示例）；
4. access_token 有效期（秒）+ 是否为标准 JWT（含 exp）；
5. 401/403 完整响应示例（HTTP 状态码+body+headers）；
6. CORS 配置：允许的 origin、是否返回 `Access-Control-Allow-Credentials: true`、前端是否需设置 `withCredentials: true`；
7. 字段命名确认：`lod`/`low`、`vol`/`amount` 单位、时间字段格式/时区；
8. 接口限流阈值与策略；
9. 统一的响应封装格式（code/msg/data 或 status/data）；
10. 各接口是否兼容 JSON/表单请求格式。

