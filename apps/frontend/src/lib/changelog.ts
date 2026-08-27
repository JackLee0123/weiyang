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

export const CURRENT_VERSION = 'v0.5.0'

export const CHANGELOG_KIND_META: Record<ChangelogKind, { label: string; className: string }> = {
  feature: { label: '新增', className: 'bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300' },
  improvement: { label: '优化', className: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' },
  fix: { label: '修复', className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  notice: { label: '说明', className: 'bg-slate-100 text-slate-600 dark:bg-slate-700/70 dark:text-slate-300' },
}

export const CHANGELOG: ChangelogEntry[] = [
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
