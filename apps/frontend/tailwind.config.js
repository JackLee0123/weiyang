/**
 * 未央 · Everlong — 设计基底
 *
 * 方向：低饱和、暖中性、编辑感。三条原则：
 *   1) 颜色只表达状态与主操作，不做装饰（去掉淡彩图标块、彩色标签底）；
 *   2) 层级用发丝线 + 留白，而不是投影和大圆角卡片；
 *   3) 对比靠字重/字号/字距，而不是靠色块。
 *
 * 下面把 slate / teal / rose / amber / emerald / blue 几组默认色阶整体换成
 * 低饱和版本。项目里已有几百处 `dark:text-slate-300`、`bg-rose-50` 之类的
 * 类名，替换色阶等于一次性把它们全部降噪，不用逐个组件改。
 */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 品牌色：低饱和深松绿，只用于主操作与强调
        brand: {
          DEFAULT: '#15564D',
          soft: '#E7EDEA',
          deep: '#0E423B',
          ink: '#123F39',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F6F6F4',
          soft: '#EFEFEC',
          deep: '#22221E',
          darkest: '#171714',
        },
        line: {
          DEFAULT: '#E6E6E1',
          soft: '#EFEFEB',
          strong: '#D2D2CB',
          dark: '#33332E',
        },
        ink: {
          DEFAULT: '#1A1A17',
          soft: '#55554E',
          muted: '#7D7D74',
          faint: '#A8A8A0',
        },

        // 中性灰：偏暖，替代原来的冷灰
        slate: {
          50: '#FAFAF8',
          100: '#F5F5F2',
          200: '#EAEAE5',
          300: '#D6D6CF',
          400: '#8F8F86',
          500: '#6C6C64',
          600: '#4E4E47',
          700: '#33332E',
          800: '#22221E',
          900: '#171714',
          950: '#0F0F0D',
        },
        // 品牌绿阶：深色模式下用 200/300 作为强调文字
        teal: {
          50: '#E7EDEA',
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
        // 状态色统一降饱和，只保留"能读出含义"的程度
        rose: {
          50: '#F8EEEC',
          100: '#F1DCD9',
          200: '#E2B4AE',
          300: '#CE8F87',
          400: '#B76A60',
          500: '#A34C43',
          600: '#8A3C34',
          700: '#6E2F29',
          800: '#552420',
          900: '#3F1B18',
        },
        amber: {
          50: '#F8F2E6',
          100: '#EFE2C8',
          200: '#E0C795',
          300: '#CDA96A',
          400: '#B98D45',
          500: '#9C732F',
          600: '#7F5C25',
          700: '#65491D',
          800: '#4E3816',
          900: '#38280F',
        },
        emerald: {
          50: '#EBF1EC',
          100: '#D8E5DA',
          200: '#B0CBB4',
          300: '#8BB394',
          400: '#62966D',
          500: '#4A7B54',
          600: '#3D6645',
          700: '#315237',
          800: '#26402B',
          900: '#1B2F20',
        },
        blue: {
          50: '#EDF0F5',
          100: '#DCE3EC',
          200: '#B8C6DA',
          300: '#94A9C6',
          400: '#6C8AAE',
          500: '#4E6E94',
          600: '#3F597B',
          700: '#334962',
          800: '#28394C',
          900: '#1C2835',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          '"Noto Sans SC"',
          'system-ui',
          'sans-serif',
        ],
      },
      // 更紧的字号阶梯：小字更小、大字号更大，层级更清楚
      fontSize: {
        '2xs': ['11px', { lineHeight: '16px' }],
        xs: ['12px', { lineHeight: '18px' }],
        sm: ['13px', { lineHeight: '20px' }],
        base: ['14px', { lineHeight: '22px' }],
        lg: ['15px', { lineHeight: '24px' }],
        xl: ['17px', { lineHeight: '26px' }],
        '2xl': ['20px', { lineHeight: '28px' }],
        '3xl': ['26px', { lineHeight: '32px' }],
        '4xl': ['32px', { lineHeight: '38px' }],
        '5xl': ['40px', { lineHeight: '44px' }],
      },
      // 圆角收敛：卡片 10px、控件 8px
      borderRadius: {
        sm: '3px',
        DEFAULT: '5px',
        md: '7px',
        lg: '10px',
        xl: '12px',
        btn: '8px',
        input: '8px',
        card: '10px',
        panel: '10px',
        pill: '999px',
      },
      boxShadow: {
        // 只保留浮层级别的阴影，卡片一律用发丝线
        sm: '0 1px 2px 0 rgb(23 23 20 / 0.04)',
        panel: '0 1px 2px 0 rgb(23 23 20 / 0.03)',
        soft: '0 2px 8px -2px rgb(23 23 20 / 0.08)',
        float: '0 10px 30px -12px rgb(23 23 20 / 0.16), 0 2px 8px -2px rgb(23 23 20 / 0.06)',
        menu: '0 12px 32px -12px rgb(23 23 20 / 0.2), 0 2px 6px -2px rgb(23 23 20 / 0.08)',
      },
      spacing: {
        4.5: '18px',
        13: '52px',
        18: '72px',
        22: '88px',
      },
      letterSpacing: {
        label: '0.08em',
        title: '-0.012em',
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
