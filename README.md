<p align="center">
  <img src="src/static/logo.png" alt="WaveTrainer Logo" width="120" height="120">
</p>

<h1 align="center">WaveTrainer 波浪训练师</h1>

<p align="center">
  <strong>智能健身训练微信小程序 · 集成 DUP 科学周期化训练系统</strong>
</p>

<p align="center">
  <a href="https://github.com/maliang668/wave-trainer">
    <img src="https://img.shields.io/badge/GitHub-wave--trainer-181717?style=flat-square&logo=github" alt="GitHub">
  </a>
  <a href="https://github.com/maliang668/wave-trainer/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License">
  </a>
  <img src="https://img.shields.io/badge/uni--app-Vue%203-42b883?style=flat-square" alt="Vue 3">
  <img src="https://img.shields.io/badge/TypeScript-Strict-3178c6?style=flat-square" alt="TypeScript">
  <img src="https://img.shields.io/badge/Platform-微信小程序-07C160?style=flat-square" alt="WeChat Mini Program">
</p>

---

## 📖 项目简介

**WaveTrainer（波浪训练师）** 是一款基于微信小程序的智能健身训练应用，核心集成了 **DUP（Daily Undulating Periodization，每日波浪周期化）** 科学训练系统。通过 RPE 主观疲劳感知量表驱动训练自调节，结合平台期检测、停训回归算法等多维度智能引擎，为用户提供真正个性化的力量训练方案。

不同于市面上大多数固定线性增长的应用，WaveTrainer 能够根据用户的实时疲劳状态、训练数据趋势和生活因素（睡眠/压力/营养），动态调整每日训练负荷，让训练更科学、更安全、更高效。

---

## ✨ 核心功能

### 🌊 DUP 波浪周期化引擎
每日自动调节训练强度，采用 **大重量 / 中等 / 轻量** 三级负荷循环，避免单一刺激导致的适应性停滞，实现持续进步。

### 🎯 RPE 驱动的自调节算法
基于 **RPE（Rating of Perceived Exertion）** 主观疲劳感知量表（Mike Tuchscherer 方法），实时感知用户疲劳状态并动态调整训练重量、组数与次数。

### 📈 智能平台期检测
自动分析力量趋势数据，识别训练停滞信号，并给出针对性的突破建议（调整容量、切换变式、引入减载周等）。

### 🔄 停训回归算法
根据停训时长（天数）智能计算力量衰减比例，生成渐进式回归训练方案，避免复训受伤。

### 💪 多维度疲劳评估
整合睡眠质量、压力水平、营养状态、训练动机等多维度数据，综合评估当日疲劳等级，优化训练安排。

### 📊 身体数据估算
基于体重、体脂率、性别、年龄等身体参数，科学估算各动作的初始训练重量，新手也能安全起步。

### 🏋️ 多 RM 力量测试
支持 **1RM / 3RM / 5RM / 8RM** 多种测试模式，通过轻重量安全反推 1RM，无需冒险冲击极限重量。

### 🧩 自定义训练分化
提供预设训练方案模板，同时支持用户创建完全个性化的训练分化（上下肢分化、推拉腿、全身训练等）。

### 📋 实时训练指导
训练过程中根据实时 RPE 输入，智能给出重量增减建议、组间休息提示和动作替换推荐。

### 📉 数据可视化
力量趋势曲线、训练容量统计、RPE 分布图表，全方位追踪训练进展。

### 🆕 新手 / 进阶模式
差异化训练参数配置与 RPE 限制，新手模式降低认知负担，进阶模式释放全部调节自由度。

---

## 🧮 核心算法

| 算法模块 | 说明 |
|---------|------|
| **Epley + Brzycki RM 换算公式** | 双公式交叉验证，准确估算 1RM 及多 RM 对应重量 |
| **RPE / RIR 主观疲劳感知量表** | 采用 Mike Tuchscherer 方法，将主观疲劳量化为可计算的调节参数 |
| **DUP 波浪负荷周期化** | 每日波动负荷安排，大/中/轻三强度循环，最大化训练适应性 |
| **自动减载周（Deload）协议** | 基于累积疲劳数据自动触发减载，预防过度训练 |
| **平台期检测与突破算法** | 滑动窗口分析力量趋势，识别停滞并推荐干预策略 |
| **停训回归算法** | 按停训时长分段计算力量衰减，生成安全回归梯度 |

---

## 🏗️ 技术架构

