<template>
  <!-- 左侧侧边栏容器：固定宽度+垂直滚动，确保在左侧显示 -->
  <el-aside 
    :width="`var(--sidebar-width)`" 
    class="sidebar" 
    style="background: #fff; border-right: 1px solid var(--color-border); height: calc(100vh - 60px); overflow-y: auto; float: left;"
  >
    <!-- 1. 自选股模块（核心功能：列表+批量操作） -->
    <div class="sidebar-module">
      <div class="module-header">
        <h3 class="module-title">自选股</h3>
        <div class="btn-group">
          <el-button
            type="text"
            icon="el-icon-plus"
            class="add-btn"
            @click="openAddOptionalPrompt"
          ></el-button>
          <el-button
            type="text"
            icon="el-icon-delete"
            class="batch-delete-btn"
            @click="batchDeleteOptionalStock"
            :disabled="selectedStockCodes?.length === 0"
          >
            批量删除
          </el-button>
        </div>
      </div>
      <div class="stock-list">
        <!-- 全选框：加 optionalStocks 空值判断 -->
        <div class="stock-item-header" v-if="optionalStocks?.length > 0">
          <el-checkbox v-model="selectAll" @change="handleSelectAll">全选</el-checkbox>
        </div>
        <!-- 自选股列表：v-for 遍历前加空值兜底 -->
        <div
          v-for="stock in optionalStocks || []"
          :key="stock?.code"  
          class="stock-item"
          :class="{ 'active': stock?.code === currentStockCode }"
          @click="goStockDetail(stock)"
        >
          <el-checkbox
            v-model="selectedStockCodes"
            :label="stock?.code"
            @change.stop="handleSingleSelect(stock?.code)"
            class="stock-checkbox"
          >&ZeroWidthSpace;</el-checkbox>
          <div class="stock-info">
            <span class="stock-code">{{ stripStockPrefix(stock?.code) }}</span>
            <span class="stock-name">{{ stock?.name }}</span>
          </div>
          <div class="stock-price" :class="getChangeClass(stock?.change)">
            {{ stock?.price }}
            <span class="stock-change">
              {{ stock?.change > 0 ? '↑' : stock?.change < 0 ? '↓' : '' }}{{ Math.abs(stock?.change || 0) }}
            </span>
          </div>
          <el-button
            type="text"
            icon="el-icon-delete"
            class="delete-btn"
            @click.stop="deleteOptionalStock(stock?.code)"
          ></el-button>
        </div>
        <!-- 空状态提示：加可选链操作符 -->
        <div class="no-stock" v-if="optionalStocks?.length === 0">
          <el-empty description="暂无自选股，请添加"></el-empty>
          <el-button type="text" class="quick-add-btn" @click="openAddOptionalPrompt">快速添加</el-button>
        </div>
      </div>
    </div>

    <!-- 2. 市场分类模块（树形结构：沪深A股/板块/概念） -->
    <div class="sidebar-module">
      <div class="module-header">
        <h3 class="module-title">市场分类</h3>
      </div>
      <el-tree
        :data="marketTreeData"
        :props="treeProps"
        @node-click="handleMarketClick"
        class="market-tree"
        highlight-current
        style="margin-top: 10px;"
      ></el-tree>
    </div>

    <!-- 3. 实用工具模块（替换原功能导航） -->
    <div class="sidebar-module">
      <div class="module-header">
        <h3 class="module-title">实用工具</h3>
      </div>
      <!-- 工具分类标签 -->
      <el-tabs v-model="activeToolTab" size="mini" class="tool-tabs">
        <el-tab-pane label="数据分析" name="analysis"></el-tab-pane>
        <el-tab-pane label="交易辅助" name="trade"></el-tab-pane>
        <el-tab-pane label="风险控制" name="risk"></el-tab-pane>
      </el-tabs>
      <!-- 分类工具列表：一行一个 -->
      <div class="tool-list tool-list-single-row">
        <el-card class="tool-card tool-card-single-row" shadow="hover" v-for="tool in filteredToolList" :key="tool.id">
          <div class="tool-item" @click="openTool(tool)">
            <el-icon v-if="tool.id === 1" class="el-icon-s-tools" style="font-size: 18px; color: #333;"></el-icon>
            <!-- 风险测评工具：换100%兼容的锁形图标（替代盾牌） -->
            <el-icon v-else-if="tool.id === 5" class="el-icon-lock" style="font-size: 18px; color: #333;"></el-icon>
            <el-icon v-else :class="tool.iconClass" style="font-size: 18px;"></el-icon>
            <div class="tool-meta">
              <span class="tool-name">{{ tool.name }}</span>
              <span class="tool-count" v-if="tool.useCount">使用{{ tool.useCount }}次</span>
            </div>
          </div>
        </el-card>
      </div>
    </div> 

    <!-- 4. 行情统计模块（辅助信息：涨跌停/平盘数据） -->
    <div class="sidebar-module">
      <div class="module-header">
        <h3 class="module-title">行情统计</h3>
      </div>
      <div class="statistic-list">
        <div class="statistic-item">
          <div class="stat-inner">
            <div class="stat-value text-up">{{ upCount }}</div>
            <div class="stat-label">上涨家数</div>
          </div>
        </div>
        <div class="statistic-item">
          <div class="stat-inner">
            <div class="stat-value text-down">{{ downCount }}</div>
            <div class="stat-label">下跌家数</div>
          </div>
        </div>
        <div class="statistic-item">
          <div class="stat-inner">
            <div class="stat-value text-neutral">{{ flatCount }}</div>
            <div class="stat-label">平盘家数</div>
          </div>
        </div>
        <div class="statistic-item">
          <div class="stat-inner">
            <div class="stat-value text-up">{{ limitUpCount }}</div>
            <div class="stat-label">涨停家数</div>
          </div>
        </div>
        <div class="statistic-item">
          <div class="stat-inner">
            <div class="stat-value text-down">{{ limitDownCount }}</div>
            <div class="stat-label">跌停家数</div>
          </div>
        </div>
        <div class="statistic-item">
          <div class="stat-inner">
            <div class="stat-value text-neutral">{{ limitRatio }}%</div>
            <div class="stat-label">涨跌停比例</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 实用工具弹窗 ========== -->

    <!-- 1. 市盈率计算器 -->
    <el-dialog title="市盈率计算器" :visible.sync="showPETool" width="420px" append-to-body>
      <el-form label-width="90px" size="small">
        <el-form-item label="股票代码">
          <el-input v-model="peForm.code" placeholder="输入6位代码" maxlength="6">
            <el-button slot="append" @click="fetchPEStock" :loading="peForm.loading">查询</el-button>
          </el-input>
        </el-form-item>
        <el-form-item label="股票名称"><span>{{ peForm.name || '-' }}</span></el-form-item>
        <el-form-item label="当前股价"><span>{{ peForm.price || '-' }}</span></el-form-item>
        <el-form-item label="每股收益">
          <el-input v-model="peForm.eps" placeholder="输入每股收益(EPS)" type="number"></el-input>
        </el-form-item>
        <el-form-item label="计算结果">
          <span class="tool-result" v-if="peResult !== null">
            市盈率(PE) = <b>{{ peResult }}</b> 倍
            <el-tag :type="peResult < 20 ? 'success' : peResult < 50 ? 'warning' : 'danger'" size="mini" style="margin-left:8px">
              {{ peResult < 20 ? '低估' : peResult < 50 ? '合理' : '高估' }}
            </el-tag>
          </span>
          <span v-else class="tool-hint">输入每股收益后自动计算</span>
        </el-form-item>
      </el-form>
    </el-dialog>

    <!-- 2. 交易税费计算 -->
    <el-dialog title="交易税费计算" :visible.sync="showTaxTool" width="450px" append-to-body>
      <el-form label-width="90px" size="small">
        <el-form-item label="股票代码">
          <el-input v-model="taxForm.code" placeholder="输入6位代码自动填充价格" maxlength="6">
            <el-button slot="append" @click="fetchTaxStock" :loading="taxForm.loading">查询</el-button>
          </el-input>
        </el-form-item>
        <el-form-item label="股票名称" v-if="taxForm.name">
          <span>{{ taxForm.name }}</span>
        </el-form-item>
        <el-form-item label="交易方向">
          <el-radio-group v-model="taxForm.direction">
            <el-radio label="buy">买入</el-radio>
            <el-radio label="sell">卖出</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="成交价格">
          <el-input v-model="taxForm.price" placeholder="每股价格" type="number"></el-input>
        </el-form-item>
        <el-form-item label="成交数量">
          <el-input v-model="taxForm.count" placeholder="股数(100的整数倍)" type="number"></el-input>
        </el-form-item>
        <el-form-item label="佣金费率">
          <el-select v-model="taxForm.commissionRate">
            <el-option label="万1" :value="0.0001"></el-option>
            <el-option label="万1.5" :value="0.00015"></el-option>
            <el-option label="万2" :value="0.0002"></el-option>
            <el-option label="万2.5" :value="0.00025"></el-option>
            <el-option label="万3" :value="0.0003"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="费用明细" v-if="taxComputed">
          <div class="tax-detail">
            <p>成交金额：<b>{{ taxComputed.amount }}</b> 元</p>
            <p>佣金：<b>{{ taxComputed.commission }}</b> 元
              <span class="tool-hint" v-if="taxComputed.rawCommission !== taxComputed.commission">
                (原始 {{ taxComputed.rawCommission }} 元，不足5元按5元)
              </span>
              <span class="tool-hint" v-else>(费率 {{ taxComputed.rateLabel }})</span>
            </p>
            <p v-if="taxForm.direction === 'sell'">印花税：<b>{{ taxComputed.stampTax }}</b> 元 <span class="tool-hint">(卖出千分之一)</span></p>
            <p>过户费：<b>{{ taxComputed.transferFee }}</b> 元 <span class="tool-hint">(万分之0.5)</span></p>
            <p class="tax-total">合计费用：<b class="text-up">{{ taxComputed.total }}</b> 元</p>
          </div>
        </el-form-item>
      </el-form>
    </el-dialog>

    <!-- 3. 均线分析工具 -->
    <el-dialog title="均线分析工具" :visible.sync="showMATool" width="560px" append-to-body>
      <el-form :inline="true" size="small" style="margin-bottom:10px">
        <el-form-item label="股票代码">
          <el-input v-model="maForm.code" placeholder="6位代码" maxlength="6" style="width:120px"></el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchMAData" :loading="maForm.loading">分析</el-button>
        </el-form-item>
      </el-form>
      <div v-if="maForm.name" style="margin-bottom:10px;font-weight:bold;">{{ maForm.name }}（{{ maForm.code }}）</div>
      <div v-if="maResult">
        <el-table :data="maResult.lines" size="mini" border style="width:100%">
          <el-table-column prop="label" label="均线" width="80"></el-table-column>
          <el-table-column prop="value" label="数值"></el-table-column>
          <el-table-column prop="trend" label="趋势" width="80">
            <template slot-scope="scope">
              <span :class="scope.row.trend === '多头' ? 'text-up' : 'text-down'">{{ scope.row.trend }}</span>
            </template>
          </el-table-column>
        </el-table>
        <div style="margin-top:10px">
          <el-tag :type="maResult.signal === '多头排列' ? 'danger' : maResult.signal === '空头排列' ? 'success' : 'info'" size="small">
            {{ maResult.signal }}
          </el-tag>
          <span style="margin-left:8px;font-size:13px;color:#666">当前价：{{ maResult.currentPrice }}</span>
        </div>
      </div>
      <div v-else-if="!maForm.loading" class="tool-hint" style="text-align:center;padding:30px 0;">输入股票代码后点击"分析"</div>
    </el-dialog>

    <!-- 4. 财报对比分析 -->
    <el-dialog title="财报对比分析" :visible.sync="showReportTool" width="580px" append-to-body>
      <el-form :inline="true" size="small" style="margin-bottom:10px">
        <el-form-item label="股票A">
          <el-input v-model="reportForm.codeA" placeholder="代码" maxlength="6" style="width:110px"></el-input>
        </el-form-item>
        <el-form-item label="股票B">
          <el-input v-model="reportForm.codeB" placeholder="代码" maxlength="6" style="width:110px"></el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchReportData" :loading="reportForm.loading">对比</el-button>
        </el-form-item>
      </el-form>
      <el-table v-if="reportResult" :data="reportResult" size="mini" border style="width:100%">
        <el-table-column prop="metric" label="指标" width="120"></el-table-column>
        <el-table-column prop="valueA" :label="reportForm.nameA || '股票A'"></el-table-column>
        <el-table-column prop="valueB" :label="reportForm.nameB || '股票B'"></el-table-column>
        <el-table-column label="对比" width="80">
          <template slot-scope="scope">
            <span :class="scope.row.better === 'A' ? 'text-up' : scope.row.better === 'B' ? 'text-down' : ''">
              {{ scope.row.better === 'A' ? '✓ A' : scope.row.better === 'B' ? '✓ B' : '-' }}
            </span>
          </template>
        </el-table-column>
      </el-table>
      <div v-else-if="!reportForm.loading" class="tool-hint" style="text-align:center;padding:30px 0;">输入两只股票代码进行财务数据对比</div>
    </el-dialog>

    <!-- 5. 风险测评工具 -->
    <el-dialog title="风险测评工具" :visible.sync="showRiskTool" width="480px" append-to-body>
      <div v-if="!riskResult">
        <p style="margin-bottom:15px;color:#666;font-size:13px">通过以下问题评估您的投资风险承受能力</p>
        <el-form label-position="top" size="small">
          <el-form-item label="1. 您的投资经验年限？">
            <el-radio-group v-model="riskForm.q1">
              <el-radio :label="1">不到1年</el-radio>
              <el-radio :label="2">1-3年</el-radio>
              <el-radio :label="3">3-5年</el-radio>
              <el-radio :label="4">5年以上</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="2. 您能承受的最大亏损比例？">
            <el-radio-group v-model="riskForm.q2">
              <el-radio :label="1">10%以内</el-radio>
              <el-radio :label="2">10%-30%</el-radio>
              <el-radio :label="3">30%-50%</el-radio>
              <el-radio :label="4">50%以上</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="3. 您的投资目标？">
            <el-radio-group v-model="riskForm.q3">
              <el-radio :label="1">保值为主</el-radio>
              <el-radio :label="2">稳健增值</el-radio>
              <el-radio :label="3">积极增值</el-radio>
              <el-radio :label="4">高收益</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="4. 闲置资金占总资产比例？">
            <el-radio-group v-model="riskForm.q4">
              <el-radio :label="1">20%以内</el-radio>
              <el-radio :label="2">20%-50%</el-radio>
              <el-radio :label="3">50%-80%</el-radio>
              <el-radio :label="4">80%以上</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="calcRisk">提交测评</el-button>
          </el-form-item>
        </el-form>
      </div>
      <div v-else class="risk-result">
        <div class="risk-score">{{ riskResult.score }} <span>分</span></div>
        <el-tag :type="riskResult.tagType" size="medium" style="font-size:16px;padding:6px 20px">{{ riskResult.level }}</el-tag>
        <p style="margin-top:15px;color:#666;line-height:1.6">{{ riskResult.desc }}</p>
        <el-button type="text" @click="riskResult = null" style="margin-top:10px">重新测评</el-button>
      </div>
    </el-dialog>

    <!-- 6. 投资组合管理 -->
    <el-dialog title="投资组合管理" :visible.sync="showPortfolioTool" width="560px" append-to-body>
      <el-form :inline="true" size="small" style="margin-bottom:10px">
        <el-form-item label="股票代码">
          <el-input v-model="portfolioForm.code" placeholder="6位代码" maxlength="6" style="width:110px"></el-input>
        </el-form-item>
        <el-form-item label="持仓数量">
          <el-input v-model="portfolioForm.count" placeholder="股数" type="number" style="width:100px"></el-input>
        </el-form-item>
        <el-form-item label="成本价">
          <el-input v-model="portfolioForm.costPrice" placeholder="元" type="number" style="width:100px"></el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="addPortfolioItem">添加</el-button>
        </el-form-item>
      </el-form>
      <el-table :data="portfolioList" size="mini" border style="width:100%" v-if="portfolioList.length">
        <el-table-column prop="code" label="代码" width="75"></el-table-column>
        <el-table-column prop="name" label="名称" width="80"></el-table-column>
        <el-table-column prop="count" label="持仓" width="60"></el-table-column>
        <el-table-column prop="costPrice" label="成本价" width="70"></el-table-column>
        <el-table-column prop="currentPrice" label="现价" width="70"></el-table-column>
        <el-table-column label="盈亏" width="90">
          <template slot-scope="scope">
            <span :class="scope.row.profit >= 0 ? 'text-up' : 'text-down'">
              {{ scope.row.profit >= 0 ? '+' : '' }}{{ scope.row.profit }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="盈亏比" width="75">
          <template slot-scope="scope">
            <span :class="scope.row.profitRate >= 0 ? 'text-up' : 'text-down'">
              {{ scope.row.profitRate }}%
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="55">
          <template slot-scope="scope">
            <el-button type="text" size="mini" @click="removePortfolioItem(scope.$index)" class="text-down">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="portfolioList.length" style="margin-top:10px;font-size:13px;color:#666">
        总市值：<b>{{ portfolioTotal.totalValue }}</b> 元 | 总盈亏：
        <b :class="portfolioTotal.totalProfit >= 0 ? 'text-up' : 'text-down'">
          {{ portfolioTotal.totalProfit >= 0 ? '+' : '' }}{{ portfolioTotal.totalProfit }}
        </b> 元
      </div>
      <div v-if="!portfolioList.length" class="tool-hint" style="text-align:center;padding:30px 0">添加股票到组合后可查看持仓盈亏</div>
    </el-dialog>

    <!-- 7. 止损止盈计算器 -->
    <el-dialog title="止损止盈计算器" :visible.sync="showStopTool" width="420px" append-to-body>
      <el-form label-width="90px" size="small">
        <el-form-item label="股票代码">
          <el-input v-model="stopForm.code" placeholder="输入6位代码" maxlength="6">
            <el-button slot="append" @click="fetchStopStock" :loading="stopForm.loading">查询</el-button>
          </el-input>
        </el-form-item>
        <el-form-item label="股票名称"><span>{{ stopForm.name || '-' }}</span></el-form-item>
        <el-form-item label="买入价格">
          <el-input v-model="stopForm.buyPrice" placeholder="买入/成本价格" type="number"></el-input>
        </el-form-item>
        <el-form-item label="止损比例(%)">
          <el-slider v-model="stopForm.stopLossRate" :min="1" :max="30" :step="1" show-input input-size="mini"></el-slider>
        </el-form-item>
        <el-form-item label="止盈比例(%)">
          <el-slider v-model="stopForm.takeProfitRate" :min="1" :max="100" :step="1" show-input input-size="mini"></el-slider>
        </el-form-item>
        <el-form-item label="计算结果" v-if="stopForm.buyPrice > 0">
          <div class="tax-detail">
            <p>止损价：<b class="text-down">{{ stopLossPrice }}</b> 元（下跌 {{ stopForm.stopLossRate }}%）</p>
            <p>止盈价：<b class="text-up">{{ takeProfitPrice }}</b> 元（上涨 {{ stopForm.takeProfitRate }}%）</p>
            <p v-if="stopForm.currentPrice">当前价：<b>{{ stopForm.currentPrice }}</b> 元
              <el-tag :type="stopPriceStatus.type" size="mini" style="margin-left:6px">{{ stopPriceStatus.text }}</el-tag>
            </p>
          </div>
        </el-form-item>
      </el-form>
    </el-dialog>

    <!-- 8. 委托单模拟 -->
    <el-dialog title="委托单模拟" :visible.sync="showOrderTool" width="450px" append-to-body>
      <el-form label-width="90px" size="small">
        <el-form-item label="股票代码">
          <el-input v-model="orderForm.code" placeholder="6位代码" maxlength="6">
            <el-button slot="append" @click="fetchOrderStock" :loading="orderForm.loading">查询</el-button>
          </el-input>
        </el-form-item>
        <el-form-item label="股票名称"><span>{{ orderForm.name || '-' }} <span v-if="orderForm.currentPrice" class="tool-hint">现价：{{ orderForm.currentPrice }}</span></span></el-form-item>
        <el-form-item label="交易方向">
          <el-radio-group v-model="orderForm.direction">
            <el-radio label="buy">买入</el-radio>
            <el-radio label="sell">卖出</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="委托价格">
          <el-input v-model="orderForm.price" placeholder="委托价格" type="number"></el-input>
        </el-form-item>
        <el-form-item label="委托数量">
          <el-input v-model="orderForm.count" placeholder="股数(100整数倍)" type="number"></el-input>
        </el-form-item>
        <el-form-item label="预计金额" v-if="orderForm.price && orderForm.count">
          <span style="font-weight:bold">{{ (orderForm.price * orderForm.count).toFixed(2) }} 元</span>
        </el-form-item>
        <el-form-item>
          <el-button :type="orderForm.direction === 'buy' ? 'danger' : 'success'" @click="submitSimOrder">
            模拟{{ orderForm.direction === 'buy' ? '买入' : '卖出' }}
          </el-button>
        </el-form-item>
      </el-form>
      <div v-if="simOrders.length" style="margin-top:10px">
        <div style="font-size:13px;font-weight:bold;margin-bottom:6px">委托记录</div>
        <el-table :data="simOrders" size="mini" border>
          <el-table-column prop="time" label="时间" width="75"></el-table-column>
          <el-table-column prop="code" label="代码" width="70"></el-table-column>
          <el-table-column prop="directionText" label="方向" width="50">
            <template slot-scope="scope">
              <span :class="scope.row.direction === 'buy' ? 'text-up' : 'text-down'">{{ scope.row.directionText }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="price" label="价格" width="70"></el-table-column>
          <el-table-column prop="count" label="数量" width="60"></el-table-column>
          <el-table-column prop="amount" label="金额"></el-table-column>
        </el-table>
      </div>
    </el-dialog>

  </el-aside>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import { getChangeClass, formatPrice } from '../../utils/format';
import request, { stripStockPrefix } from '../../utils/request';

export default {
  name: 'Sidebar',
  data() {
    return {
      // 市场分类树形数据（沪深A股/板块/概念）
      marketTreeData: [
        {
          label: '沪深A股',
          type: 'index',
          children: [
            { label: '上证指数', code: '000001', type: 'index', market: 'ShA' },
            { label: '深证成指', code: '399001', type: 'index', market: 'SzA' },
            { label: '创业板指', code: '399006', type: 'index', market: 'CyA' },
            { label: '科创50', code: '000688', type: 'index', market: 'KcASpot' }
          ]
        },
        {
          label: '板块分类',
          type: 'sector',
          children: [
            { label: '金融板块', type: 'sector', sector: 'finance' },
            { label: '科技板块', type: 'sector', sector: 'technology' },
            { label: '消费板块', type: 'sector', sector: 'consumption' },
            { label: '新能源板块', type: 'sector', sector: 'new_energy' }
          ]
        },
        {
          label: '概念分类',
          type: 'concept',
          children: [
            { label: '人工智能', type: 'concept', concept: 'ai' },
            { label: '数字经济', type: 'concept', concept: 'digital_economy' },
            { label: '碳中和', type: 'concept', concept: 'carbon_neutral' },
            { label: '生物医药', type: 'concept', concept: 'biomed' }
          ]
        }
      ],
      // 树形控件配置
      treeProps: {
        children: 'children',
        label: 'label'
      },
      // 行情统计默认数据
      upCount: 1256,
      downCount: 2148,
      flatCount: 325,
      limitUpCount: 86,
      limitDownCount: 23,
      // 自选股批量操作相关：初始化确保是数组
      selectAll: false,
      selectedStockCodes: [],
      // 实用工具相关
      toolList: [
        { id: 1, name: '市盈率计算器', iconClass: 'el-icon-calculator', category: 'analysis', useCount: 128 },
        { id: 2, name: '交易税费计算', iconClass: 'el-icon-money', category: 'trade', useCount: 96 },
        { id: 3, name: '均线分析工具', iconClass: 'el-icon-pie-chart', category: 'analysis', useCount: 85 },
        { id: 4, name: '财报对比分析', iconClass: 'el-icon-s-data', category: 'analysis', useCount: 63 },
        { id: 5, name: '风险测评工具', iconClass: 'el-icon-lock', category: 'risk', useCount: 47 },
        { id: 6, name: '投资组合管理', iconClass: 'el-icon-menu', category: 'trade', useCount: 32 },
        { id: 7, name: '止损止盈计算器', iconClass: 'el-icon-bell', category: 'risk', useCount: 29 },
        { id: 8, name: '委托单模拟', iconClass: 'el-icon-sell', category: 'trade', useCount: 21 }
      ],
      activeToolTab: 'analysis', // 默认选中数据分析分类
      syncTimer: null, // 存储定时器ID，用于销毁时清除
      // =========== 工具弹窗可见状态 ===========
      showPETool: false,
      showTaxTool: false,
      showMATool: false,
      showReportTool: false,
      showRiskTool: false,
      showPortfolioTool: false,
      showStopTool: false,
      showOrderTool: false,
      // =========== 工具表单数据 ===========
      // 1. 市盈率计算器
      peForm: { code: '', name: '', price: '', eps: '', loading: false },
      // 2. 交易税费
      taxForm: { code: '', name: '', direction: 'buy', price: '', count: '', commissionRate: 0.00025, loading: false },
      // 3. 均线分析
      maForm: { code: '', name: '', loading: false },
      maResult: null,
      // 4. 财报对比
      reportForm: { codeA: '', codeB: '', nameA: '', nameB: '', loading: false },
      reportResult: null,
      // 5. 风险测评
      riskForm: { q1: 2, q2: 2, q3: 2, q4: 2 },
      riskResult: null,
      // 6. 投资组合
      portfolioForm: { code: '', count: '', costPrice: '' },
      portfolioList: [],
      // 7. 止损止盈
      stopForm: { code: '', name: '', buyPrice: '', currentPrice: '', stopLossRate: 10, takeProfitRate: 20, loading: false },
      // 8. 委托单模拟
      orderForm: { code: '', name: '', currentPrice: '', direction: 'buy', price: '', count: '', loading: false },
      simOrders: []
    };
  },
  // 这里是mounted生命周期，组件加载完成后执行
  mounted() {
    // 1. 组件刚加载时，先同步一次自选股的实时数据
    this.syncOptionalStockData();
    // 2. 加载行情统计数据（复用 getSpot 缓存）
    this.fetchStatistics();
    // 3. 定时器：自选股每60秒同步一次（降低请求频率）
    this.syncTimer = setInterval(() => {
      this.syncOptionalStockData();
    }, 60000);
    // 4. 统计数据每2分钟刷新
    this.statTimer = setInterval(() => {
      this.fetchStatistics();
    }, 120000);
  },
  // 组件销毁前，清除定时器（避免内存泄漏）
  beforeDestroy() {
    clearInterval(this.syncTimer);
    clearInterval(this.statTimer);
  },
  computed: {
    // 从Vuex获取数据时加空值兜底，核心修复点！
    ...mapState({
      optionalStocks: state => state.optionalStocks || [],
      currentStockCode: state => state.currentStockCode || ''
    }),
    ...mapGetters(['optionalStockCount']),
    // 计算涨跌停比例：加空值判断避免 NaN
    limitRatio() {
      const total = this.upCount + this.downCount + this.flatCount;
      return total > 0 ? ((this.limitUpCount + this.limitDownCount) / total * 100).toFixed(1) : '0.0';
    },
    // 筛选后的工具列表
    filteredToolList() {
      return this.toolList.filter(tool => tool.category === this.activeToolTab);
    },
    // 市盈率计算结果
    peResult() {
      const price = parseFloat(this.peForm.price);
      const eps = parseFloat(this.peForm.eps);
      if (!price || !eps || eps === 0) return null;
      return (price / eps).toFixed(2);
    },
    // 交易税费自动计算（响应式）
    taxComputed() {
      const price = parseFloat(this.taxForm.price);
      const count = parseInt(this.taxForm.count);
      if (!price || !count || count <= 0) return null;
      const amount = price * count;
      const rawCommission = amount * this.taxForm.commissionRate;
      const commission = rawCommission < 5 ? 5 : rawCommission;
      const stampTax = this.taxForm.direction === 'sell' ? amount * 0.001 : 0;
      const transferFee = amount * 0.00005;
      const total = commission + stampTax + transferFee;
      // 费率标签
      const rateMap = { 0.0001: '万1', 0.00015: '万1.5', 0.0002: '万2', 0.00025: '万2.5', 0.0003: '万3' };
      return {
        amount: amount.toFixed(2),
        rawCommission: rawCommission.toFixed(2),
        commission: commission.toFixed(2),
        rateLabel: rateMap[this.taxForm.commissionRate] || '',
        stampTax: stampTax.toFixed(2),
        transferFee: transferFee.toFixed(2),
        total: total.toFixed(2)
      };
    },
    // 止损价
    stopLossPrice() {
      const buy = parseFloat(this.stopForm.buyPrice);
      if (!buy) return '-';
      return (buy * (1 - this.stopForm.stopLossRate / 100)).toFixed(2);
    },
    // 止盈价
    takeProfitPrice() {
      const buy = parseFloat(this.stopForm.buyPrice);
      if (!buy) return '-';
      return (buy * (1 + this.stopForm.takeProfitRate / 100)).toFixed(2);
    },
    // 止损止盈状态
    stopPriceStatus() {
      const cur = parseFloat(this.stopForm.currentPrice);
      const buy = parseFloat(this.stopForm.buyPrice);
      if (!cur || !buy) return { type: 'info', text: '-' };
      const sl = buy * (1 - this.stopForm.stopLossRate / 100);
      const tp = buy * (1 + this.stopForm.takeProfitRate / 100);
      if (cur <= sl) return { type: 'danger', text: '已触及止损' };
      if (cur >= tp) return { type: 'success', text: '已触及止盈' };
      return { type: 'info', text: '正常持仓' };
    },
    // 投资组合汇总
    portfolioTotal() {
      let totalValue = 0, totalCost = 0;
      this.portfolioList.forEach(item => {
        totalValue += parseFloat(item.currentPrice) * item.count;
        totalCost += parseFloat(item.costPrice) * item.count;
      });
      return {
        totalValue: totalValue.toFixed(2),
        totalProfit: (totalValue - totalCost).toFixed(2)
      };
    }
  },
  watch: {
    // 监听自选股变化，同步全选状态：加可选链操作符
    optionalStocks: {
      handler() {
        this.selectAll = this.optionalStocks?.length > 0 && this.selectedStockCodes?.length === this.optionalStocks?.length;
      },
      deep: true
    },
    // 监听工具分类标签变化
    activeToolTab() {
      this.filteredToolList = this.toolList.filter(tool => tool.category === this.activeToolTab);
    }
  },
  methods: {
    // 从Vuex映射操作方法
    ...mapActions(['addOptionalStock', 'deleteOptionalStock', 'changeStock','batchDeleteOptionalStock']),
    getChangeClass,
    stripStockPrefix,

    // 跳转到个股详情页：加空值判断
    goStockDetail(stock) {
      if (!stock) return;
      // 判断当前路由是否已在目标页面，避免重复跳转
      const targetPath = `/detail/${stock.code}`;
      if (this.$route.path === targetPath) {
        return; // 已经在当前页面，不执行跳转
      }
      this.changeStock(stock);
      this.$router.push(targetPath);
    },

    // 批量添加自选股（支持多代码逗号分隔）
    openAddOptionalPrompt() {
    this.$prompt('请输入6位股票代码（多只股票用逗号分隔）', '添加自选股', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /^(\d{6},)*\d{6}$/,
      inputErrorMessage: '请输入有效的6位股票代码（多只股票用逗号分隔）'
    }).then(async ({ value }) => {
      const codes = value.split(',').filter(code => code.trim());
      for (const code of codes) {
        const d = await this._queryStock(code);
        if (d) {
          this.addOptionalStock({
            code,
            name: d.name || '未知',
            price: Number(d.last).toFixed(2),
            change: (Number(d.last) - Number(d.close || d.last)).toFixed(2)
          });
          this.$message.success(`已添加 ${d.name || code} 到自选股`);
        } else {
          this.addOptionalStock({
            code,
            name: '未知股票',
            price: '0.00',
            change: '0.00'
          });
          this.$message.warning(`未查询到股票${code}信息，已手动添加到自选股`);
        }
      }
    }).catch(() => {
      this.$message.info('已取消添加');
    });
  },
    // 自选股全选/取消全选：加空值判断
    handleSelectAll(val) {
      this.selectedStockCodes = val ? (this.optionalStocks || []).map(stock => stock.code) : [];
    },

    // 自选股单个选择：加可选链
    handleSingleSelect(code) {
      this.selectAll = this.selectedStockCodes?.length === this.optionalStocks?.length;
    },

    // 批量删除自选股：加空值判断
    batchDeleteOptionalStock() {
      if (this.selectedStockCodes?.length === 0) return;
      this.$confirm(`确定删除选中的${this.selectedStockCodes.length}只股票？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        (this.selectedStockCodes || []).forEach(code => {
          this.deleteOptionalStock(code);
        });
        this.selectedStockCodes = [];
        this.selectAll = false;
        this.$message.success('批量删除成功');
      }).catch(() => {
        this.$message.info('已取消删除');
      });
    },

    // 点击行情统计项，跳转对应股票列表
    jumpToStockList(type) {
      let path = '/quote';
      switch (type) {
        case 'up': path += '?type=up'; break;
        case 'down': path += '?type=down'; break;
        case 'flat': path += '?type=flat'; break;
        case 'limitUp': path += '?type=limitUp'; break;
        case 'limitDown': path += '?type=limitDown'; break;
      }
      this.$router.push(path);
    },

    // 点击市场分类，跳转对应指数/板块详情
    handleMarketClick(data) {
      // 父节点（没有 market/sector/concept/code 字段）只做展开收起，不导航
      if (data?.children && data.children.length > 0) {
        return;
      }

      // 如果是指数叶子节点（有 market 字段），跳转到行情页
      if (data?.market) {
        this.$router.push({
          path: '/quote',
          query: {
            market: data.market,
            indexCode: data.code || '',
            name: data.label
          }
        });
        return;
      }

      // 如果是板块
      if (data?.type === 'sector' && data?.sector) {
        this.$router.push({
          path: '/quote',
          query: {
            sector: data.sector,
            name: data.label
          }
        });
        return;
      }

      // 如果是概念
      if (data?.type === 'concept' && data?.concept) {
        this.$router.push({
          path: '/quote',
          query: {
            concept: data.concept,
            name: data.label
          }
        });
        return;
      }

      // 如果节点有 code（普通股票），跳转个股详情
      if (data?.code) {
        this.changeStock({ code: data.code, name: data.label });
        this.$router.push(`/detail/${data.code}`);
        return;
      }
    },

    // 打开工具弹窗（路由到对应 Dialog）
    openTool(tool) {
      // 更新使用次数
      const index = this.toolList.findIndex(item => item.id === tool.id);
      if (index !== -1) {
        this.$set(this.toolList[index], 'useCount', tool.useCount + 1);
      }
      // 按 id 打开对应弹窗
      const dialogMap = {
        1: 'showPETool',
        2: 'showTaxTool',
        3: 'showMATool',
        4: 'showReportTool',
        5: 'showRiskTool',
        6: 'showPortfolioTool',
        7: 'showStopTool',
        8: 'showOrderTool'
      };
      const key = dialogMap[tool.id];
      if (key) this[key] = true;
    },

    // =========== 通用：查询股票（getStockLast 失败时从 spot 缓存兜底） ===========
    async _queryStock(code) {
      // 1. 先尝试 /stock_last 接口
      try {
        const res = await request.getStockLast(code, { _silent: true });
        const d = res.data || {};
        if (d.name && d.last) return d;
      } catch { /* 忽略，走兜底 */ }
      // 2. 兜底：从 getSpot 缓存中查找
      try {
        const spotRes = await request.getSpot('ShA');
        const list = spotRes.data || [];
        const pure = String(code).replace(/^(sh|sz|bj)/i, '');
        const found = list.find(s =>
          s.code === code || s.code === pure ||
          s.code === ('sh' + pure) || s.code === ('sz' + pure)
        );
        if (found) return found;
      } catch { /* ignore */ }
      return null;
    },

    // =========== 1. 市盈率计算器 ===========
    async fetchPEStock() {
      if (!this.peForm.code || this.peForm.code.length !== 6) {
        return this.$message.warning('请输入6位股票代码');
      }
      this.peForm.loading = true;
      try {
        const d = await this._queryStock(this.peForm.code);
        if (!d) { this.$message.error('未找到该股票'); return; }
        this.peForm.name = d.name || '未知';
        this.peForm.price = formatPrice(d.last);
      } catch {
        this.$message.error('查询失败，请检查代码');
      } finally {
        this.peForm.loading = false;
      }
    },

    // =========== 2. 交易税费计算 ===========
    async fetchTaxStock() {
      if (!this.taxForm.code || this.taxForm.code.length !== 6) {
        return this.$message.warning('请输入6位股票代码');
      }
      this.taxForm.loading = true;
      try {
        const d = await this._queryStock(this.taxForm.code);
        if (!d) { this.$message.error('未找到该股票'); return; }
        this.taxForm.name = d.name || '未知';
        this.taxForm.price = formatPrice(d.last);
      } catch {
        this.$message.error('查询失败，请检查代码');
      } finally {
        this.taxForm.loading = false;
      }
    },

    // =========== 3. 均线分析工具 ===========
    async fetchMAData() {
      if (!this.maForm.code || this.maForm.code.length !== 6) {
        return this.$message.warning('请输入6位股票代码');
      }
      this.maForm.loading = true;
      this.maResult = null;
      try {
        // 先获取股票名称
        const stockData = await this._queryStock(this.maForm.code);
        if (!stockData) { this.$message.error('未找到该股票'); this.maForm.loading = false; return; }
        this.maForm.name = stockData.name || '未知';
        const currentPrice = parseFloat(stockData.last) || 0;

        // 获取日K线数据（60分钟聚合）计算均线
        const res = await request.getMinuteHistory({ code: this.maForm.code, scale: 60, datalen: 500 });
        const rawList = res.data || [];

        // 按日聚合收盘价
        const dayMap = {};
        rawList.forEach(item => {
          const dateStr = item.day ? item.day.split(' ')[0] : '';
          if (!dateStr) return;
          dayMap[dateStr] = parseFloat(item.close) || 0;
        });
        const closes = Object.keys(dayMap).sort().map(k => dayMap[k]);

        // 计算各周期均线
        const calcMA = (arr, period) => {
          if (arr.length < period) return null;
          const slice = arr.slice(-period);
          return (slice.reduce((s, v) => s + v, 0) / period).toFixed(2);
        };
        const periods = [5, 10, 20, 30, 60];
        const lines = periods.map(p => {
          const value = calcMA(closes, p);
          return {
            label: `MA${p}`,
            value: value || '-',
            trend: value && currentPrice > parseFloat(value) ? '多头' : '空头'
          };
        });

        // 判断排列方式
        const maValues = lines.map(l => parseFloat(l.value)).filter(v => !isNaN(v));
        let signal = '交叉';
        if (maValues.length >= 3) {
          const isUp = maValues.every((v, i) => i === 0 || v <= maValues[i - 1]);
          const isDown = maValues.every((v, i) => i === 0 || v >= maValues[i - 1]);
          if (isUp) signal = '多头排列';
          else if (isDown) signal = '空头排列';
        }

        this.maResult = { lines, signal, currentPrice: formatPrice(currentPrice) };
      } catch {
        this.$message.error('获取数据失败');
      } finally {
        this.maForm.loading = false;
      }
    },

    // =========== 4. 财报对比分析 ===========
    async fetchReportData() {
      const { codeA, codeB } = this.reportForm;
      if (!codeA || !codeB || codeA.length !== 6 || codeB.length !== 6) {
        return this.$message.warning('请输入两个有效的6位股票代码');
      }
      this.reportForm.loading = true;
      this.reportResult = null;
      try {
        const [dA, dB] = await Promise.all([
          this._queryStock(codeA),
          this._queryStock(codeB)
        ]);
        if (!dA || !dB) { this.$message.error('未找到股票信息'); this.reportForm.loading = false; return; }
        this.reportForm.nameA = dA.name || codeA;
        this.reportForm.nameB = dB.name || codeB;

        // 使用实时行情数据构建对比（从 /spot 可获取 per/pbr/tmc/amount 等字段）
        const metrics = [
          { key: 'last', label: '最新价(元)', higherBetter: true },
          { key: 'zd', label: '涨跌幅(%)', higherBetter: true },
          { key: 'vol', label: '成交量(手)', higherBetter: true },
          { key: 'amount', label: '成交额(元)', higherBetter: true },
          { key: 'hod', label: '最高价(元)', higherBetter: true },
          { key: 'lod', label: '最低价(元)', higherBetter: false },
          { key: 'open', label: '开盘价(元)', higherBetter: null },
          { key: 'close', label: '昨收价(元)', higherBetter: null }
        ];
        this.reportResult = metrics.map(m => {
          const vA = parseFloat(dA[m.key]) || 0;
          const vB = parseFloat(dB[m.key]) || 0;
          let better = '-';
          if (m.higherBetter === true) better = vA >= vB ? 'A' : 'B';
          else if (m.higherBetter === false) better = vA <= vB ? 'A' : 'B';
          return {
            metric: m.label,
            valueA: formatPrice(vA),
            valueB: formatPrice(vB),
            better: m.higherBetter !== null ? better : ''
          };
        });
      } catch {
        this.$message.error('查询失败');
      } finally {
        this.reportForm.loading = false;
      }
    },

    // =========== 5. 风险测评 ===========
    calcRisk() {
      const { q1, q2, q3, q4 } = this.riskForm;
      const score = (q1 + q2 + q3 + q4) * 6.25; // 满分100
      let level, tagType, desc;
      if (score <= 25) {
        level = '保守型'; tagType = 'success';
        desc = '您属于保守型投资者，建议配置国债、银行理财等低风险产品，股票仓位控制在20%以内。';
      } else if (score <= 50) {
        level = '稳健型'; tagType = 'info';
        desc = '您属于稳健型投资者，建议以蓝筹股、指数基金为主，适当配置债券，股票仓位控制在50%以内。';
      } else if (score <= 75) {
        level = '积极型'; tagType = 'warning';
        desc = '您属于积极型投资者，可适当参与成长股投资，但需设置止损策略，建议仓位不超过70%。';
      } else {
        level = '激进型'; tagType = 'danger';
        desc = '您属于激进型投资者，风险承受能力较强，可参与高波动品种，但务必严格执行止损纪律。';
      }
      this.riskResult = { score: score.toFixed(0), level, tagType, desc };
    },

    // =========== 6. 投资组合管理 ===========
    async addPortfolioItem() {
      const { code, count, costPrice } = this.portfolioForm;
      if (!code || code.length !== 6 || !count || !costPrice) {
        return this.$message.warning('请完整填写股票代码、数量和成本价');
      }
      try {
        const d = await this._queryStock(code);
        if (!d) { this.$message.error('未找到该股票'); return; }
        const currentPrice = formatPrice(d.last);
        const numCount = parseInt(count);
        const numCost = parseFloat(costPrice);
        const numCurrent = parseFloat(currentPrice);
        const profit = ((numCurrent - numCost) * numCount).toFixed(2);
        const profitRate = numCost > 0 ? (((numCurrent - numCost) / numCost) * 100).toFixed(2) : '0.00';
        this.portfolioList.push({
          code,
          name: d.name || '未知',
          count: numCount,
          costPrice: numCost.toFixed(2),
          currentPrice,
          profit,
          profitRate
        });
        this.portfolioForm = { code: '', count: '', costPrice: '' };
        this.$message.success(`已添加 ${d.name || code}`);
      } catch {
        this.$message.error('查询股票失败');
      }
    },
    removePortfolioItem(index) {
      this.portfolioList.splice(index, 1);
    },

    // =========== 7. 止损止盈 ===========
    async fetchStopStock() {
      if (!this.stopForm.code || this.stopForm.code.length !== 6) {
        return this.$message.warning('请输入6位股票代码');
      }
      this.stopForm.loading = true;
      try {
        const d = await this._queryStock(this.stopForm.code);
        if (!d) { this.$message.error('未找到该股票'); this.stopForm.loading = false; return; }
        this.stopForm.name = d.name || '未知';
        this.stopForm.currentPrice = formatPrice(d.last);
        if (!this.stopForm.buyPrice) {
          this.stopForm.buyPrice = formatPrice(d.last);
        }
      } catch {
        this.$message.error('查询失败');
      } finally {
        this.stopForm.loading = false;
      }
    },

    // =========== 8. 委托单模拟 ===========
    async fetchOrderStock() {
      if (!this.orderForm.code || this.orderForm.code.length !== 6) {
        return this.$message.warning('请输入6位股票代码');
      }
      this.orderForm.loading = true;
      try {
        const d = await this._queryStock(this.orderForm.code);
        if (!d) { this.$message.error('未找到该股票'); this.orderForm.loading = false; return; }
        this.orderForm.name = d.name || '未知';
        this.orderForm.currentPrice = formatPrice(d.last);
        this.orderForm.price = formatPrice(d.last);
      } catch {
        this.$message.error('查询失败');
      } finally {
        this.orderForm.loading = false;
      }
    },
    submitSimOrder() {
      const { code, name, direction, price, count } = this.orderForm;
      if (!code || !price || !count) {
        return this.$message.warning('请完整填写委托信息');
      }
      const numCount = parseInt(count);
      if (numCount % 100 !== 0) {
        return this.$message.warning('委托数量需为100的整数倍');
      }
      const amount = (parseFloat(price) * numCount).toFixed(2);
      const now = new Date();
      this.simOrders.unshift({
        time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
        code,
        name: name || code,
        direction,
        directionText: direction === 'buy' ? '买入' : '卖出',
        price: parseFloat(price).toFixed(2),
        count: numCount,
        amount
      });
      this.$message.success(`模拟${direction === 'buy' ? '买入' : '卖出'} ${name || code} ${numCount}股 成功`);
    },
    // 3. 关键：将 syncOptionalStockData 移到 methods 里（改为并行批量查询）
    async syncOptionalStockData() {
      if (this.optionalStocks.length === 0) return;
      try {
        // 使用并行批量查询，替代之前的串行循环
        const codes = this.optionalStocks.map(s => s.code);
        const results = await request.getStockLastBatch(codes);
        results.forEach((d, index) => {
          if (!d || !d.name) return;
          const stock = this.optionalStocks[index];
          this.$set(this.optionalStocks, index, {
            ...stock,
            name: d.name || stock.name,
            price: Number(d.last).toFixed(2) || stock.price,
            change: (Number(d.last) - Number(d.close)).toFixed(2) || stock.change
          });
        });
        localStorage.setItem('optional_stocks', JSON.stringify(this.optionalStocks));
      } catch (err) {
        console.warn('自选股实时数据同步失败：', err);
      }
    },
    // 从 getSpot 缓存数据计算行情统计（复用已有缓存，不会重复发请求）
    async fetchStatistics() {
      try {
        const res = await request.getSpot('ShA');
        const list = res.data || [];
        let up = 0, down = 0, flat = 0, limitUp = 0, limitDown = 0;
        list.forEach(item => {
          const zd = Number(item.zd) || 0;
          if (zd > 0) up++;
          else if (zd < 0) down++;
          else flat++;
          if (zd >= 9.9) limitUp++;
          if (zd <= -9.9) limitDown++;
        });
        this.upCount = up;
        this.downCount = down;
        this.flatCount = flat;
        this.limitUpCount = limitUp;
        this.limitDownCount = limitDown;
      } catch (e) {
        console.warn('fetchStatistics error:', e);
      }
    }
  },
  
  
};
</script>

<style scoped>
/* 侧边栏基础样式：固定宽度240px，确保在左侧 */
.sidebar {
  --sidebar-width: 240px;
  float: left; /* 强制左侧浮动，避免被挤到右侧 */
}

/* 模块通用样式：上下分隔+内边距 */
.sidebar-module {
  padding: 15px;
  border-bottom: 1px solid var(--color-border);
}

/* 模块标题栏：左右布局 */
.module-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.module-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin: 0;
}

/* 按钮组：横向排列+间距 */
.btn-group {
  display: flex;
  gap: 10px;
}

.add-btn {
  color: var(--color-up);
  padding: 0;
}

.batch-delete-btn {
  color: #e53935;
  padding: 0;
  font-size: 12px;
}

/* 自选股列表样式：固定高度+滚动 */
.stock-list {
  max-height: 280px;
  overflow-y: auto;
}

.stock-item-header {
  padding: 0 0 8px 0;
}

/* 自选股列表项：横向布局+hover效果 */
.stock-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
  transition: background-color 0.2s;
}

.stock-item >>> .el-checkbox {
  margin-right: 8px;
}

/* 隐藏 checkbox 的 label 文字，只保留复选框 */
.stock-item >>> .el-checkbox__label {
  display: none;
}

.stock-item:hover {
  background-color: #f9f9f9;
}

/* 选中股票高亮样式 */
.stock-item.active {
  background-color: #f0f8fb;
  border-left: 3px solid var(--color-up);
  padding-left: 10px;
  margin-left: -10px;
}

/* 股票代码/名称：纵向排列 */
.stock-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.stock-code {
  font-size: 14px;
  color: #333;
  font-weight: bold;
}

.stock-name {
  font-size: 12px;
  color: #666;
}

/* 股票价格：右对齐 */
.stock-price {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin: 0 10px;
  min-width: 80px;
}

.stock-change {
  font-size: 12px;
}

/* 删除按钮：hover显示 */
.delete-btn {
  color: #999;
  padding: 0;
  display: none;
}

.stock-item:hover .delete-btn {
  display: block;
}

/* 空自选股提示：居中 */
.no-stock {
  padding: 20px 0;
  text-align: center;
}

.quick-add-btn {
  margin-top: 10px;
  color: var(--color-up);
}

/* 市场分类树形样式：自定义颜色 */
.market-tree {
  --el-tree-text-color: #333;
  --el-tree-node-hover-bg-color: #f9f9f9;
  --el-tree-node-active-bg-color: #f0f8fb;
  --el-tree-node-text-hover-color: var(--color-up);
}

/* 行情统计：卡片式 3 列布局 */
.statistic-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 4px 0;
}

.statistic-item {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 8px;
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-inner {
  text-align: center;
}

.stat-label {
  font-size: 12px;
  color: #666;
  margin-top: 6px;
}

.stat-value {
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
}

/* 保持涨跌色彩 */
.text-up { color: var(--color-up, #e53935); }
.text-down { color: var(--color-down, #43a047); }
.text-neutral { color: #999; }

/* 涨跌颜色定义（与全局样式保持一致） */
.text-up {
  color: var(--color-up, #e53935);
}

.text-down {
  color: var(--color-down, #43a047);
}

.text-neutral {
  color: #666;
}

/* 实用工具样式 */
/* 一行一个的工具列表布局 */
.tool-list-single-row {
  display: flex;
  flex-direction: column; /* 纵向排列，一行一个 */
  gap: 2px; /* 更紧凑的行间距 */
}
/* 一行一个的工具卡片样式 */
.tool-card-single-row {
  width: 100%; /* 横向铺满 */
  margin-bottom: 0;
}
.tool-card-single-row .tool-item {
  display: flex;
  align-items: center;
  padding: 6px 10px; /* 上下内边距进一步缩小 */
  gap: 10px;
}
.tool-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  flex: 1; /* 占满剩余空间 */
}
.tool-name {
  font-size: 13px;
  color: #333;
  white-space: normal; /* 允许换行，避免截断 */
}
.tool-count {
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}
/* 工具弹窗样式 */
.tool-result {
  font-size: 15px;
  color: #333;
}
.tool-hint {
  font-size: 12px;
  color: #999;
}
.tax-detail p {
  margin: 6px 0;
  font-size: 13px;
  color: #555;
}
.tax-total {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed #e0e0e0;
  font-size: 14px;
}
.risk-result {
  text-align: center;
  padding: 20px 0;
}
.risk-score {
  font-size: 48px;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
}
.risk-score span {
  font-size: 16px;
  color: #999;
  font-weight: normal;
}
</style>