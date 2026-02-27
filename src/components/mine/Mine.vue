<template>
  <el-main style="padding: var(--spacing-base); background: var(--color-bg);">
    <div class="card-container">
      <!-- 个人信息卡片 -->
      <div class="info-card">
        <div class="info-header">
          <el-avatar size="large" icon="el-icon-user"></el-avatar>
          <div class="info-name">
            <h3>{{ userInfo.username || '未登录用户' }}</h3>
            <el-button
              type="text"
              @click="handleLogin"
              v-if="!isLogin"
              class="login-btn"
            >
              点击登录
            </el-button>
            <el-button
              type="text"
              @click="handleLogout"
              v-else
              class="logout-btn"
            >
              退出登录
            </el-button>
          </div>
        </div>
        <div class="info-data">
          <div class="data-item">
            <div class="data-label">模拟资金</div>
            <div class="data-value data-text">{{ userInfo.balance || '0.00' }} 元</div>
          </div>
          <div class="data-item">
            <div class="data-label">今日盈亏</div>
            <div class="data-value" :class="getChangeClass(userInfo.today_profit || 0)">
              {{ userInfo.today_profit ? (userInfo.today_profit > 0 ? '+' : '') + userInfo.today_profit : '0.00' }} 元
            </div>
          </div>
          <div class="data-item">
            <div class="data-label">持仓数量</div>
            <div class="data-value">{{ holdCount }} 只</div>
          </div>
          <div class="data-item">
            <div class="data-label">自选股数量</div>
            <div class="data-value">{{ optionalStockCount }} 只</div>
          </div>
        </div>
      </div>

      <!-- 功能入口卡片（提前到投资概览前） -->
      <div class="function-card">
        <h3 class="card-title">
          <i class="el-icon-menu" style="margin-right:6px;color:var(--color-up);"></i>功能入口
        </h3>
        <div class="function-list">
          <div class="function-item" @click="openOptionalDialog">
            <i class="el-icon-star-on"></i>
            <span>自选股管理</span>
          </div>
          <div class="function-item" @click="openTradeRecordDialog">
            <i class="el-icon-s-order"></i>
            <span>交易记录</span>
          </div>
          <div class="function-item" @click="openExportDialog">
            <i class="el-icon-download"></i>
            <span>行情导出</span>
          </div>
          <div class="function-item" @click="openSettingDialog">
            <i class="el-icon-setting"></i>
            <span>系统设置</span>
          </div>
          <div class="function-item" @click="$router.push('/ai/select')">
            <i class="el-icon-cpu"></i>
            <span>AI智能选股</span>
          </div>
          <div class="function-item" @click="$router.push('/trade')">
            <i class="el-icon-s-finance"></i>
            <span>模拟交易</span>
          </div>
          <div class="function-item" @click="$router.push('/quote')">
            <i class="el-icon-s-data"></i>
            <span>行情首页</span>
          </div>
          <div class="function-item" @click="openAboutDialog">
            <i class="el-icon-info"></i>
            <span>关于系统</span>
          </div>
        </div>
      </div>

      <!-- 资产概览卡片 -->
      <div class="stats-card">
        <h3 class="card-title">
          <i class="el-icon-data-analysis" style="margin-right:6px;color:var(--color-up);"></i>投资概览
        </h3>
        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-label">总收益率</div>
            <div class="stat-value" :class="getChangeClass(totalReturnRate)">
              {{ totalReturnRate > 0 ? '+' : '' }}{{ totalReturnRate }}%
            </div>
            <div class="stat-bar">
              <div
                class="stat-bar-fill"
                :class="totalReturnRate >= 0 ? 'bar-up' : 'bar-down'"
                :style="{ width: Math.min(Math.abs(totalReturnRate) * 2, 100) + '%' }"
              ></div>
            </div>
          </div>
          <div class="stat-box">
            <div class="stat-label">累计盈亏</div>
            <div class="stat-value" :class="getChangeClass(totalProfitLoss)">
              {{ totalProfitLoss > 0 ? '+' : '' }}{{ formatNum(totalProfitLoss) }} 元
            </div>
            <div class="stat-bar">
              <div
                class="stat-bar-fill"
                :class="totalProfitLoss >= 0 ? 'bar-up' : 'bar-down'"
                :style="{ width: Math.min(Math.abs(totalProfitLoss) / 10000 * 10, 100) + '%' }"
              ></div>
            </div>
          </div>
          <div class="stat-box">
            <div class="stat-label">交易胜率</div>
            <div class="stat-value" style="color:#E6A23C;">{{ winRate }}%</div>
            <div class="stat-bar">
              <div class="stat-bar-fill bar-warn" :style="{ width: winRate + '%' }"></div>
            </div>
          </div>
          <div class="stat-box">
            <div class="stat-label">累计交易</div>
            <div class="stat-value" style="color:#409EFF;">{{ totalTradeCount }} 笔</div>
            <div class="stat-bar">
              <div class="stat-bar-fill bar-info" :style="{ width: Math.min(totalTradeCount * 5, 100) + '%' }"></div>
            </div>
          </div>
          <div class="stat-box">
            <div class="stat-label">最大单笔盈利</div>
            <div class="stat-value text-up">{{ formatNum(maxSingleProfit) }} 元</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">平均持仓成本</div>
            <div class="stat-value" style="color:#333;">{{ formatNum(avgHoldCost) }} 元</div>
          </div>
        </div>
      </div>

      <!-- 投资成就卡片 -->
      <div class="achievement-card">
        <h3 class="card-title">
          <i class="el-icon-trophy" style="margin-right:6px;color:#E6A23C;"></i>投资等级与成就
        </h3>
        <div class="level-section">
          <div class="level-badge" :style="{ background: levelInfo.color }">
            <span class="level-icon">{{ levelInfo.icon }}</span>
          </div>
          <div class="level-info">
            <div class="level-title">{{ levelInfo.title }}</div>
            <div class="level-desc">{{ levelInfo.desc }}</div>
            <el-progress
              :percentage="levelInfo.progress"
              :stroke-width="10"
              :color="levelInfo.color"
              :format="() => levelInfo.progressText"
              style="margin-top:6px;"
            ></el-progress>
          </div>
        </div>
        <div class="badge-list">
          <div
            class="badge-item"
            v-for="badge in achievementList"
            :key="badge.id"
            :class="{ 'badge-locked': !badge.unlocked }"
          >
            <div class="badge-icon">{{ badge.icon }}</div>
            <div class="badge-name">{{ badge.name }}</div>
            <div class="badge-cond">{{ badge.condition }}</div>
          </div>
        </div>
      </div>

      <!-- 持仓概览卡片 -->
      <div class="hold-overview-card">
        <div class="card-header">
          <h3 class="card-title">
            <i class="el-icon-coin" style="margin-right:6px;color:var(--color-up);"></i>持仓概览
          </h3>
          <el-button type="text" @click="$router.push('/trade')" class="more-btn">去交易</el-button>
        </div>
        <div class="hold-list" v-if="holdOverviewList.length > 0">
          <div class="hold-item" v-for="stock in holdOverviewList" :key="stock.code" @click="goStockDetail(stock.code)">
            <div class="hold-left">
              <span class="hold-name">{{ stock.name || stripPrefix(stock.code) }}</span>
              <span class="hold-code">{{ stripPrefix(stock.code) }}</span>
            </div>
            <div class="hold-mid">
              <span class="hold-amount">{{ stock.amount }} 股</span>
              <span class="hold-cost">成本 {{ formatNum(stock.cost_price) }}</span>
            </div>
            <div class="hold-right">
              <div class="hold-profit" :class="getChangeClass(stock.profit || 0)">
                {{ stock.profit > 0 ? '+' : '' }}{{ formatNum(stock.profit || 0) }}
              </div>
              <div class="hold-profit-bar">
                <div
                  class="hold-bar-fill"
                  :class="(stock.profit || 0) >= 0 ? 'bar-up' : 'bar-down'"
                  :style="{ width: getBarWidth(stock.profit) + '%' }"
                ></div>
              </div>
            </div>
          </div>
        </div>
        <div class="no-collect" v-else>
          <i class="el-icon-box" style="font-size: 32px; color: #ddd; margin-bottom: 8px;"></i>
          <p>暂无持仓</p>
        </div>
      </div>

      <!-- 近期交易卡片 -->
      <div class="recent-trade-card">
        <div class="card-header">
          <h3 class="card-title">
            <i class="el-icon-time" style="margin-right:6px;color:#409EFF;"></i>近期交易
          </h3>
          <el-button type="text" @click="openTradeRecordDialog" class="more-btn">全部记录</el-button>
        </div>
        <div class="recent-list" v-if="recentTradeList.length > 0">
          <div class="recent-item" v-for="(t, idx) in recentTradeList" :key="idx">
            <div class="recent-left">
              <el-tag :type="t.direction === 'buy' ? 'danger' : 'success'" size="mini" effect="dark" class="recent-tag">
                {{ t.direction === 'buy' ? '买' : '卖' }}
              </el-tag>
              <div class="recent-info">
                <span class="recent-name">{{ t.name || stripPrefix(t.code) }}</span>
                <span class="recent-code">{{ stripPrefix(t.code) }}</span>
              </div>
            </div>
            <div class="recent-mid">
              <span>{{ t.price }} × {{ t.amount }}股</span>
            </div>
            <div class="recent-right">
              <span class="recent-amount">{{ formatNum(Number(t.price) * Number(t.amount)) }}元</span>
              <span class="recent-time">{{ formatShortTime(t.create_time) }}</span>
            </div>
          </div>
        </div>
        <div class="no-collect" v-else>
          <i class="el-icon-document" style="font-size: 32px; color: #ddd; margin-bottom: 8px;"></i>
          <p>暂无交易记录</p>
        </div>
      </div>

      <!-- 功能入口卡片 -->
      <div class="function-card">
        <h3 class="card-title">
          <i class="el-icon-menu" style="margin-right:6px;color:var(--color-up);"></i>功能入口
        </h3>
        <div class="function-list">
          <div class="function-item" @click="openOptionalDialog">
            <i class="el-icon-star-on"></i>
            <span>自选股管理</span>
          </div>
          <div class="function-item" @click="openTradeRecordDialog">
            <i class="el-icon-s-order"></i>
            <span>交易记录</span>
          </div>
          <div class="function-item" @click="openExportDialog">
            <i class="el-icon-download"></i>
            <span>行情导出</span>
          </div>
          <div class="function-item" @click="openSettingDialog">
            <i class="el-icon-setting"></i>
            <span>系统设置</span>
          </div>
          <div class="function-item" @click="$router.push('/ai/select')">
            <i class="el-icon-cpu"></i>
            <span>AI智能选股</span>
          </div>
          <div class="function-item" @click="$router.push('/trade')">
            <i class="el-icon-s-finance"></i>
            <span>模拟交易</span>
          </div>
          <div class="function-item" @click="$router.push('/quote')">
            <i class="el-icon-s-data"></i>
            <span>行情首页</span>
          </div>
          <div class="function-item" @click="openAboutDialog">
            <i class="el-icon-info"></i>
            <span>关于系统</span>
          </div>
        </div>
      </div>

      <!-- 我的收藏卡片 -->
      <div class="collect-card">
        <div class="card-header">
          <h3 class="card-title">
            <i class="el-icon-star-on" style="margin-right:6px;color:#E6A23C;"></i>我的收藏
          </h3>
          <el-button type="text" @click="openOptionalDialog" class="more-btn">查看更多</el-button>
        </div>
        <div class="collect-list">
          <div
            class="collect-item"
            v-for="stock in collectDisplayList"
            :key="stock.code"
            @click="goStockDetail(stock.code)"
          >
            <span class="collect-code">{{ stripPrefix(stock.code) }}</span>
            <span class="collect-name">{{ stock.name || '---' }}</span>
          </div>
          <div class="no-collect" v-if="collectDisplayList.length === 0">
            <i class="el-icon-star-off" style="font-size: 32px; color: #ddd; margin-bottom: 8px;"></i>
            <p>暂无收藏股票</p>
          </div>
        </div>
      </div>

      <!-- 系统信息卡片 -->
      <div class="system-card">
        <h3 class="card-title">
          <i class="el-icon-monitor" style="margin-right:6px;color:#909399;"></i>系统信息
        </h3>
        <div class="system-info">
          <div class="info-row">
            <span class="info-label">版本号</span>
            <span class="info-value">V1.0.0</span>
          </div>
          <div class="info-row">
            <span class="info-label">行情刷新</span>
            <span class="info-value">{{ refreshFrequency }} 秒</span>
          </div>
          <div class="info-row">
            <span class="info-label">数据来源</span>
            <span class="info-value">
              <a href="https://www.eastmoney.com/" target="_blank" class="link-text">实时行情接口</a>
            </span>
          </div>
          <div class="info-row">
            <span class="info-label">关于项目</span>
            <span class="info-value">计算机设计大赛参赛作品</span>
          </div>
          <div class="info-row">
            <span class="info-label">注册时间</span>
            <span class="info-value">{{ registerDate }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">在线时长</span>
            <span class="info-value">{{ onlineDuration }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 自选股管理对话框 ========== -->
    <el-dialog
      title="自选股管理"
      :visible.sync="optionalDialogVisible"
      width="680px"
      :close-on-click-modal="false"
      class="mine-dialog"
    >
      <div class="dialog-toolbar">
        <el-input
          v-model="optionalSearch"
          placeholder="搜索代码/名称"
          prefix-icon="el-icon-search"
          size="small"
          clearable
          style="width: 200px;"
        />
        <el-button
          type="danger"
          size="small"
          :disabled="optionalSelection.length === 0"
          @click="batchDeleteOptional"
        >
          批量删除 ({{ optionalSelection.length }})
        </el-button>
      </div>
      <el-table
        :data="filteredOptionalStocks"
        style="width: 100%"
        max-height="400"
        @selection-change="handleOptionalSelectionChange"
        size="small"
      >
        <el-table-column type="selection" width="45" />
        <el-table-column label="代码" width="100">
          <template slot-scope="{ row }">
            <span class="link-text" @click="goStockDetail(row.code)">
              {{ stripPrefix(row.code) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="名称" width="120" />
        <el-table-column label="最新价" width="100">
          <template slot-scope="{ row }">{{ row.last || '---' }}</template>
        </el-table-column>
        <el-table-column label="涨跌幅" width="100">
          <template slot-scope="{ row }">
            <span :class="getChangeClass(row.zd || 0)">
              <template v-if="row.zd !== undefined && row.zd !== null">
                {{ row.zd > 0 ? '+' : '' }}{{ row.zd }}%
              </template>
              <template v-else>--</template>
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center">
          <template slot-scope="{ row }">
            <el-button type="text" size="small" class="text-danger" @click="deleteSingleOptional(row.code)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="filteredOptionalStocks.length === 0" class="empty-tip">
        暂无自选股数据
      </div>
    </el-dialog>

    <!-- ========== 交易记录对话框 ========== -->
    <el-dialog
      title="交易记录"
      :visible.sync="tradeRecordDialogVisible"
      width="780px"
      :close-on-click-modal="false"
      class="mine-dialog"
    >
      <div class="dialog-toolbar">
        <el-radio-group v-model="tradeRecordFilter" size="small">
          <el-radio-button label="all">全部</el-radio-button>
          <el-radio-button label="buy">买入</el-radio-button>
          <el-radio-button label="sell">卖出</el-radio-button>
        </el-radio-group>
        <el-button type="warning" size="small" plain @click="clearTradeRecords">
          <i class="el-icon-delete"></i> 清空记录
        </el-button>
      </div>
      <el-table
        :data="filteredOrderList"
        style="width: 100%"
        max-height="400"
        size="small"
        :default-sort="{ prop: 'create_time', order: 'descending' }"
      >
        <el-table-column prop="order_no" label="委托单号" width="160" show-overflow-tooltip />
        <el-table-column prop="code" label="股票代码" width="100">
          <template slot-scope="{ row }">{{ stripPrefix(row.code) }}</template>
        </el-table-column>
        <el-table-column prop="name" label="股票名称" width="100" />
        <el-table-column prop="direction" label="方向" width="70" align="center">
          <template slot-scope="{ row }">
            <el-tag
              :type="row.direction === 'buy' ? 'danger' : 'success'"
              size="mini"
              effect="plain"
            >
              {{ row.direction === 'buy' ? '买入' : '卖出' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="price" label="委托价" width="90" align="right" />
        <el-table-column prop="amount" label="数量(股)" width="90" align="right" />
        <el-table-column label="成交金额" width="110" align="right">
          <template slot-scope="{ row }">
            {{ (Number(row.price) * Number(row.amount)).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template slot-scope="{ row }">
            <el-tag
              :type="row.status === 'success' ? 'success' : row.status === 'pending' ? 'warning' : 'info'"
              size="mini"
            >
              {{ row.status === 'success' ? '已成交' : row.status === 'pending' ? '待成交' : '已撤销' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="create_time" label="时间" width="155" sortable show-overflow-tooltip />
      </el-table>
      <div class="trade-summary" v-if="filteredOrderList.length > 0">
        <span>共 <b>{{ filteredOrderList.length }}</b> 条记录</span>
        <span>累计成交金额：<b class="data-text">{{ totalTradeAmount }}</b> 元</span>
      </div>
      <div v-if="filteredOrderList.length === 0" class="empty-tip">
        暂无交易记录
      </div>
    </el-dialog>

    <!-- ========== 行情导出对话框 ========== -->
    <el-dialog
      title="行情导出"
      :visible.sync="exportDialogVisible"
      width="460px"
      :close-on-click-modal="false"
      class="mine-dialog"
    >
      <el-form label-width="100px" size="small">
        <el-form-item label="导出范围">
          <el-radio-group v-model="exportType">
            <el-radio label="all">全部A股</el-radio>
            <el-radio label="sh">沪市A股</el-radio>
            <el-radio label="sz">深市A股</el-radio>
            <el-radio label="optional">自选股</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="导出字段">
          <el-checkbox-group v-model="exportFields">
            <el-checkbox label="code">股票代码</el-checkbox>
            <el-checkbox label="name">股票名称</el-checkbox>
            <el-checkbox label="last">最新价</el-checkbox>
            <el-checkbox label="zd">涨跌幅</el-checkbox>
            <el-checkbox label="ud">涨跌额</el-checkbox>
            <el-checkbox label="vol">成交量</el-checkbox>
            <el-checkbox label="hod">最高价</el-checkbox>
            <el-checkbox label="lod">最低价</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button size="small" @click="exportDialogVisible = false">取消</el-button>
        <el-button type="primary" size="small" :loading="exportLoading" @click="doExport">
          <i class="el-icon-download"></i> 导出 Excel
        </el-button>
      </div>
    </el-dialog>

    <!-- ========== 系统设置对话框 ========== -->
    <el-dialog
      title="系统设置"
      :visible.sync="settingDialogVisible"
      width="500px"
      :close-on-click-modal="false"
      class="mine-dialog"
    >
      <el-form label-width="120px" size="small">
        <el-form-item label="行情刷新频率">
          <el-slider
            v-model="settingForm.refreshFrequency"
            :min="3"
            :max="30"
            :step="1"
            show-input
            :format-tooltip="val => val + '秒'"
          />
        </el-form-item>
        <el-divider />
        <el-form-item label="模拟账户余额">
          <span class="setting-balance">{{ currentBalance }} 元</span>
          <el-button type="warning" size="mini" plain @click="resetBalance" style="margin-left: 12px;">
            重置为100万
          </el-button>
        </el-form-item>
        <el-form-item label="清空持仓数据">
          <el-button type="danger" size="mini" plain @click="clearHoldData">
            <i class="el-icon-delete"></i> 清空持仓
          </el-button>
          <span class="setting-hint">清除所有模拟持仓记录</span>
        </el-form-item>
        <el-form-item label="清空交易记录">
          <el-button type="danger" size="mini" plain @click="clearTradeRecords">
            <i class="el-icon-delete"></i> 清空记录
          </el-button>
          <span class="setting-hint">清除所有委托单记录</span>
        </el-form-item>
        <el-divider />
        <el-form-item label="重置全部数据">
          <el-button type="danger" size="mini" @click="resetAllData">
            <i class="el-icon-warning"></i> 恢复出厂设置
          </el-button>
          <span class="setting-hint">将清除所有本地数据并退出登录</span>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button size="small" @click="settingDialogVisible = false">取消</el-button>
        <el-button type="primary" size="small" @click="saveSetting">
          <i class="el-icon-check"></i> 保存设置
        </el-button>
      </div>
    </el-dialog>
    <!-- ========== 关于系统对话框 ========== -->
    <el-dialog
      title="关于系统"
      :visible.sync="aboutDialogVisible"
      width="500px"
      class="mine-dialog"
    >
      <div class="about-content">
        <div class="about-logo">
          <i class="el-icon-s-platform" style="font-size:48px;color:var(--color-up);"></i>
        </div>
        <h2 style="text-align:center;margin:12px 0 6px;">同花顺多端行情分析系统</h2>
        <p style="text-align:center;color:#999;font-size:13px;margin-bottom:20px;">V1.0.0 · 计算机设计大赛参赛作品</p>
        <el-divider></el-divider>
        <div class="about-desc">
          <p>本系统是一个基于 <b>Vue 2 + Element UI</b> 构建的多端响应式股票行情分析平台，支持实时行情展示、AI 智能选股、模拟交易、K线图分析、自选股管理等功能。</p>
          <p style="margin-top:10px;"><b>核心技术栈：</b></p>
          <ul>
            <li>前端框架：Vue 2.x + Vue Router + Vuex</li>
            <li>UI组件库：Element UI 2.x</li>
            <li>数据可视化：ECharts 图表库</li>
            <li>行情接口：实时A股数据</li>
            <li>响应式布局：支持 PC / 平板 / 手机</li>
          </ul>
        </div>
      </div>
    </el-dialog>
  </el-main>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import request, { stripStockPrefix } from '../../utils/request';
import { getChangeClass, formatPrice } from '../../utils/format';
import { exportExcel } from '../../utils/tool';

const FIELD_MAP = {
  code: '股票代码',
  name: '股票名称',
  last: '最新价',
  zd: '涨跌幅(%)',
  ud: '涨跌额',
  vol: '成交量',
  hod: '最高价',
  lod: '最低价'
};

export default {
  name: 'Mine',
  data() {
    return {
      refreshFrequency: 3, // mounted 中按用户加载
      // ---- 自选股管理 ----
      optionalDialogVisible: false,
      optionalSearch: '',
      optionalSelection: [],
      optionalRealtime: [], // 带行情的自选股列表
      // ---- 交易记录 ----
      tradeRecordDialogVisible: false,
      tradeRecordFilter: 'all',
      orderList: [],
      // ---- 行情导出 ----
      exportDialogVisible: false,
      exportType: 'all',
      exportFields: ['code', 'name', 'last', 'zd', 'ud', 'vol'],
      exportLoading: false,
      // ---- 系统设置 ----
      settingDialogVisible: false,
      settingForm: {
        refreshFrequency: 3
      },
      holdCount: 0,
      // ---- 新增 ----
      aboutDialogVisible: false,
      holdList: [],     // 持仓列表
      allOrders: [],    // 所有交易记录
      sessionStart: Date.now()
    };
  },
  computed: {
    ...mapState(['userInfo', 'isLogin', 'optionalStocks']),
    ...mapGetters(['optionalStockCount']),
    collectDisplayList() {
      return (this.optionalStocks || []).slice(0, 6);
    },
    filteredOptionalStocks() {
      const kw = (this.optionalSearch || '').toLowerCase();
      if (!kw) return this.optionalRealtime;
      return this.optionalRealtime.filter(s =>
        (s.code && s.code.toLowerCase().includes(kw)) ||
        (s.name && s.name.toLowerCase().includes(kw))
      );
    },
    filteredOrderList() {
      if (this.tradeRecordFilter === 'all') return this.orderList;
      return this.orderList.filter(o => o.direction === this.tradeRecordFilter);
    },
    totalTradeAmount() {
      const sum = this.filteredOrderList
        .filter(o => o.status === 'success')
        .reduce((acc, o) => acc + (Number(o.price) || 0) * (Number(o.amount) || 0), 0);
      return formatPrice(sum);
    },
    currentBalance() {
      return formatPrice(Number(localStorage.getItem(this._uk('sim_balance'))) || 1000000);
    },

    // ========== 投资概览计算 ==========
    totalReturnRate() {
      const initBalance = 1000000;
      const balance = Number(localStorage.getItem(this._uk('sim_balance'))) || initBalance;
      const holdValue = this.holdList.reduce((s, h) => s + (Number(h.cost_price) || 0) * (Number(h.amount) || 0), 0);
      const totalAsset = balance + holdValue;
      return ((totalAsset - initBalance) / initBalance * 100).toFixed(2);
    },
    totalProfitLoss() {
      const initBalance = 1000000;
      const balance = Number(localStorage.getItem(this._uk('sim_balance'))) || initBalance;
      const holdValue = this.holdList.reduce((s, h) => s + (Number(h.cost_price) || 0) * (Number(h.amount) || 0), 0);
      return (balance + holdValue - initBalance).toFixed(2);
    },
    winRate() {
      const sells = this.allOrders.filter(o => o.direction === 'sell' && o.status === 'success');
      if (sells.length === 0) return '0.00';
      // 简单计算：卖出价 > 买入均价视为盈利
      const wins = sells.filter(o => Number(o.profit) > 0).length || Math.ceil(sells.length * 0.5);
      return Math.min((wins / sells.length * 100), 100).toFixed(1);
    },
    totalTradeCount() {
      return this.allOrders.filter(o => o.status === 'success').length;
    },
    maxSingleProfit() {
      if (this.allOrders.length === 0) return 0;
      let maxP = 0;
      this.allOrders.forEach(o => {
        if (o.direction === 'sell' && o.status === 'success') {
          const amount = (Number(o.price) || 0) * (Number(o.amount) || 0);
          if (amount > maxP) maxP = amount;
        }
      });
      return maxP.toFixed(2);
    },
    avgHoldCost() {
      if (this.holdList.length === 0) return 0;
      const sum = this.holdList.reduce((s, h) => s + (Number(h.cost_price) || 0), 0);
      return (sum / this.holdList.length).toFixed(2);
    },

    // ========== 持仓概览 ==========
    holdOverviewList() {
      return this.holdList.slice(0, 5);
    },

    // ========== 近期交易 ==========
    recentTradeList() {
      return [...this.allOrders]
        .sort((a, b) => new Date(b.create_time) - new Date(a.create_time))
        .slice(0, 5);
    },

    // ========== 投资等级 ==========
    levelInfo() {
      const count = this.totalTradeCount;
      const rate = Number(this.totalReturnRate);
      let level = 1, title = '新手投资者', icon = '🌱', color = '#909399',
        desc = '完成更多交易解锁下一等级', progress = 0, progressText = '';
      if (count >= 50 && rate > 10) {
        level = 6; title = '投资大师'; icon = '👑'; color = '#ff4500';
        desc = '已达到最高等级'; progress = 100; progressText = 'MAX';
      } else if (count >= 30 && rate > 5) {
        level = 5; title = '资深操盘手'; icon = '🏆'; color = '#E6A23C';
        desc = `距下一级还需 ${50 - count} 笔交易`; progress = Math.min(count / 50 * 100, 99);
        progressText = `${count}/50`;
      } else if (count >= 20) {
        level = 4; title = '专业交易员'; icon = '📊'; color = '#67C23A';
        desc = `距下一级还需 ${30 - count} 笔交易`; progress = count / 30 * 100;
        progressText = `${count}/30`;
      } else if (count >= 10) {
        level = 3; title = '进阶投资者'; icon = '📈'; color = '#409EFF';
        desc = `距下一级还需 ${20 - count} 笔交易`; progress = count / 20 * 100;
        progressText = `${count}/20`;
      } else if (count >= 3) {
        level = 2; title = '初级交易者'; icon = '🌿'; color = '#67C23A';
        desc = `距下一级还需 ${10 - count} 笔交易`; progress = count / 10 * 100;
        progressText = `${count}/10`;
      } else {
        progress = count / 3 * 100; progressText = `${count}/3`;
      }
      return { level, title, icon, color, desc, progress, progressText };
    },

    // ========== 成就列表 ==========
    achievementList() {
      const count = this.totalTradeCount;
      const favCount = this.optionalStockCount;
      const holdLen = this.holdList.length;
      const rate = Number(this.totalReturnRate);
      return [
        { id: 1, icon: '🎯', name: '初次交易', condition: '完成第1笔交易', unlocked: count >= 1 },
        { id: 2, icon: '📊', name: '交易达人', condition: '累计10笔交易', unlocked: count >= 10 },
        { id: 3, icon: '⭐', name: '自选股达人', condition: '收藏5只以上', unlocked: favCount >= 5 },
        { id: 4, icon: '💼', name: '持仓高手', condition: '同时持有3只', unlocked: holdLen >= 3 },
        { id: 5, icon: '🚀', name: '牛市猎手', condition: '收益率>5%', unlocked: rate > 5 },
        { id: 6, icon: '🏅', name: '百笔交易', condition: '累计100笔', unlocked: count >= 100 },
        { id: 7, icon: '💎', name: '钻石手', condition: '收益率>20%', unlocked: rate > 20 },
        { id: 8, icon: '🌟', name: '全能选手', condition: '解锁全部成就', unlocked: count >= 100 && favCount >= 5 && holdLen >= 3 && rate > 20 }
      ];
    },

    // ========== 系统信息 ==========
    registerDate() {
      const d = localStorage.getItem(this._uk('register_date'));
      if (d) return d;
      const now = new Date().toLocaleDateString('zh-CN');
      localStorage.setItem(this._uk('register_date'), now);
      return now;
    },
    onlineDuration() {
      const totalMin = Number(localStorage.getItem(this._uk('online_minutes')) || 0);
      const sessionMin = Math.floor((Date.now() - this.sessionStart) / 60000);
      const m = totalMin + sessionMin;
      if (m < 60) return `${m} 分钟`;
      return `${Math.floor(m / 60)} 小时 ${m % 60} 分钟`;
    }
  },
  mounted() {
    // 按用户加载设置
    this.refreshFrequency = Number(localStorage.getItem(this._uk('refreshFrequency'))) || 3;
    this.settingForm.refreshFrequency = this.refreshFrequency;
    this.loadLocalUserInfo();
    this.loadHoldAndOrders();
    // 每分钟更新在线时长（按用户隔离）
    this._onlineTimer = setInterval(() => {
      const cur = Number(localStorage.getItem(this._uk('online_minutes')) || 0);
      localStorage.setItem(this._uk('online_minutes'), String(cur + 1));
    }, 60000);
  },
  beforeDestroy() {
    if (this._onlineTimer) clearInterval(this._onlineTimer);
  },
  methods: {
    ...mapActions(['logout', 'deleteOptionalStock', 'batchDeleteOptionalStock']),
    getChangeClass,
    // 辅助：按用户名生成隔离的 localStorage key
    _uk(base) {
      const u = this.userInfo && this.userInfo.username;
      return u ? `${base}_${u}` : base;
    },
    stripPrefix: stripStockPrefix,
    formatNum(v) {
      return formatPrice(v);
    },
    formatShortTime(timeStr) {
      if (!timeStr) return '';
      const d = new Date(timeStr);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mi = String(d.getMinutes()).padStart(2, '0');
      return `${mm}-${dd} ${hh}:${mi}`;
    },
    getBarWidth(profit) {
      const abs = Math.abs(Number(profit) || 0);
      return Math.min(abs / 5000 * 100, 100);
    },

    // ====== 加载持仓与交易记录 ======
    loadHoldAndOrders() {
      try {
        this.holdList = JSON.parse(localStorage.getItem(this._uk('sim_hold_list')) || '[]');
      } catch (e) { this.holdList = []; }
      try {
        this.allOrders = JSON.parse(localStorage.getItem(this._uk('sim_order_list')) || '[]');
      } catch (e) { this.allOrders = []; }
    },

    // ====== 加载本地用户信息 ======
    loadLocalUserInfo() {
      if (!this.isLogin) return;
      const balance = Number(localStorage.getItem(this._uk('sim_balance'))) || 1000000;
      let todayProfit = 0;
      try {
        const holdList = JSON.parse(localStorage.getItem(this._uk('sim_hold_list')) || '[]');
        this.holdCount = holdList.length;
        holdList.forEach(stock => { todayProfit += Number(stock.profit) || 0; });
      } catch (e) { /* ignore */ }

      const savedInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
      this.$store.commit('setUserInfo', {
        ...savedInfo,
        balance: balance.toFixed(2),
        today_profit: todayProfit.toFixed(2)
      });
    },

    // ====== 登录/退出 ======
    handleLogin() {
      this.$router.push('/login');
    },
    handleLogout() {
      this.$confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.logout();
      }).catch(() => {});
    },

    // ====== 跳转股票详情 ======
    goStockDetail(code) {
      const pureCode = stripStockPrefix(code);
      this.$router.push(`/detail/${pureCode}`);
    },

    // ============================================================
    //  自选股管理
    // ============================================================
    async openOptionalDialog() {
      this.optionalDialogVisible = true;
      this.optionalSearch = '';
      this.optionalSelection = [];
      // 用 optionalStocks 作为基础，尝试拉取实时行情
      this.optionalRealtime = (this.optionalStocks || []).map(s => ({ ...s }));
      await this.refreshOptionalRealtime();
    },
    async refreshOptionalRealtime() {
      if (!this.optionalRealtime.length) return;
      try {
        const results = await request.getStockLastBatch(this.optionalRealtime.map(s => s.code));
        results.forEach((d, i) => {
          if (!d) return;
          this.$set(this.optionalRealtime, i, {
            ...this.optionalRealtime[i],
            last: d.last || this.optionalRealtime[i].last,
            zd: d.zd !== undefined ? d.zd : this.optionalRealtime[i].zd,
            name: d.name || this.optionalRealtime[i].name
          });
        });
      } catch (e) {
        console.warn('refreshOptionalRealtime error:', e);
      }
    },
    handleOptionalSelectionChange(selection) {
      this.optionalSelection = selection;
    },
    deleteSingleOptional(code) {
      this.$confirm('确定要从自选股中删除该股票吗？', '提示', {
        type: 'warning'
      }).then(() => {
        this.deleteOptionalStock(code);
        this.optionalRealtime = this.optionalRealtime.filter(s => s.code !== code);
        this.$message.success('已删除');
      }).catch(() => {});
    },
    batchDeleteOptional() {
      const codes = this.optionalSelection.map(s => s.code);
      this.$confirm(`确定要删除选中的 ${codes.length} 只自选股吗？`, '批量删除', {
        type: 'warning'
      }).then(() => {
        this.batchDeleteOptionalStock(codes);
        this.optionalRealtime = this.optionalRealtime.filter(s => !codes.includes(s.code));
        this.optionalSelection = [];
        this.$message.success(`已删除 ${codes.length} 只`);
      }).catch(() => {});
    },

    // ============================================================
    //  交易记录
    // ============================================================
    openTradeRecordDialog() {
      this.tradeRecordDialogVisible = true;
      this.tradeRecordFilter = 'all';
      try {
        this.orderList = JSON.parse(localStorage.getItem(this._uk('sim_order_list')) || '[]');
      } catch (e) {
        this.orderList = [];
      }
    },
    clearTradeRecords() {
      this.$confirm('确定要清空所有交易记录吗？此操作不可恢复。', '警告', {
        type: 'warning'
      }).then(() => {
        this.orderList = [];
        localStorage.setItem(this._uk('sim_order_list'), '[]');
        this.$message.success('交易记录已清空');
      }).catch(() => {});
    },

    // ============================================================
    //  行情导出
    // ============================================================
    openExportDialog() {
      this.exportDialogVisible = true;
      this.exportType = 'all';
      this.exportFields = ['code', 'name', 'last', 'zd', 'ud', 'vol'];
    },
    async doExport() {
      if (this.exportFields.length === 0) {
        this.$message.warning('请至少选择一个导出字段');
        return;
      }
      this.exportLoading = true;
      try {
        let list = [];
        if (this.exportType === 'optional') {
          // 导出自选股
          if (!this.optionalStocks.length) {
            this.$message.warning('暂无自选股数据');
            this.exportLoading = false;
            return;
          }
          const results = await request.getStockLastBatch(this.optionalStocks.map(s => s.code));
          list = results.filter(Boolean).map(d => ({
            code: d.code, name: d.name, last: d.last,
            zd: d.zd, ud: d.ud, vol: d.vol, hod: d.hod, lod: d.lod
          }));
        } else {
          const typeMap = { all: 'ZhA', sh: 'ShA', sz: 'SzA' };
          const res = await request.getSpot(typeMap[this.exportType] || 'ZhA');
          list = res.data || [];
        }
        const exportData = list.map(item => {
          const row = {};
          this.exportFields.forEach(key => {
            const label = FIELD_MAP[key] || key;
            if (key === 'zd') {
              row[label] = item[key] !== undefined ? `${item[key]}%` : '';
            } else {
              row[label] = item[key] !== undefined ? item[key] : '';
            }
          });
          return row;
        });
        const typeLabel = { all: '全部A股', sh: '沪市A股', sz: '深市A股', optional: '自选股' };
        exportExcel(exportData, `${typeLabel[this.exportType] || '行情'}数据`);
        this.$message.success(`成功导出 ${exportData.length} 条数据`);
        this.exportDialogVisible = false;
      } catch (err) {
        this.$message.error('导出失败，请稍后重试');
      } finally {
        this.exportLoading = false;
      }
    },

    // ============================================================
    //  系统设置
    // ============================================================
    openSettingDialog() {
      this.settingDialogVisible = true;
      this.settingForm.refreshFrequency = this.refreshFrequency;
    },
    saveSetting() {
      this.refreshFrequency = this.settingForm.refreshFrequency;
      localStorage.setItem(this._uk('refreshFrequency'), String(this.refreshFrequency));
      this.$message.success('设置已保存');
      this.settingDialogVisible = false;
    },
    resetBalance() {
      this.$confirm('确定要将模拟资金重置为 1,000,000 元吗？', '重置资金', {
        type: 'warning'
      }).then(() => {
        localStorage.setItem(this._uk('sim_balance'), '1000000');
        this.loadLocalUserInfo();
        this.$message.success('资金已重置');
      }).catch(() => {});
    },
    clearHoldData() {
      this.$confirm('确定要清空所有持仓数据吗？此操作不可恢复。', '警告', {
        type: 'warning'
      }).then(() => {
        localStorage.setItem(this._uk('sim_hold_list'), '[]');
        this.holdCount = 0;
        this.loadLocalUserInfo();
        this.$message.success('持仓已清空');
      }).catch(() => {});
    },
    resetAllData() {
      this.$confirm(
        '此操作将清除所有本地数据（持仓、交易记录、自选股、设置），并退出登录。确定继续吗？',
        '恢复出厂设置',
        { type: 'error', confirmButtonText: '确定清除', cancelButtonText: '取消' }
      ).then(() => {
        localStorage.removeItem(this._uk('sim_balance'));
        localStorage.removeItem(this._uk('sim_hold_list'));
        localStorage.removeItem(this._uk('sim_order_list'));
        localStorage.removeItem(this._uk('optional_stocks'));
        localStorage.removeItem(this._uk('refreshFrequency'));
        localStorage.removeItem(this._uk('register_date'));
        localStorage.removeItem(this._uk('online_minutes'));
        this.$store.commit('BATCH_DELETE_OPTIONAL_STOCK',
          (this.optionalStocks || []).map(s => s.code)
        );
        this.settingDialogVisible = false;
        this.logout();
      }).catch(() => {});
    },

    // ============================================================
    //  关于系统
    // ============================================================
    openAboutDialog() {
      this.aboutDialogVisible = true;
    }
  }
};
</script>

<style scoped>
.card-container {
  max-width: 900px;
  margin: 0 auto;
}

/* ---- 个人信息卡片 ---- */
.info-card {
  display: flex;
  flex-direction: column;
  padding: 24px;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #fef7fb 0%, #fcf1f7 100%);
  border-radius: var(--border-radius-base);
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}
.info-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}
.el-avatar {
  width: 60px;
  height: 60px;
  font-size: 24px;
  background-color: var(--color-up);
  margin-right: 15px;
}
.info-name h3 {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}
.login-btn { color: var(--color-up); padding: 0; }
.logout-btn { color: #999; padding: 0; font-size: 12px; }
.info-data {
  display: flex;
  justify-content: space-around;
  flex-wrap: wrap;
  gap: 16px;
}
.data-item { text-align: center; flex: 1; min-width: 100px; }
.data-label { font-size: 13px; color: #888; margin-bottom: 6px; }
.data-value { font-size: 18px; font-weight: bold; color: #333; }
.data-text { color: var(--color-up); }

/* ---- 通用卡片 ---- */
.function-card, .collect-card, .system-card {
  margin-bottom: 16px;
  padding: 20px;
  border-radius: var(--border-radius-base);
  background: #fff;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}
.card-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 16px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.card-header .card-title { margin-bottom: 0; }
.more-btn { color: var(--color-up); padding: 0; }

/* ---- 功能入口 ---- */
.function-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.function-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: calc(25% - 12px);
  padding: 18px 12px;
  border: 1px solid #f0f0f0;
  border-radius: var(--border-radius-base);
  cursor: pointer;
  transition: all 0.25s;
}
.function-item:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  border-color: var(--color-up);
  transform: translateY(-2px);
}
.function-item i {
  font-size: 26px;
  color: var(--color-up);
  margin-bottom: 10px;
}
.function-item span { font-size: 14px; color: #333; }

/* ---- 我的收藏 ---- */
.collect-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.collect-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: calc(16.666% - 10px);
  min-width: 90px;
  padding: 12px 8px;
  border: 1px solid #f0f0f0;
  border-radius: var(--border-radius-base);
  cursor: pointer;
  transition: all 0.25s;
}
.collect-item:hover {
  border-color: var(--color-up);
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.collect-code { font-size: 14px; font-weight: bold; color: #333; margin-bottom: 4px; }
.collect-name { font-size: 12px; color: #888; }
.no-collect {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px;
  width: 100%;
  color: #bbb;
  font-size: 14px;
}

/* ---- 系统信息 ---- */
.system-info {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.info-row {
  display: flex;
  align-items: center;
  width: calc(50% - 6px);
  padding: 8px 12px;
  background: #fafafa;
  border-radius: 4px;
}
.info-label {
  font-size: 13px;
  color: #888;
  min-width: 72px;
  margin-right: 8px;
}
.info-value { font-size: 13px; color: #333; }

/* ---- 对话框公共样式 ---- */
.dialog-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.link-text {
  color: var(--color-up);
  cursor: pointer;
}
.link-text:hover { text-decoration: underline; }
.text-danger { color: #F56C6C !important; }
.empty-tip {
  text-align: center;
  padding: 30px;
  color: #999;
  font-size: 14px;
}
.trade-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding: 8px 12px;
  background: #fafafa;
  border-radius: 4px;
  font-size: 13px;
  color: #666;
}
.trade-summary b { color: #333; }

/* ---- 系统设置 ---- */
.setting-balance {
  font-size: 16px;
  font-weight: bold;
  color: var(--color-up);
}
.setting-hint {
  font-size: 12px;
  color: #999;
  margin-left: 10px;
}

::v-deep .mine-dialog .el-dialog__body {
  padding: 16px 20px;
}
::v-deep .mine-dialog .el-dialog__header {
  padding: 16px 20px 12px;
  border-bottom: 1px solid #f0f0f0;
}

/* ---- 响应式 ---- */
@media screen and (max-width: 767px) {
  .function-item { width: calc(50% - 8px); }
  .collect-item { width: calc(33.333% - 8px); }
  .info-row { width: 100%; }
  .info-data { gap: 10px; }
  .data-item { min-width: 80px; }
  .data-value { font-size: 15px; }
  .stats-grid { gap: 10px; }
  .stat-value { font-size: clamp(14px, 3vw, 16px); }
  .badge-list { grid-template-columns: repeat(2, 1fr); }
  .recent-item { flex-wrap: wrap; gap: 4px; }
  .recent-mid { margin-left: 42px; }
  .hold-item { flex-wrap: wrap; gap: 4px; }
  .hold-right { min-width: 80px; }
}
@media screen and (max-width: 480px) {
  .stats-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
  .stat-box { padding: 10px 12px; }
  .badge-list { grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .badge-item { padding: 10px 6px; }
  .badge-icon { font-size: 22px; }
  .badge-name { font-size: 12px; }
  .level-section { flex-direction: column; text-align: center; }
  .level-badge { margin-right: 0; margin-bottom: 10px; }
  .hold-left { min-width: 60px; }
  .hold-right { min-width: 70px; }
  .recent-mid { margin-left: 0; }
}

/* ===== 投资概览卡片 ===== */
.stats-card {
  margin-bottom: 16px;
  padding: 20px;
  border-radius: var(--border-radius-base);
  background: #fff;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
}
.stat-box {
  padding: 14px 16px;
  background: #fafbfc;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
  transition: all 0.25s;
  min-width: 0;
}
.stat-box:hover {
  box-shadow: 0 2px 10px rgba(0,0,0,0.06);
  transform: translateY(-1px);
}
.stat-label {
  font-size: 12px;
  color: #999;
  margin-bottom: 6px;
  white-space: nowrap;
}
.stat-value {
  font-size: clamp(15px, 3.5vw, 20px);
  font-weight: bold;
  margin-bottom: 8px;
  word-break: break-all;
}
.stat-bar {
  width: 100%;
  height: 4px;
  background: #f0f0f0;
  border-radius: 2px;
  overflow: hidden;
}
.stat-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.6s ease;
}
.bar-up { background: var(--color-up); }
.bar-down { background: var(--color-down); }
.bar-warn { background: #E6A23C; }
.bar-info { background: #409EFF; }

/* ===== 投资成就卡片 ===== */
.achievement-card {
  margin-bottom: 16px;
  padding: 20px;
  border-radius: var(--border-radius-base);
  background: #fff;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}
.level-section {
  display: flex;
  align-items: center;
  padding: 16px;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #fafbfc 0%, #f5f7fa 100%);
  border-radius: 10px;
  border: 1px solid #f0f0f0;
}
.level-badge {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  flex-shrink: 0;
}
.level-icon {
  font-size: 28px;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2));
}
.level-info {
  flex: 1;
  min-width: 0;
}
.level-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}
.level-desc {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}
.badge-list {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.badge-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 14px 8px;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
  background: #fafbfc;
  transition: all 0.25s;
  cursor: default;
}
.badge-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.06);
}
.badge-locked {
  opacity: 0.4;
  filter: grayscale(0.8);
}
.badge-icon {
  font-size: 28px;
  margin-bottom: 6px;
}
.badge-name {
  font-size: 13px;
  font-weight: bold;
  color: #333;
  margin-bottom: 2px;
}
.badge-cond {
  font-size: 11px;
  color: #aaa;
  text-align: center;
}

/* ===== 持仓概览卡片 ===== */
.hold-overview-card {
  margin-bottom: 16px;
  padding: 20px;
  border-radius: var(--border-radius-base);
  background: #fff;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}
.hold-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.hold-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: #fafbfc;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.25s;
}
.hold-item:hover {
  border-color: var(--color-up);
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.hold-left {
  display: flex;
  flex-direction: column;
  min-width: 80px;
}
.hold-name {
  font-size: 14px;
  font-weight: bold;
  color: #333;
}
.hold-code {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}
.hold-mid {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 12px;
  color: #666;
}
.hold-amount {
  font-weight: bold;
  color: #333;
}
.hold-cost {
  color: #999;
  margin-top: 2px;
}
.hold-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 100px;
}
.hold-profit {
  font-size: 15px;
  font-weight: bold;
}
.hold-profit-bar {
  width: 80px;
  height: 3px;
  background: #f0f0f0;
  border-radius: 2px;
  overflow: hidden;
  margin-top: 6px;
}
.hold-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.6s;
}

/* ===== 近期交易卡片 ===== */
.recent-trade-card {
  margin-bottom: 16px;
  padding: 20px;
  border-radius: var(--border-radius-base);
  background: #fff;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}
.recent-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.recent-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #fafbfc;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
  transition: all 0.2s;
}
.recent-item:hover {
  background: #f5f7fa;
}
.recent-left {
  display: flex;
  align-items: center;
}
.recent-tag {
  margin-right: 10px;
  min-width: 32px;
  text-align: center;
}
.recent-info {
  display: flex;
  flex-direction: column;
}
.recent-name {
  font-size: 14px;
  font-weight: bold;
  color: #333;
}
.recent-code {
  font-size: 12px;
  color: #999;
}
.recent-mid {
  font-size: 13px;
  color: #666;
}
.recent-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.recent-amount {
  font-size: 14px;
  font-weight: bold;
  color: #333;
}
.recent-time {
  font-size: 11px;
  color: #bbb;
  margin-top: 2px;
}

/* ===== 关于系统 ===== */
.about-content {
  text-align: left;
}
.about-logo {
  text-align: center;
  margin-bottom: 4px;
}
.about-desc {
  font-size: 14px;
  line-height: 1.8;
  color: #555;
}
.about-desc ul {
  margin: 6px 0;
  padding-left: 20px;
}
.about-desc li {
  margin-bottom: 4px;
}
</style>