```
src/
├── core/                       # 核心引擎
│   ├── algorithms/             # 核心算法模块
│   │   ├── dup-engine.ts       #   DUP 周期化引擎
│   │   ├── rm-calculator.ts    #   RM 换算计算器
│   │   ├── rpe-manager.ts      #   RPE 管理器
│   │   ├── fatigue-assessor.ts #   多维度疲劳评估
│   │   ├── plateau-detector.ts #   平台期检测算法
│   │   ├── deload-detector.ts  #   自动减载检测
│   │   └── return-planner.ts   #   停训回归规划
│   ├── types/                  #   TypeScript 类型定义
│   │   ├── algorithm.ts        #   算法相关类型
│   │   ├── exercise.ts         #   动作相关类型
│   │   ├── training.ts         #   训练相关类型
│   │   └── user.ts             #   用户相关类型
│   └── constants/              #   配置常量
│       ├── config.ts           #   全局配置
│       └── exercises.ts        #   动作库数据
├── stores/                     # Pinia 状态管理
│   ├── user.ts                 #   用户状态
│   ├── training.ts             #   训练状态
│   └── exercise.ts             #   动作状态
├── pages/                      # 页面模块
│   ├── index/                  #   首页（训练计划 + 训练执行）
│   ├── stats/                  #   数据统计（力量趋势/容量/RPE）
│   ├── coach/                  #   AI 训练助手
│   ├── profile/                #   个人中心（身体数据/设置）
│   ├── strength-test/          #   多 RM 力量测试
│   ├── split-picker/           #   训练方案选择
│   ├── custom-split/           #   自定义训练方案
│   └── exercise-picker/        #   动作库浏览与选择
├── components/                 # 通用组件
│   ├── Chart.vue               #   数据图表组件
│   ├── ExerciseCard.vue        #   动作卡片
│   ├── SetCard.vue             #   训练组卡片
│   ├── RpeInput.vue            #   RPE 输入控件
│   ├── WeightInput.vue         #   重量输入控件
│   ├── Timer.vue               #   组间计时器
│   └── debug-panel/            #   开发者调试面板
├── services/                   # 服务层
│   └── cloud.ts                #   云服务接口
└── utils/                      # 工具函数
    ├── format.ts               #   格式化工具
    └── plate.ts                #   杠铃配片计算
```

---

## 📱 页面一览

| # | 页面 | 功能说明 |
|:-:|------|---------|
| 1 | **首页** | 今日训练计划展示 + 训练执行入口 |
| 2 | **数据页** | 力量趋势图表、训练容量统计、RPE 分布分析 |
| 3 | **助手页** | AI 训练建议与智能提醒 |
| 4 | **个人中心** | 身体数据管理、训练偏好设置 |
| 5 | **力量测试** | 1RM/3RM/5RM/8RM 多模式测试流程 |
| 6 | **方案选择** | 预设训练模板 + 自定义方案入口 |
| 7 | **自定义方案** | 创建个性化训练分化方案 |
| 8 | **动作选择** | 动作库浏览、搜索与筛选 |
| 9 | **训练中** | 实时训练记录、RPE 输入、重量调整建议 |

---

## 🚀 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) >= 16
- [npm](https://www.npmjs.com/) >= 7
- [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html) 最新稳定版

### 安装与运行

```bash
# 克隆项目
git clone https://github.com/maliang668/wave-trainer.git
cd wave-trainer

# 安装依赖
npm install

# 启动开发模式（微信小程序）
npm run dev:mp-weixin

# 构建生产版本
npm run build:mp-weixin
```

### 微信开发者工具导入

1. 打开微信开发者工具
2. 选择「导入项目」
3. 项目路径指向 `dist/dev/mp-weixin`（开发版）或 `dist/build/mp-weixin`（生产版）
4. 填入 AppID（测试可使用测试号）

---

## 🎨 设计系统

WaveTrainer 采用 **Apple Health + Gemini** 风格的深色主题设计语言：

| 设计要素 | 规格 |
|---------|------|
| **背景色** | True Black `#000000` |
| **主色调** | Apple Blue `#0A84FF` |
| **成功色** | Apple Green `#30D158` |
| **警告色** | Apple Orange `#FF9F0A` |
| **危险色** | Apple Red `#FF453A` |
| **设计令牌** | 50+ CSS Design Tokens |
| **视觉特效** | 毛玻璃效果（Frosted Glass）、胶囊按钮（Pill-shaped） |

---

## 💎 竞争优势

对比市面主流健身应用（StrongLifts、JEFIT、Fitbod、Hevy、Keep）：

| 特性 | WaveTrainer | StrongLifts | JEFIT | Fitbod | Hevy | Keep |
|------|:-----------:|:-----------:|:-----:|:------:|:----:|:----:|
| DUP 周期化 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| RPE 自调节 | ✅ | ❌ | ❌ | 部分 | ❌ | ❌ |
| 平台期检测 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 停训回归算法 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 多维度疲劳评估 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 中文本地化 | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| 微信小程序 | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |

> **核心差异化**：WaveTrainer 是目前微信小程序生态中唯一集成 DUP 科学周期化训练系统的健身应用，也是少数采用 RPE 自调节机制的产品之一。

---

## 🛠️ 技术栈

| 技术 | 用途 |
|------|------|
| [uni-app](https://uniapp.dcloud.net.cn/) | 跨平台开发框架 |
| [Vue 3](https://vuejs.org/) | 前端 UI 框架（Composition API） |
| [TypeScript](https://www.typescriptlang.org/) | 类型安全 |
| [Pinia](https://pinia.vuejs.org/) | 状态管理 |
| [Vite](https://vitejs.dev/) | 构建工具 |

---

## 📄 开源协议

本项目基于 [MIT License](https://github.com/maliang668/wave-trainer/blob/main/LICENSE) 开源。

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/maliang668">maliang668</a>
</p>
