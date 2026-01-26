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
                <el-input
                  v-model="buyForm.code"
                  placeholder="请输入股票代码"
                  @blur="getStockName('buy')"
                ></el-input>
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
                  type="number"
                  placeholder="默认最新价"
                  @blur="calcTotal('buy')"
                ></el-input>
              </el-form-item>
              <el-form-item label="买入数量" prop="amount">
                <el-input
                  v-model="buyForm.amount"
                  type="number"
                  placeholder="最少100股，整百股"
                  @input="checkAmount('buy')"
                  @blur="calcTotal('buy')"
                ></el-input>
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
                  type="number"
                  placeholder="默认最新价"
                  @blur="calcTotal('sell')"
                ></el-input>
              </el-form-item>
              <el-form-item label="卖出数量" prop="amount">
                <el-input
                  v-model="sellForm.amount"
                  type="number"
                  placeholder="最多持仓数量"
                  @input="checkAmount('sell')"
                  @blur="calcTotal('sell')"
                ></el-input>
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
      // 买入表单
      buyForm: {
        code: '',
        name: '',
        price: '',
        amount: ''
      },
      // 卖出表单
      sellForm: {
        code: '',
        name: '',
        holdAmount: '',
        price: '',
        amount: ''
      },
      // 买入表单校验规则
      buyRules: {
        code: [{ required: true, message: '请输入股票代码', trigger: 'blur' }, { len: 6, message: '股票代码为6位数字', trigger: 'blur' }],
        name: [{ required: true, message: '股票名称不能为空', trigger: 'blur' }],
        price: [{ required: true, message: '请输入买入价格', trigger: 'blur' }, { type: 'number', min: 0.01, message: '价格不能小于0.01', trigger: 'blur' }],
        amount: [{ required: true, message: '请输入买入数量', trigger: 'blur' }, { type: 'number', min: 100, message: '最少买入100股', trigger: 'blur' }]
      },
      // 卖出表单校验规则
      sellRules: {
        code: [{ required: true, message: '请选择持仓股票', trigger: 'change' }],
        price: [{ required: true, message: '请输入卖出价格', trigger: 'blur' }, { type: 'number', min: 0.01, message: '价格不能小于0.01', trigger: 'blur' }],
        amount: [{ required: true, message: '请输入卖出数量', trigger: 'blur' }, { type: 'number', min: 100, message: '最少卖出100股', trigger: 'blur' }]
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
    this.fetchHoldList();
    this.fetchOrderList();
    this.fetchUserInfo();
  },
  methods: {
    getChangeClass,
    // 获取持仓列表
    async fetchHoldList() {
      try {
        const res = await request.getHoldList();
        this.holdList = res.list.map(item => ({
          ...item,
          cost: formatPrice(item.cost),
          price: formatPrice(item.price),
          profit: formatPrice(item.profit),
          profit_rate: formatPrice(item.profit_rate)
        }));
      } catch (err) {
        this.$message.error('持仓数据加载失败');
      }
    },
    // 获取委托单列表
    fetchOrderList() {
      // 模拟委托单数据
      this.orderList = [
        {
          order_no: '20260125001',
          code: '600519',
          name: '贵州茅台',
          direction: 'buy',
          price: '1780.00',
          amount: '100',
          status: 'success',
          create_time: '2026-01-25 10:30:25'
        },
        {
          order_no: '20260125002',
          code: '002594',
          name: '比亚迪',
          direction: 'sell',
          price: '285.00',
          amount: '200',
          status: 'pending',
          create_time: '2026-01-25 14:15:40'
        }
      ];
    },
    // 获取用户信息（资金）
    async fetchUserInfo() {
      try {
        const res = await request.getUserInfo();
        this.userBalance = formatPrice(res.balance);
      } catch (err) {
        this.$message.error('用户信息加载失败');
      }
    },
    // 买入时获取股票名称
    async getStockName(type) {
      const code = type === 'buy' ? this.buyForm.code : this.sellForm.code;
      if (!code || code.length !== 6) return;
      try {
        const res = await request.getStockDetail(code);
        if (type === 'buy') {
          this.buyForm.name = res.name;
          this.buyForm.price = formatPrice(res.price);
        } else {
          this.sellForm.name = res.name;
          this.sellForm.price = formatPrice(res.price);
        }
        this.calcTotal(type);
      } catch (err) {
        this.$message.warning('未查询到该股票信息');
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
    // 提交委托
    async submitTrade(type) {
      const formRef = type === 'buy' ? this.$refs.buyFormRef : this.$refs.sellFormRef;
      formRef.validate(async (valid) => {
        if (valid) {
          const isAmountValid = type === 'buy' ? this.buyForm.amount % 100 === 0 : this.sellForm.amount % 100 === 0;
          if (!isAmountValid) {
            this.$message.warning('委托数量需为100股的整数倍');
            return;
          }

          const isFundValid = type === 'buy' ? Number(this.buyTotal) <= Number(this.userBalance) : Number(this.sellForm.amount) <= Number(this.sellForm.holdAmount);
          if (!isFundValid) {
            this.$message.warning(type === 'buy' ? '资金不足，无法委托' : '卖出数量不能超过持仓数量');
            return;
          }

          try {
            const params = type === 'buy' ? {
              code: this.buyForm.code,
              direction: 'buy',
              price: this.buyForm.price,
              amount: this.buyForm.amount
            } : {
              code: this.sellForm.code,
              direction: 'sell',
              price: this.sellForm.price,
              amount: this.sellForm.amount
            };

            const res = await request.submitTradeOrder(params);
            this.$message.success(`${type === 'buy' ? '买入' : '卖出'}委托提交成功，委托单号：${res.order_no}`);

            // 重置表单
            type === 'buy' ? this.$refs.buyFormRef.resetFields() : this.$refs.sellFormRef.resetFields();
            this.buyFee = '0.00';
            this.buyTotal = '0.00';
            this.sellFee = '0.00';
            this.sellTotal = '0.00';

            // 刷新持仓和委托单
            this.fetchHoldList();
            this.fetchOrderList();
            this.fetchUserInfo();
          } catch (err) {
            this.$message.error('委托提交失败，请稍后重试');
          }
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
        // 模拟撤销成功
        this.orderList = this.orderList.map(item => 
          item.order_no === order.order_no ? { ...item, status: 'canceled' } : item
        );
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
</style>