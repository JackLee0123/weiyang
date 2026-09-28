export type ChangelogKind = 'feature' | 'improvement' | 'fix' | 'notice'

export interface ChangelogItem {
  kind: ChangelogKind
  text: string
}

export interface ChangelogEntry {
  version: string
  date: string
  title: string
  items: ChangelogItem[]
}

export const CURRENT_VERSION = 'v0.8.0'

export const CHANGELOG_KIND_META: Record<ChangelogKind, { label: string; className: string }> = {
  feature: { label: '新增', className: 'bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300' },
  improvement: { label: '优化', className: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' },
  fix: { label: '修复', className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  notice: { label: '说明', className: 'bg-slate-100 text-slate-600 dark:bg-slate-700/70 dark:text-slate-300' },
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: 'v0.8.0',
    date: '2026-09-29',
    title: '手环端改为离线快照，支持一键生成安装包',
    items: [
      {
        kind: 'fix',
        text: '修复手环端在真机上必然失败的问题：小米手环 10 的快应用官方不支持联网（system.fetch / system.network 等一律「不支持」），「在手环上直接调后端接口」的旧流程只会报「网络错误 (6)」；模拟器能跑通是因为它走的是电脑的网络',
      },
      {
        kind: 'feature',
        text: '手环端改为「离线快照」：课表与学期设置在打包时注入，手环运行期完全不联网；当日数据在线拉取、记录上传这类能力随之取消',
      },
      {
        kind: 'feature',
        text: '「设备连接」新增「生成手环安装包」：服务端用你当前账号的课表打包，点一下即可下载属于自己的 rpk，再用 AstroBox 推送到手环，电脑上不用装开发环境',
      },
      {
        kind: 'feature',
        text: '手环端新增离线数据同步脚本（watchapp 目录下 npm run sync）：首次运行会自动打开带连接码的页面，点一下「连接」就完成授权，不用再手抄 6 位连接码',
      },
      {
        kind: 'improvement',
        text: '手环上的专注计时只记在本机（最多保留最近 80 条），统计页明确标注「仅手环上记的专注」，不再让人误以为会同步到网页端',
      },
      {
        kind: 'notice',
        text: '手环端打包签名已固定：本机打包与服务端打包共用同一套密钥，手环不会把它当成两个应用；请勿删除 watchapp/sign/debug 下的密钥文件',
      },
      {
        kind: 'notice',
        text: '手环上若还装着旧版（随机签名），请先在 AstroBox 里卸载，再安装新包',
      },
    ],
  },
  {
    version: 'v0.7.0',
    date: '2026-09-28',
    title: '手环端与扫码连接',
    items: [
      { kind: 'feature', text: '新增小米手环端应用（Vela 快应用）：当日专注查看与计时、课表按周查看，适配小米手环 10（胶囊屏）与手环 10 Pro（矩形屏）' },
      { kind: 'feature', text: '新增手环扫码连接：手环上显示二维码，手机端「设备连接」扫一下即可绑定，不用在手表上输入任何内容' },
      { kind: 'feature', text: '「设备连接」可查看已连接的手环并解绑；扫码识别在 Android 用系统能力，iOS 等浏览器自动回退到内置解码，并保留手输 6 位码兜底' },
      { kind: 'feature', text: '手环端新增亮色主题，设置页可切换，选择保存在手环本地' },
      { kind: 'feature', text: '专注记录默认按 a、b、c 依次命名，在网页端或 PWA 里可以直接改名' },
      { kind: 'improvement', text: '「当日专注」的分段改为按行展示：每段一行、带进度条与占比，比原来的并排卡片更清楚' },
      { kind: 'notice', text: '手环端需用 AIoT-IDE 打包安装；小米官方目前仅对合作方开放第三方应用安装通道' },
    ],
  },
  {
    version: 'v0.6.0',
    date: '2026-09-27',
    title: '专注统计与界面整理',
    items: [
      { kind: 'feature', text: '今日页新增「当日专注」：当天专注次数与总时长，一眼看清投入了多少' },
      { kind: 'feature', text: '新增「专注时长分布」饼图：按关联计划（没有关联的按标题）拆分，给出各项目时长与占比' },
      { kind: 'feature', text: '新增「数据备份」：一键导出全部计划与记录，也可从备份文件恢复（覆盖前会二次确认）' },
      { kind: 'improvement', text: '「记一笔」与「新增记录」改为醒目的实心按钮，和「新建计划」同级、蓝青两色区分' },
      { kind: 'improvement', text: '通知入口合并为「通知设置」一个弹窗，内含「接收通知」与「任务提醒」两个标签页' },
      { kind: 'improvement', text: '统一各处时长文案，去掉今日页与本周概览重复展示的「连续记录」' },
      { kind: 'fix', text: '修复开着系统代理（Clash/加速器）时教务系统抓取报「无法连接学校认证服务器」的问题' },
      { kind: 'notice', text: '高德地图 key 改为只在构建环境变量中配置，不再写在源码里' },
    ],
  },
  {
    version: 'v0.5.3',
    date: '2026-09-10',
    title: '图片交互与数据迁移修复',
    items: [
      { kind: 'fix', text: '修复点击计划或记录图片时误打开编辑弹窗的问题，预览遮罩关闭也不会再触发编辑' },
      { kind: 'fix', text: '修复带图片创建计划或记录时，因数据库缺少迁移而出现 Internal Server Error 的问题' },
      { kind: 'improvement', text: '后端启动前自动执行数据库迁移，并让通知相关迁移可安全重复执行' },
      { kind: 'improvement', text: '「更新与意见」入口更清晰，历史版本支持分页浏览' },
    ],
  },
  {
    version: 'v0.5.2',
    date: '2026-09-09',
    title: '手机通知与自定义任务提醒',
    items: [
      { kind: 'feature', text: '新增手机通知（Web Push）：安装到主屏幕后，即使不打开网页也能收到系统推送' },
      { kind: 'feature', text: '支持多个时间点提醒每天任务，可自定义批量天数，提前查看未来几天任务' },
      { kind: 'feature', text: '提醒可切换每天、每周、每月、每年重复，到点自动推送当天/本周期任务摘要' },
      { kind: 'improvement', text: '新增通知中心，收到的系统推送可回看，点击通知可直达对应页面' },
      { kind: 'notice', text: 'iPhone 需先将本网站添加到主屏幕，安装后才能开启通知' },
    ],
  },
  {
    version: 'v0.5.1',
    date: '2026-08-31',
    title: '课表导入与设置合一',
    items: [
      { kind: 'improvement', text: '「设置」与「导入课表」合并为单一入口，导入过程中即可完成学期、开学日期与节次设置' },
      { kind: 'improvement', text: '页面顶部「导入课表」与教务系统的「抓取课表」按钮更醒目，一眼可辨' },
    ],
  },
  {
    version: 'v0.5.0',
    date: '2026-08-27',
    title: '课表导入与课程计划',
    items: [
      { kind: 'feature', text: '新增「课表」视图，用周网格展示每周课程，可切换周次查看' },
      { kind: 'feature', text: '支持从教务系统一键抓取课表，或导入 Excel / HTML / ICS 文件与粘贴文本' },
      { kind: 'feature', text: '一键把某周课程生成到日历计划，与今日、日历、全部视图联动' },
      { kind: 'improvement', text: '开学第一周、各节次时间可自定义，方便与本校作息对齐' },
      { kind: 'notice', text: '教务系统抓取仅本次登录使用学号与密码，应用不保存任何学校账号' },
    ],
  },
  {
    version: 'v0.4.5',
    date: '2026-08-27',
    title: '未央品牌标志',
    items: [
      { kind: 'feature', text: '全新「未央环」标志：不闭合的环象征尚未结束、仍在途中，环上的对勾代表抵达与完成' },
      { kind: 'feature', text: '登录页与侧栏品牌位换成新标志，应用图标与浏览器页签同步更新' },
      { kind: 'improvement', text: 'PWA 图标改为满版品牌色以适配安全区，桌面端与移动端更统一' },
    ],
  },
  {
    version: 'v0.4.0',
    date: '2026-08-27',
    title: '品牌化验证码邮件',
    items: [
      { kind: 'feature', text: '注册与重置密码验证码邮件全面改版，统一带上「未央 · Everlong」品牌名与品牌色' },
      { kind: 'improvement', text: '邮件改为纯文本 + 适配主流客户端的 HTML 双版本，验证码更醒目、提示更友好' },
      { kind: 'improvement', text: '登录与注册界面同步展示完整品牌名，验证码发送文案更贴心' },
    ],
  },
  {
    version: 'v0.3.0',
    date: '2026-08-24',
    title: '回忆模块',
    items: [
      { kind: 'feature', text: '新增「回忆」模块：用周报、月报回顾计划与实际记录' },
      { kind: 'feature', text: '非评判式叙事：类别分布、未央清单、足迹最多的一天' },
      { kind: 'improvement', text: '周报/月报可切换，并支持上一期、下一期翻阅每一段时光' },
    ],
  },
  {
    version: 'v0.2.0',
    date: '2026-08-24',
    title: '未央机制 · 允许未完成',
    items: [
      { kind: 'feature', text: '新增「未央」视图：未完成的计划不再被当作逾期，而是留在航线上' },
      { kind: 'feature', text: '未央计划可顺延到新的一天、完成抵达、或改道，过去的航段静候而不催促' },
      { kind: 'improvement', text: '情绪中心从「还有多少没完成」转向「你今天飞到了哪里」' },
      { kind: 'improvement', text: '状态文案改为航班语言：待启程 / 飞行中 / 已抵达 / 改道' },
    ],
  },
  {
    version: 'v0.1.0',
    date: '2026-08-24',
    title: '首个正式版本',
    items: [
      { kind: 'feature', text: '今日视图：查看并勾选当天计划，及时补记实际做了什么' },
      { kind: 'feature', text: '日历视图：按月浏览计划与记录，点击任意日期快速回到当天' },
      { kind: 'feature', text: '活跃度热力图：以 GitHub 风格直观看清过去 12 个月的完成情况' },
      { kind: 'feature', text: '全部视图：跨日期搜索，并按状态、分类筛选计划与记录' },
      { kind: 'improvement', text: '邮箱验证码注册登录，账号之间的数据完全隔离' },
      { kind: 'improvement', text: '深色模式切换，桌面端与浏览器体验保持一致' },
      { kind: 'feature', text: '备份导出与导入，方便随时迁移本地数据' },
      { kind: 'fix', text: '修复部分时区下日期偏移一天的问题' },
    ],
  },
  {
    version: 'v0.0.5',
    date: '2026-08-22',
    title: '统计与热力图',
    items: [
      { kind: 'feature', text: '新增活跃度视图，用热力图直观展示每日完成度' },
      { kind: 'improvement', text: '统计支持按天聚合完成计划数与记录数，并保留连续记录天数' },
    ],
  },
  {
    version: 'v0.0.1',
    date: '2026-08-20',
    title: '核心排期与记录',
    items: [
      { kind: 'feature', text: '新建、编辑、删除计划，支持时间段、优先级与分类' },
      { kind: 'feature', text: '每日记录：记下实际做了什么，可关联到对应计划' },
      { kind: 'feature', text: '状态流转：待办 → 进行中 → 已完成 / 已取消' },
      { kind: 'notice', text: '首个内部预览版本，功能仍在持续打磨' },
    ],
  },
]
