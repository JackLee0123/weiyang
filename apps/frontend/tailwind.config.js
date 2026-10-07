/**
 * 未央 · Everlong — 设计基底（方向代号「纸墨」）
 *
 * 三条原则，沿用上一版降噪改版并进一步收敛：
 *   1) 颜色只表达状态与主操作，不做装饰；
 *   2) 层级靠发丝级 1px 低对比分隔线 + 大量留白，不靠卡片阴影；
 *   3) 一张纸的温度：暖白纸底 + 墨色文字 + 单一深松绿强调色。
 *
 * 令牌取值全部对应设计稿《Everlong前端设计稿.html》的 :root 段，
 * 落地方式沿用项目现状（Tailwind theme 扩展 + index.css 里的 CSS 变量），
 * 不另起一套。
 *
 * 深色模式：本版只画浅色稿，这里保留 .dark 的令牌机制与换算式，
 * 便于以后扩展，不视为已完成的深色主题。
 */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // —— 纸面（paper）——
        paper: {
          DEFAULT: '#FAF9F7', // 纸底
          sunk: '#F3F1EC', // 纸底·下沉
        },
        // —— 品牌色：低饱和深松绿，只用于主操作与强调 ——
        brand: {
          DEFAULT: '#15564D',
          soft: '#E9EEEC',
          deep: '#0E423B',
          ink: '#123F39',
        },
        // —— 面（surface）——
        surface: {
          DEFAULT: '#FFFFFF', // 面
          muted: '#F6F4F0', // 面·次级
          soft: '#F0EEE9', // 面·次级（浅）
          deep: '#201F1B', // 深色模式的面
          darkest: '#171614', // 深色模式的纸底
        },
        // —— 发丝线（line）——
        line: {
          DEFAULT: '#E7E4DD',
          soft: '#F0EEE9',
          strong: '#D5D1C8',
          dark: '#322F2A',
        },
        // —— 墨（ink）——
        ink: {
          DEFAULT: '#1B1A17',
          soft: '#54524B',
          muted: '#8B877D',
          faint: '#B5B1A7',
        },
        // —— 语义色：压暗到 ~40% 明度，能读出含义但不抢主操作 ——
        semantic: {
          ok: '#3E6B4B',
          warn: '#8A6A24',
          danger: '#8C3A32',
          info: '#3F5A78',
        },

        // 中性灰：偏暖，替代冷灰
        slate: {
          50: '#FAF9F7',
          100: '#F6F4F0',
          200: '#EBE8E2',
          300: '#D5D1C8',
          400: '#8B877D',
          500: '#6E6B64',
          600: '#54524B',
          700: '#33322E',
          800: '#201F1B',
          900: '#171614',
          950: '#0F0E0D',
        },
        // 品牌绿阶：深色模式下用 200/300 作为强调文字
        teal: {
          50: '#E9EEEC',
          100: '#D2E0DC',
          200: '#A9C8C1',
          300: '#7FB3AA',
          400: '#4F8C82',
          500: '#1A5F55',
          600: '#15564D',
          700: '#0E423B',
          800: '#0B3630',
          900: '#082C27',
          950: '#051F1C',
        },
        // 状态色阶：以语义色为锚点重建，整组降饱和
        rose: {
          50: '#F8F0EE',
          100: '#F1DCD9',
          200: '#E2B4AE',
          300: '#CE8F87',
          400: '#B76A60',
          500: '#A34C43',
          600: '#8C3A32',
          700: '#74302A',
          800: '#5A2622',
          900: '#421C19',
        },
        amber: {
          50: '#F8F4EA',
          100: '#EFE5CC',
          200: '#E0C795',
          300: '#CDA96A',
          400: '#B98D45',
          500: '#A17C33',
          600: '#8A6A24',
          700: '#6E541D',
          800: '#544016',
          900: '#3C2E10',
        },
        emerald: {
          50: '#F2F5F1',
          100: '#DDE7DE',
          200: '#B4CBB7',
          300: '#8DB394',
          400: '#63966E',
          500: '#3E6B4B',
          600: '#365E42',
          700: '#2C4C36',
          800: '#223B2A',
          900: '#192C1F',
        },
        blue: {
          50: '#F0F3F7',
          100: '#DDE5EE',
          200: '#B8C6DA',
          300: '#94A9C6',
          400: '#6C8AAE',
          500: '#3F5A78',
          600: '#37506B',
          700: '#2D4257',
          800: '#243444',
          900: '#1A2732',
        },
      },
      fontFamily: {
        // 标题：有性格的衬线，跨平台可退化，全部系统内置
        display: [
          'Georgia',
          '"Songti SC"',
          '"Source Han Serif SC"',
          '"Noto Serif SC"',
          '"Songti"',
          'serif',
        ],
        // 正文：中性无衬线，不引外部字体（去掉 Inter 作为主字体）
        sans: [
          '-apple-system',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          '"Segoe UI"',
          'system-ui',
          'sans-serif',
        ],
        // 数字 / 版本 / 接口
        mono: ['ui-monospace', '"SFMono-Regular"', 'Consolas', '"Liberation Mono"', 'monospace'],
      },
      // 字号阶梯按设计稿的字体层级重设
      fontSize: {
        '2xs': ['11px', { lineHeight: '16px' }], // 眉标 / 版本号
        meta: ['11.5px', { lineHeight: '18px' }], // 元信息 / 表单标签
        xs: ['12px', { lineHeight: '18px' }],
        sm: ['13px', { lineHeight: '20px' }],
        list: ['13.5px', { lineHeight: '21px' }], // 列表标题
        base: ['14px', { lineHeight: '23px' }], // 正文
        lg: ['15px', { lineHeight: '24px' }],
        xl: ['17px', { lineHeight: '26px' }],
        '2xl': ['20px', { lineHeight: '28px' }],
        section: ['18px', { lineHeight: '26px' }], // 区块标题
        num: ['23px', { lineHeight: '28px' }], // 数据数字
        '3xl': ['30px', { lineHeight: '38px' }], // 页面标题
        '4xl': ['32px', { lineHeight: '38px' }],
        '5xl': ['40px', { lineHeight: '44px' }],
      },
      // 圆角收在 2 / 4 / 6 / 10 / 999
      borderRadius: {
        sm: '2px', // 标签
        DEFAULT: '4px', // 控件
        md: '6px', // 容器
        lg: '10px', // 浮层
        xl: '10px',
        btn: '4px',
        input: '4px',
        card: '6px',
        panel: '6px',
        pill: '999px',
      },
      boxShadow: {
        // 静态面一律无阴影；只有浮层允许一处低对比投影
        sm: '0 1px 2px 0 rgb(27 26 23 / 0.04)',
        panel: '0 1px 2px 0 rgb(27 26 23 / 0.03)',
        soft: '0 1px 3px 0 rgb(27 26 23 / 0.05)',
        float: '0 24px 60px -24px rgb(27 26 23 / 0.28), 0 2px 8px -3px rgb(27 26 23 / 0.10)',
        menu: '0 24px 60px -24px rgb(27 26 23 / 0.24), 0 2px 8px -3px rgb(27 26 23 / 0.08)',
      },
      spacing: {
        2.75: '11px', // 纵向节奏：条目内 11px
        4.5: '18px',
        6.5: '26px',
        7.5: '30px',
        13: '52px',
        18: '72px',
        22: '88px',
      },
      maxWidth: {
        content: '1160px', // 内容区最大宽
      },
      letterSpacing: {
        label: '0.2em', // 眉标
        section: '-0.005em', // 区块标题
        title: '-0.008em', // 页面标题
      },
      // 细粒度透明度档位（Tailwind 默认只有 5 的倍数）
      opacity: {
        1: '0.01',
        3: '0.03',
        4: '0.04',
        6: '0.06',
        8: '0.08',
        12: '0.12',
        18: '0.18',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
      },
    },
  },
  plugins: [],
}
