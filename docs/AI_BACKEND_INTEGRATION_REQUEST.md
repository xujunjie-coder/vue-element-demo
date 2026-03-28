# AI 模块后端联调修改清单

## 一、当前联调现状

根据前端最新联调结果：

1. GET /api/ai?code=sh600519
- 未登录返回 401
- 登录后返回 200，接口可用

2. POST /api/ai/select
- 返回 405（Method Not Allowed）

3. POST /ai-api/ai/select
- 返回 405（Method Not Allowed）

4. GET /ai-api/ai?code=...
- 返回 404（Not Found）

## 二、需要后端修改项

### 1) 批量选股接口（必须）

请提供可用的批量选股接口，建议统一为：

- 路径：/api/ai/select
- 方法：POST
- 鉴权：与 /api/ai 保持一致（都要求登录或都不要求）
- 状态：可实际返回股票列表，不能再返回 405

### 2) 单股预测字段统一

现有单股接口建议固定以下返回字段：

- test_code：证券代码
- prob：未来 7 日上涨概率，范围 [0,1]
- amp：未来 7 日涨跌幅（请明确单位是百分比值还是小数）
- vol：未来 7 日平均成交量

说明：建议不要再混用 zd，前端希望统一使用 amp。

### 3) ai/select 入参与出参建议

请求示例（标准 JSON）：

```json
{
  "strategy": "value_growth",
  "filters": {
    "minPrice": 0,
    "maxPrice": 500,
    "minChange": -10,
    "maxChange": 10,
    "minVol": 1000,
    "minCap": 10
  },
  "weights": {
    "value": 0.5,
    "growth": 0.5
  },
  "limit": 10
}
```

请求示例（兼容前端历史封装，建议同时支持）：

```json
{
  "type": "indicator_select",
  "size": 20,
  "data": "{\"minPrice\":0,\"maxPrice\":500,\"minVol\":1000}"
}
```

返回示例：

```json
{
  "status": "ok",
  "data": [
    {
      "code": "sh600519",
      "name": "贵州茅台",
      "prob": 0.78,
      "amp": 3.2,
      "vol": 92349000
    }
  ]
}
```

## 三、统一规范建议（重要）

1. 前缀统一
- 建议 AI 接口统一到 /api/ai/*，避免 /api 与 /ai-api 并存导致联调歧义

2. 返回结构统一
- 全部使用同一格式：
  - 方案 A：{ status, data }
  - 或方案 B：{ code, msg, data }
- 请勿在同一模块混用两套结构

3. amp 单位固定
- 请明确 amp 是 3.2 代表 +3.2%，还是 0.032 代表 +3.2%
- 文档中固定后，前后端统一按该单位处理

## 四、前端当前状态说明

1. 前端已接入单股 AI 接口 /api/ai
2. 指标选股页面已支持三策略：
- 低估值高成长
- 均线多头排列
- 量价齐升
3. 当前由于 ai/select 不可用，前端暂走本地策略筛选 + 单股 AI 增强
4. 后端 ai/select 可用后，前端可切换为后端批量结果优先
