# AI 指标选股后端需求说明

## 1. 目标

当前前端 AI 选股页包含 3 个功能：

1. 自动推荐：已可用
2. 单股深度分析：已可用
3. 指标选股：前端页面已完成，但仍缺少正式的后端批量 AI 接口支持

本说明只描述后端还需要完成的内容，供后端同学直接实现。

## 2. 当前联调结论

已可用接口：

1. `GET /api/ai?code=sh600519`
2. 单股 AI 分析可正常返回数据

当前缺失接口：

1. `POST /api/ai/select`

当前“指标选股”页希望优先调用该接口获取批量 AI 结果；如果接口不可用，前端才会降级为“本地行情筛选 + 单股 AI 增强”。

## 3. 后端必须完成的接口

### 3.1 批量 AI 选股接口

- 路径：`POST /api/ai/select`
- 鉴权：与 `GET /api/ai` 保持一致
- Content-Type：`application/json`
- 目标：根据策略、筛选条件和权重，直接返回候选股票列表

## 4. 请求数据结构

后端建议同时兼容新格式和历史兼容字段。

请求示例：

```json
{
  "type": "indicator_select",
  "size": 10,
  "data": "{\"minPrice\":0,\"maxPrice\":500,\"minChange\":-10,\"maxChange\":10,\"minVol\":0,\"minCap\":0}",
  "strategy": "value_growth",
  "filters": {
    "minPrice": 0,
    "maxPrice": 500,
    "minChange": -10,
    "maxChange": 10,
    "minVol": 0,
    "minCap": 0
  },
  "weights": {
    "value": 0.5,
    "growth": 0.5
  },
  "limit": 10
}
```

### 4.1 字段说明

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `type` | string | 否 | 历史兼容字段，固定可为 `indicator_select` |
| `size` | number | 否 | 历史兼容字段，表示返回条数 |
| `data` | string | 否 | 历史兼容字段，内容为 `filters` 的 JSON 字符串 |
| `strategy` | string | 是 | 策略类型，见下文 |
| `filters` | object | 是 | 筛选条件对象 |
| `weights` | object | 否 | 权重，仅 `value_growth` 策略重点使用 |
| `limit` | number | 否 | 希望返回结果数量，建议默认 `10` |

### 4.2 strategy 可选值

后端需支持以下三种策略值：

1. `value_growth`：低估值高成长
2. `ma_bull`：均线多头排列
3. `price_volume_up`：量价齐升

### 4.3 filters 字段

```json
{
  "minPrice": 0,
  "maxPrice": 500,
  "minChange": -10,
  "maxChange": 10,
  "minVol": 0,
  "minCap": 0
}
```

字段说明：

1. `minPrice`：最低价格
2. `maxPrice`：最高价格
3. `minChange`：最低涨跌幅，单位为百分数，例如 `-10`
4. `maxChange`：最高涨跌幅，单位为百分数，例如 `10`
5. `minVol`：最低成交量门槛
6. `minCap`：最低市值门槛

### 4.4 weights 字段

```json
{
  "value": 0.5,
  "growth": 0.5
}
```

字段说明：

1. `value`：估值权重
2. `growth`：成长权重

建议两者和为 `1`。

## 5. 响应数据结构

后端返回建议统一为：

```json
{
  "status": "ok",
  "data": [
    {
      "code": "sh601872",
      "name": "招商轮船",
      "price": 18.11,
      "prob": 0.51,
      "amp": 0.055,
      "vol": 99974100
    }
  ]
}
```

## 6. 每只股票必须返回的字段

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `code` | string | 是 | 股票代码，建议带交易所前缀，如 `sh601872` |
| `name` | string | 是 | 股票名称 |
| `price` | number | 建议 | 最新价；不返回也可，但前端对应列会显示 `--` |
| `prob` | number | 是 | 未来上涨概率，范围固定为 `0~1` |
| `amp` | number | 是 | 未来预期涨跌幅，建议使用小数格式 |
| `vol` | number | 是 | 未来预估成交量，返回原始数值 |

说明：

1. 前端兼容 `code` 或 `test_code`，但建议统一使用 `code`
2. `name` 建议必须返回，否则表格只能显示代码

## 7. 字段单位规范

这部分必须固定，否则前端展示会错位。

### 7.1 prob

- 必须为 `0~1` 小数
- 示例：`0.78` 表示 `78%`
- 不要返回 `78`

### 7.2 amp

- 建议固定为小数
- 示例：`0.032` 表示 `+3.2%`
- 不要一部分接口返回 `0.032`，另一部分接口返回 `3.2`

### 7.3 vol

- 返回原始数值
- 前端会自行换算成“万”进行显示

## 8. 不需要后端返回的字段

以下字段由前端自行计算，不需要后端实现：

1. `strategyLabel`
2. `strategyScore`
3. `starLevel`
4. `rating`
5. `aiProbability`
6. `aiAmp`
7. `aiVolWan`

也就是说，后端只需要提供原始 AI 结果，不需要把页面上的展示字段全部算出来。

## 9. 建议的错误处理

建议至少统一以下行为：

1. 未登录或无权限：返回 `401`
2. 参数错误：返回 `400`
3. 服务异常：返回 `500`

错误响应建议：

```json
{
  "status": "error",
  "msg": "invalid params"
}
```

或：

```json
{
  "code": 400,
  "msg": "invalid params",
  "data": null
}
```

关键要求：同一模块内请不要混用多套含义冲突的格式。

## 10. 验收标准

后端完成后，以以下结果作为联调通过标准：

1. `POST /api/ai/select` 返回 `200`
2. 返回体中 `data` 为数组
3. 数组每项至少包含：`code`、`name`、`prob`、`amp`、`vol`
4. `prob` 为 `0~1` 小数
5. `amp` 为小数格式
6. 前端“指标选股”页点击“开始AI选股”后可直接展示结果，不再依赖降级逻辑

## 11. 最小可交付版本

如果只追求前后端尽快联调成功，后端最少做到下面这个级别即可：

请求：

```json
{
  "strategy": "value_growth",
  "filters": {
    "minPrice": 0,
    "maxPrice": 500,
    "minChange": -10,
    "maxChange": 10,
    "minVol": 0,
    "minCap": 0
  },
  "weights": {
    "value": 0.5,
    "growth": 0.5
  },
  "limit": 10
}
```

响应：

```json
{
  "status": "ok",
  "data": [
    {
      "code": "sh601872",
      "name": "招商轮船",
      "price": 18.11,
      "prob": 0.51,
      "amp": 0.055,
      "vol": 99974100
    }
  ]
}
```

这就是当前“指标选股”从前端切换到正式后端 AI 驱动所需的最小数据结构。