# 用户模块接口需求

> 计算机设计大赛 - 前端所需后端接口说明  
> 更新时间：2026-03-04

---

## 一、用户信息接口

### `GET /user/info`

获取当前登录用户的基础信息。

**响应示例：**
```json
{
  "status": "ok",
  "data": {
    "username": "testuser",
    "balance": 1000000.00,
    "today_profit": 1234.56
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `username` | string | 用户名 |
| `balance` | number | 模拟资金余额（元） |
| `today_profit` | number | 今日盈亏（元），可正可负 |

---

## 二、持仓列表接口

### `GET /trade/hold`

获取用户当前持仓股票列表。

**响应示例：**
```json
{
  "status": "ok",
  "data": [
    {
      "code": "sh600519",
      "name": "贵州茅台",
      "hold": 100,
      "cost": "1800.50",
      "price": "1850.00",
      "profit": "4950.00",
      "profit_rate": "2.75"
    },
    {
      "code": "sz000001",
      "name": "平安银行",
      "hold": 200,
      "cost": "12.35",
      "price": "12.10",
      "profit": "-50.00",
      "profit_rate": "-2.02"
    }
  ]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | string | 股票代码（带 sh/sz 前缀） |
| `name` | string | 股票名称 |
| `hold` | number | 持仓数量（股） |
| `cost` | string | 成本价（元），格式化字符串 |
| `price` | string | 最新价（元），格式化字符串 |
| `profit` | string | 浮动盈亏（元），可正可负 |
| `profit_rate` | string | 盈亏比例（%） |

---

## 三、委托下单接口

### `POST /trade/order`

提交买入或卖出委托。

**请求参数：**
```json
{
  "code": "sh600519",
  "direction": "buy",
  "price": 1800.50,
  "amount": 100
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `code` | string | ✅ | 股票代码（带前缀） |
| `direction` | string | ✅ | 交易方向：`buy` 买入 / `sell` 卖出 |
| `price` | number | ✅ | 委托价格（元） |
| `amount` | number | ✅ | 委托数量（股），需为100的整数倍 |

**响应示例：**
```json
{
  "status": "ok",
  "data": {
    "order_no": "ORD20260304123456",
    "msg": "委托成功"
  }
}
```

**错误响应示例：**
```json
{
  "status": "error",
  "data": "余额不足"
}
```

---

## 四、交易记录接口

### `GET /trade/order/list`

获取用户历史交易记录。

**响应示例：**
```json
{
  "status": "ok",
  "data": [
    {
      "order_no": "ORD20260304123456",
      "code": "sh600519",
      "name": "贵州茅台",
      "direction": "buy",
      "price": 1800.50,
      "amount": 100,
      "status": "success",
      "profit": 0,
      "create_time": "2026-03-04 10:30:00"
    }
  ]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `order_no` | string | 委托单号 |
| `code` | string | 股票代码 |
| `name` | string | 股票名称 |
| `direction` | string | 方向：`buy` / `sell` |
| `price` | number | 成交价格 |
| `amount` | number | 成交数量 |
| `status` | string | 状态：`success` 已成交 / `pending` 待成交 / `cancelled` 已撤销 |
| `profit` | number | 盈亏金额（卖出时计算） |
| `create_time` | string | 委托时间 |

---

## 五、接口优先级

| 优先级 | 接口 | 说明 |
|--------|------|------|
| 🔴 高 | `/user/info` | 个人中心页面展示 |
| 🔴 高 | `/trade/hold` | 持仓查询、卖出选股 |
| 🔴 高 | `/trade/order` | 买入/卖出核心功能 |
| 🔴 高 | `/trade/order/list` | 交易记录展示 |

---

## 六、备注

1. **登录注册接口**已完成对接，无需修改
2. **自选股功能**目前使用前端 localStorage 实现，如需多端同步可后续扩展
3. 所有接口需要携带 `Authorization: Bearer <token>` 认证
4. 股票代码统一使用带前缀格式：`sh600519`（沪市）、`sz000001`（深市）

---

**有问题随时沟通！**
