<template>
  <el-main style="padding: var(--spacing-base); background: var(--color-bg);">
    <div class="card-container">
      <el-tabs v-model="activeTab" type="border-card" style="width: 100%;">
        <el-tab-pane label="买入" name="buy">
          <div class="trade-form">
            <el-form
              :model="buyForm"
              :rules="buyRules"
              ref="buyFormRef"
              label-width="100px"
            >
              <el-form-item label="股票代码" prop="code">
                <el-autocomplete
                  v-model="buyForm.code"
                  :fetch-suggestions="queryStock"
                  @select="handleStockSelect"
                  @blur="getStockName('buy')"
                  placeholder="请输入股票代码或名称"
                  clearable
                ></el-autocomplete>
              </el-form-item>
              <el-form-item label="股票名称" prop="name">
                <el-input
                  v-model="buyForm.name"
                  readonly
                  placeholder="自动填充"
                  style="background: #f9f9f9;"
                ></el-input>
              </el-form-item>
              <el-form-item label="买入价格" prop="price">
                <el-input
                  v-model="buyForm.price"
                  placeholder="默认最新价"
                  @blur="calcTotal('buy')"
                >
                  <template slot="append">元</template>
                </el-input>
              </el-form-item>
              <el-form-item label="买入数量" prop="amount">
                <el-input-number
                  v-model="buyForm.amount"
                  :min="100"
                  :step="100"
                  :step-strictly="true"
                  placeholder="最少100股"
                  controls-position="right"
                  style="width: 100%;"
                  @change="calcTotal('buy')"
                ></el-input-number>
                <div class="form-tip">提示：委托数量需为100股的整数倍</div>
              </el-form-item>
              <el-form-item label="可用资金">
                <el-input
                  :value="userBalance"
                  readonly
                  style="background: #f9f9f9;"
                ></el-input>
              </el-form-item>
              <el-form-item label="预估手续费">
                <el-input
                  :value="buyFee"
                  readonly
                  style="background: #f9f9f9;"
                ></el-input>
              </el-form-item>
              <el-form-item label="预估总额">
                <el-input
                  :value="buyTotal"
                  readonly
                  :class="{'text-up': Number(buyTotal) > Number(userBalance)}"
                  style="background: #f9f9f9;"
                ></el-input>
                <div class="form-tip" v-if="Number(buyTotal) > Number(userBalance)">
                  <i class="el-icon-warning text-up"></i> 资金不足，无法委托
                </div>
              </el-form-item>
              <el-form-item>
                <el-button
                  type="primary"
                  @click="submitTrade('buy')"
                  :disabled="Number(buyTotal) > Number(userBalance) || !buyForm.amount || !buyForm.price || !buyForm.code"
                >
                  买入委托
                </el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>

        <el-tab-pane label="卖出" name="sell">
          <div class="trade-form">
            <el-form
              :model="sellForm"
              :rules="sellRules"
              ref="sellFormRef"
              label-width="100px"
            >
              <el-form-item label="持仓股票" prop="code">
                <el-select
                  v-model="sellForm.code"
                  placeholder="请选择持仓股票"
                  @change="getStockInfo"
                >
                  <el-option
                    v-for="stock in holdList"
                    :key="stock.code"
                    :label="`${stock.name}(${stock.code})`"
                    :value="stock.code"
                  ></el-option>
                </el-select>
              </el-form-item>
              <el-form-item label="股票名称" prop="name">
                <el-input
                  v-model="sellForm.name"
                  readonly
                  style="background: #f9f9f9;"
                ></el-input>
              </el-form-item>
              <el-form-item label="持仓数量" prop="holdAmount">
                <el-input
                  v-model="sellForm.holdAmount"
                  readonly
                  style="background: #f9f9f9;"
                ></el-input>
              </el-form-item>
              <el-form-item label="卖出价格" prop="price">
                <el-input
                  v-model="sellForm.price"
                  placeholder="默认最新价"
                  @blur="calcTotal('sell')"
                >
                  <template slot="append">元</template>
                </el-input>
              </el-form-item>
              <el-form-item label="卖出数量" prop="amount">
                <el-input-number
                  v-model="sellForm.amount"
                  :min="100"
                  :max="Number(sellForm.holdAmount) || Infinity"
                  :step="100"
                  :step-strictly="true"
                  placeholder="最多持仓数量"
                  controls-position="right"
                  style="width: 100%;"
                  @change="calcTotal('sell')"
                ></el-input-number>
                <div class="form-tip">提示：委托数量需为100股的整数倍，不超过持仓数量</div>
              </el-form-item>
              <el-form-item label="预估手续费">
                <el-input
                  :value="sellFee"
                  readonly
                  style="background: #f9f9f9;"
                ></el-input>
              </el-form-item>
              <el-form-item label="预估净额">
                <el-input
                  :value="sellTotal"
                  readonly
                  style="background: #f9f9f9;"
                ></el-input>
              </el-form-item>
              <el-form-item>
                <el-button
                  type="primary"
                  @click="submitTrade('sell')"
                  :disabled="!sellForm.amount || !sellForm.price || !sellForm.code || Number(sellForm.amount) > Number(sellForm.holdAmount)"
                >
                  卖出委托
                </el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>

        <el-tab-pane label="持仓查询" name="hold">
          <div class="hold-list">
            <el-table
              :data="holdList"
              border
              style="width: 100%;"
            >
              <el-table-column prop="code" label="股票代码" width="100" />
              <el-table-column prop="name" label="股票名称" width="120" />
              <el-table-column prop="hold" label="持仓数量" width="100" />
              <el-table-column prop="cost" label="成本价" width="100">
                <template slot-scope="scope">{{ scope.row.cost }}</template>
              </el-table-column>
              <el-table-column prop="price" label="最新价" width="100">
                <template slot-scope="scope">
                  <span :class="getChangeClass(scope.row.profit)">{{ scope.row.price }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="profit" label="浮盈" width="100">
                <template slot-scope="scope">
                  <span :class="getChangeClass(scope.row.profit)">{{ scope.row.profit }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="profit_rate" label="浮盈率(%)" width="120">
                <template slot-scope="scope">
                  <span :class="getChangeClass(scope.row.profit)">{{ scope.row.profit_rate }}%</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="100">
                <template slot-scope="scope">
                  <el-button
                    type="text"
                    @click="toSell(scope.row)"
                    class="text-down"
                  >
                    卖出
                  </el-button>
                </template>
              </el-table-column>
            </el-table>

            <div class="balance-info" v-if="userBalance">
              <div class="balance-item">
                <span class="label">账户总资产：</span>
                <span class="value data-text">{{ totalAsset }}</span>
              </div>
              <div class="balance-item">
                <span class="label">可用资金：</span>
                <span class="value">{{ userBalance }}</span>
              </div>
              <div class="balance-item">
                <span class="label">持仓总市值：</span>
                <span class="value">{{ holdValue }}</span>
              </div>
            </div>

            <div class="no-hold" v-if="holdList.length === 0">
              <el-empty description="暂无持仓，请先买入股票"></el-empty>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="委托单查询" name="order">
          <div class="order-list">
            <el-table
              :data="orderList"
              border
              style="width: 100%;"
            >
              <el-table-column prop="order_no" label="委托单号" width="160" />
              <el-table-column prop="code" label="股票代码" width="100" />
              <el-table-column prop="name" label="股票名称" width="120" />
              <el-table-column prop="direction" label="委托类型" width="100">
                <template slot-scope="scope">
                  <span class="direction-tag" :class="scope.row.direction === 'buy' ? 'tag-buy' : 'tag-sell'">
                    {{ scope.row.direction === 'buy' ? '买入' : '卖出' }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column prop="price" label="委托价格" width="100" />
              <el-table-column prop="amount" label="委托数量" width="100" />
              <el-table-column prop="status" label="委托状态" width="120">
                <template slot-scope="scope">
                  <span class="status-tag" :class="getOrderStatusClass(scope.row.status)">
                    {{ scope.row.status === 'success' ? '已成交' : scope.row.status === 'pending' ? '待成交' : '已撤销' }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column prop="create_time" label="委托时间" width="160" />
              <el-table-column label="操作" width="100" v-if="activeTab === 'order'">
                <template slot-scope="scope">
                  <el-button
                    type="text"
                    @click="cancelOrder(scope.row)"
                    class="text-up"
                    v-if="scope.row.status === 'pending'"
                  >
                    撤销
                  </el-button>
                </template>
              </el-table-column>
            </el-table>

            <div class="no-order" v-if="orderList.length === 0">
              <el-empty description="暂无委托单记录"></el-empty>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </el-main>
</template>

<script>
import { mapState } from 'vuex';
import request from '../../utils/request';
import { getChangeClass, formatPrice } from '../../utils/format';

export default {
  name: 'TradePanel',
  data() {
    return {
      activeTab: 'buy',
      loading: false,
      // 买入表单
      buyForm: {
        code: '',
        name: '',
        price: '',
        amount: undefined
      },
      // 卖出表单
      sellForm: {
        code: '',
        name: '',
        holdAmount: '',
        price: '',
        amount: undefined
      },
      // 买入表单校验规则
      buyRules: {
        code: [{ required: true, message: '请输入股票代码', trigger: 'blur' }, { len: 6, message: '股票代码为6位数字', trigger: 'blur' }],
        name: [{ required: true, message: '股票名称不能为空', trigger: 'blur' }],
        price: [{ required: true, message: '请输入买入价格', trigger: 'blur' },
                { validator: (r, v, cb) => { const n = Number(v); (!v && v !== 0) || isNaN(n) || n < 0.01 ? cb(new Error('价格不能小于0.01')) : cb(); }, trigger: 'blur' }],
        amount: [{ required: true, message: '请输入买入数量', trigger: 'change' },
                 { validator: (r, v, cb) => { const n = Number(v); !n || n < 100 ? cb(new Error('最少买入100股')) : n % 100 !== 0 ? cb(new Error('数量需为100的整数倍')) : cb(); }, trigger: 'change' }]
      },
      // 卖出表单校验规则
      sellRules: {
        code: [{ required: true, message: '请选择持仓股票', trigger: 'change' }],
        price: [{ required: true, message: '请输入卖出价格', trigger: 'blur' },
                { validator: (r, v, cb) => { const n = Number(v); (!v && v !== 0) || isNaN(n) || n < 0.01 ? cb(new Error('价格不能小于0.01')) : cb(); }, trigger: 'blur' }],
        amount: [{ required: true, message: '请输入卖出数量', trigger: 'change' },
                 { validator: (r, v, cb) => { const n = Number(v); !n || n < 100 ? cb(new Error('最少卖出100股')) : n % 100 !== 0 ? cb(new Error('数量需为100的整数倍')) : cb(); }, trigger: 'change' }]
      },
      // 持仓列表
      holdList: [],
      // 委托单列表
      orderList: [],
      // 用户资金
      userBalance: '0.00',
      // 买入相关计算
      buyFee: '0.00',
      buyTotal: '0.00',
      // 卖出相关计算
      sellFee: '0.00',
      sellTotal: '0.00'
    };
  },
  computed: {
    ...mapState(['currentStockCode']),
    // 持仓总市值
    holdValue() {
      let value = 0;
      this.holdList.forEach(stock => {
        value += Number(stock.price) * Number(stock.hold);
      });
      return formatPrice(value);
    },
    // 账户总资产
    totalAsset() {
      return formatPrice(Number(this.userBalance) + Number(this.holdValue));
    }
  },
  mounted() {
    // ====== 前端模拟交易系统（后端无交易接口，全部使用 localStorage） ======

    // 初始化模拟资金（首次登录给 100 万）
    if (!localStorage.getItem('sim_balance')) {
      localStorage.setItem('sim_balance', '1000000');
    }
    this.userBalance = formatPrice(Number(localStorage.getItem('sim_balance')) || 1000000);

    // 从 localStorage 读取持仓和委托单
    try {
      const savedHold = JSON.parse(localStorage.getItem('sim_hold_list') || '[]');
      this.holdList = savedHold;
    } catch (e) { this.holdList = []; }
    try {
      const savedOrders = JSON.parse(localStorage.getItem('sim_order_list') || '[]');
      this.orderList = savedOrders;
    } catch (e) { this.orderList = []; }

    // 更新持仓的实时价格（并行查询，不阻塞）
    this.refreshHoldPrices();

    // 如果从其他页面带了股票代码过来，自动填写
    if (this.$route.query.code) {
      this.buyForm.code = this.$route.query.code;
      this.buyForm.name = this.$route.query.name || '';
      if (this.$route.query.price) {
        this.buyForm.price = this.$route.query.price;
      }
      // 如果路由已带了名称，无需再请求后端；否则从行情缓存补全
      if (!this.buyForm.name) {
        this.getStockNameFromCache('buy');
      }
    }
  },
  methods: {
    getChangeClass,

    // ====== 持仓实时价格刷新（调用真实行情接口） ======
    async refreshHoldPrices() {
      if (!this.holdList.length) return;
      try {
        const results = await request.getStockLastBatch(this.holdList.map(s => s.code));
        results.forEach((d, i) => {
          if (!d || !d.last) return;
          const stock = this.holdList[i];
          const currentPrice = Number(d.last);
          const costNum = Number(stock.cost) || currentPrice;
          const holdNum = Number(stock.hold) || 0;
          const profit = (currentPrice - costNum) * holdNum;
          const profitRate = costNum > 0 ? ((currentPrice - costNum) / costNum * 100) : 0;
          this.$set(this.holdList, i, {
            ...stock,
            name: d.name || stock.name,
            price: formatPrice(currentPrice),
            profit: formatPrice(profit),
            profit_rate: profitRate.toFixed(2)
          });
        });
        this._saveHoldList();
      } catch (e) {
        console.warn('refreshHoldPrices error:', e);
      }
    },

    // ====== localStorage 持久化 ======
    _saveHoldList() {
      localStorage.setItem('sim_hold_list', JSON.stringify(this.holdList));
    },
    _saveOrderList() {
      localStorage.setItem('sim_order_list', JSON.stringify(this.orderList));
    },
    _saveBalance() {
      localStorage.setItem('sim_balance', String(this._rawBalance()));
    },
    _rawBalance() {
      return Number(String(this.userBalance).replace(/,/g, '')) || 0;
    },

    // ====== 股票搜索 ======
    async queryStock(queryString, callback) {
      if (!queryString || queryString.length < 1) { callback([]); return; }
      try {
        // 用 getSpot 缓存数据做前端搜索
        const res = await request.getSpot('ShA');
        const list = res.data || [];
        const kw = queryString.toLowerCase();
        const matched = list.filter(item =>
          (item.code && item.code.toLowerCase().includes(kw)) ||
          (item.name && item.name.includes(kw))
        ).slice(0, 10);
        callback(matched.map(item => ({
          value: item.code,
          label: `${item.code} ${item.name}`
        })));
      } catch (err) {
        callback([]);
      }
    },
    // 选择股票后自动填充名称和价格
    async handleStockSelect(item) {
      this.buyForm.code = item.value;
      try {
        const res = await request.getStockLast(item.value, { _silent: true });
        const d = res.data || {};
        if (d.name) {
          this.buyForm.name = d.name;
          this.buyForm.price = formatPrice(d.last);
          this.calcTotal('buy');
        } else {
          this.getStockNameFromCache('buy');
        }
      } catch (err) {
        // 静默回退到缓存
        this.getStockNameFromCache('buy');
      }
    },
    // 获取用户信息（前端模拟，不调后端）
    fetchUserInfo() {
      this.userBalance = formatPrice(Number(localStorage.getItem('sim_balance')) || 1000000);
    },
    // 买入时获取股票名称（在线查询）
    async getStockName(type) {
      const code = type === 'buy' ? this.buyForm.code : this.sellForm.code;
      if (!code || code.length !== 6) return;
      try {
        const res = await request.getStockLast(code, { _silent: true });
        const d = res.data || {};
        if (d.name) {
          if (type === 'buy') {
            this.buyForm.name = d.name;
            this.buyForm.price = formatPrice(d.last);
          } else {
            this.sellForm.name = d.name;
            this.sellForm.price = formatPrice(d.last);
          }
          this.calcTotal(type);
        } else {
          // 在线查询没返回有效数据，尝试从缓存补全
          this.getStockNameFromCache(type);
        }
      } catch (err) {
        // 接口失败时静默回退到缓存查询，不弹错误提示
        console.warn('getStockName fallback to cache:', err.message);
        this.getStockNameFromCache(type);
      }
    },
    // 从行情缓存中查找股票名称和价格（无需后端接口）
    async getStockNameFromCache(type) {
      const code = type === 'buy' ? this.buyForm.code : this.sellForm.code;
      if (!code) return;
      try {
        const res = await request.getSpot('ShA');
        const list = res.data || [];
        const found = list.find(item => item.code === code || item.code === code.replace(/^(sh|sz|bj)/i, ''));
        if (found) {
          if (type === 'buy') {
            if (!this.buyForm.name) this.buyForm.name = found.name;
            if (!this.buyForm.price) this.buyForm.price = formatPrice(found.last);
          } else {
            if (!this.sellForm.name) this.sellForm.name = found.name;
            if (!this.sellForm.price) this.sellForm.price = formatPrice(found.last);
          }
          this.calcTotal(type);
        }
      } catch (e) {
        console.warn('getStockNameFromCache error:', e.message);
      }
    },
    // 卖出时获取股票信息
    getStockInfo(code) {
      const stock = this.holdList.find(item => item.code === code);
      if (stock) {
        this.sellForm.name = stock.name;
        this.sellForm.holdAmount = stock.hold;
        this.sellForm.price = stock.price;
      }
    },
    // 检查数量是否为100的整数倍
    checkAmount(type) {
      const amount = type === 'buy' ? this.buyForm.amount : this.sellForm.amount;
      if (amount && amount % 100 !== 0) {
        this.$message.warning('委托数量需为100股的整数倍');
      }
    },
    // 计算手续费和总额
    calcTotal(type) {
      const rate = 0.0005; // 手续费率0.05%
      if (type === 'buy') {
        const price = Number(this.buyForm.price) || 0;
        const amount = Number(this.buyForm.amount) || 0;
        this.buyFee = formatPrice(price * amount * rate);
        this.buyTotal = formatPrice(price * amount + Number(this.buyFee));
      } else {
        const price = Number(this.sellForm.price) || 0;
        const amount = Number(this.sellForm.amount) || 0;
        this.sellFee = formatPrice(price * amount * rate);
        this.sellTotal = formatPrice(price * amount - Number(this.sellFee));
      }
    },
    // 提交委托（前端模拟交易）
    async submitTrade(type) {
      const formRef = type === 'buy' ? this.$refs.buyFormRef : this.$refs.sellFormRef;
      formRef.validate(async (valid) => {
        if (valid) {
          const form = type === 'buy' ? this.buyForm : this.sellForm;
          const amount = Number(form.amount);
          const price = Number(form.price);

          if (!amount || amount % 100 !== 0) {
            this.$message.warning('委托数量需为100股的整数倍');
            return;
          }

          const totalCost = price * amount;
          const fee = Math.max(totalCost * 0.0005, 5); // 佣金最低5元
          const balance = this._rawBalance();

          if (type === 'buy') {
            // 资金检查
            if (totalCost + fee > balance) {
              this.$message.warning('资金不足，无法委托');
              return;
            }

            // 扣除资金
            const newBalance = balance - totalCost - fee;
            this.userBalance = formatPrice(newBalance);
            this._saveBalance();

            // 更新持仓（合并同股票）
            const existIdx = this.holdList.findIndex(s => s.code === form.code);
            if (existIdx >= 0) {
              const old = this.holdList[existIdx];
              const oldHold = Number(old.hold) || 0;
              const oldCost = Number(old.cost) || price;
              const newHold = oldHold + amount;
              const newCost = ((oldCost * oldHold) + (price * amount)) / newHold;
              this.$set(this.holdList, existIdx, {
                ...old,
                hold: newHold,
                cost: formatPrice(newCost),
                price: formatPrice(price),
                profit: formatPrice((price - newCost) * newHold),
                profit_rate: (newCost > 0 ? ((price - newCost) / newCost * 100) : 0).toFixed(2)
              });
            } else {
              this.holdList.push({
                code: form.code,
                name: form.name,
                hold: amount,
                cost: formatPrice(price),
                price: formatPrice(price),
                profit: '0.00',
                profit_rate: '0.00'
              });
            }
            this._saveHoldList();

          } else {
            // 卖出：检查持仓
            const existIdx = this.holdList.findIndex(s => s.code === form.code);
            if (existIdx < 0 || Number(this.holdList[existIdx].hold) < amount) {
              this.$message.warning('持仓不足');
              return;
            }

            // 增加资金（扣除卖出费用：佣金+印花税）
            const stampTax = totalCost * 0.001; // 印花税千分之一
            const newBalance = balance + totalCost - fee - stampTax;
            this.userBalance = formatPrice(newBalance);
            this._saveBalance();

            // 减少持仓
            const old = this.holdList[existIdx];
            const remainHold = Number(old.hold) - amount;
            if (remainHold <= 0) {
              this.holdList.splice(existIdx, 1);
            } else {
              this.$set(this.holdList, existIdx, { ...old, hold: remainHold });
            }
            this._saveHoldList();
          }

          // 生成委托单号
          const now = new Date();
          const orderNo = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
          const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

          // 添加委托单记录
          this.orderList.unshift({
            order_no: orderNo,
            code: form.code,
            name: form.name,
            direction: type,
            price: formatPrice(price),
            amount: amount,
            status: 'success',
            create_time: timeStr
          });
          this._saveOrderList();

          this.$message.success(`${type === 'buy' ? '买入' : '卖出'}委托成功，委托单号：${orderNo}`);

          // 重置表单
          if (type === 'buy') {
            this.$refs.buyFormRef.resetFields();
          } else {
            this.$refs.sellFormRef.resetFields();
          }
          this.buyFee = '0.00';
          this.buyTotal = '0.00';
          this.sellFee = '0.00';
          this.sellTotal = '0.00';
        }
      });
    },
    // 跳转到卖出页
    toSell(stock) {
      this.activeTab = 'sell';
      this.sellForm.code = stock.code;
      this.sellForm.name = stock.name;
      this.sellForm.holdAmount = stock.hold;
      this.sellForm.price = stock.price;
    },
    // 撤销委托
    cancelOrder(order) {
      this.$confirm('确定要撤销该委托单吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.orderList = this.orderList.map(item => 
          item.order_no === order.order_no ? { ...item, status: 'canceled' } : item
        );
        this._saveOrderList();
        this.$message.success('委托单撤销成功');
      }).catch(() => {
        this.$message.info('已取消撤销');
      });
    },
    // 获取委托状态样式
    getOrderStatusClass(status) {
      if (status === 'success') return 'tag-success';
      if (status === 'pending') return 'tag-pending';
      return 'tag-canceled';
    }
  }
};
</script>

<style scoped>
.trade-form {
  padding: 10px;
}
.el-form-item {
  margin-bottom: 20px;
}
.form-tip {
  font-size: 12px;
  color: #999;
  margin-top: 5px;
}
/* 数量输入框数字左对齐 */
::v-deep .el-input-number .el-input__inner {
  text-align: left;
}
.hold-list, .order-list {
  padding: 10px;
}
.balance-info {
  display: flex;
  gap: 30px;
  margin-top: 20px;
  padding: 15px;
  background: #f9f9f9;
  border-radius: var(--border-radius-base);
}
.balance-item {
  display: flex;
  align-items: center;
}
.label {
  font-size: 14px;
  color: #666;
  margin-right: 10px;
}
.value {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}
.no-hold, .no-order {
  margin-top: 50px;
  text-align: center;
}
.direction-tag, .status-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  color: #fff;
}
.tag-buy {
  background-color: var(--color-up);
}
.tag-sell {
  background-color: var(--color-down);
}
.tag-success {
  background-color: var(--color-down);
}
.tag-pending {
  background-color: #ff9f43;
}
.tag-canceled {
  background-color: #999;
}
.text-up {
  color: var(--color-up);
}
</style>