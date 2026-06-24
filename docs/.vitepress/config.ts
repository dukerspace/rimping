import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Rimping',
  description: 'Skill-based token optimization for LLM prompts',
  cleanUrls: true,
  lastUpdated: true,

  head: [['link', { rel: 'icon', href: '/favicon.svg' }]],

  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      title: 'Rimping',
      description: 'Skill-based token optimization for LLM prompts',
      themeConfig: {
        nav: [
          { text: 'User Guide', link: '/user-guide' },
          { text: 'Architecture', link: '/architecture' },
          { text: 'Developers', link: '/developer-guide' },
          { text: 'Benchmarks', link: '/benchmarks' },
        ],
        sidebar: {
          '/': [
            {
              text: 'Introduction',
              collapsed: false,
              items: [
                { text: 'Overview', link: '/' },
                { text: 'User Guide', link: '/user-guide' },
              ],
            },
            {
              text: 'Reference',
              collapsed: false,
              items: [
                { text: 'Architecture', link: '/architecture' },
                { text: 'Developer Guide', link: '/developer-guide' },
                { text: 'Benchmarks', link: '/benchmarks' },
              ],
            },
          ],
        },
        footer: {
          message: 'Released under the MIT License.',
          copyright: 'Copyright © 2026 Rimping Contributors',
        },
        docFooter: { prev: 'Previous', next: 'Next' },
        outline: { label: 'On this page' },
        lastUpdated: { text: 'Last updated' },
        langMenuLabel: 'Language',
        returnToTopLabel: 'Return to top',
        sidebarMenuLabel: 'Menu',
        darkModeSwitchLabel: 'Appearance',
        lightModeSwitchTitle: 'Switch to light theme',
        darkModeSwitchTitle: 'Switch to dark theme',
      },
    },
    th: {
      label: 'ไทย',
      lang: 'th-TH',
      link: '/th/',
      title: 'Rimping',
      description: 'CLI ลดการใช้ token ใน prompt ของ LLM แบบอิง skill',
      themeConfig: {
        nav: [
          { text: 'คู่มือผู้ใช้', link: '/th/user-guide' },
          { text: 'สถาปัตยกรรม', link: '/th/architecture' },
          { text: 'นักพัฒนา', link: '/th/developer-guide' },
          { text: 'Benchmark', link: '/th/benchmarks' },
        ],
        sidebar: {
          '/th/': [
            {
              text: 'บทนำ',
              collapsed: false,
              items: [
                { text: 'ภาพรวม', link: '/th/' },
                { text: 'คู่มือผู้ใช้', link: '/th/user-guide' },
              ],
            },
            {
              text: 'อ้างอิง',
              collapsed: false,
              items: [
                { text: 'สถาปัตยกรรม', link: '/th/architecture' },
                { text: 'คู่มือนักพัฒนา', link: '/th/developer-guide' },
                { text: 'Benchmark', link: '/th/benchmarks' },
              ],
            },
          ],
        },
        footer: {
          message: 'เผยแพร่ภายใต้ MIT License',
          copyright: 'Copyright © 2026 Rimping Contributors',
        },
        docFooter: { prev: 'ก่อนหน้า', next: 'ถัดไป' },
        outline: { label: 'ในหน้านี้' },
        lastUpdated: { text: 'อัปเดตล่าสุด' },
        langMenuLabel: 'ภาษา',
        returnToTopLabel: 'กลับขึ้นด้านบน',
        sidebarMenuLabel: 'เมนู',
        darkModeSwitchLabel: 'ธีม',
        lightModeSwitchTitle: 'เปลี่ยนเป็นธีมสว่าง',
        darkModeSwitchTitle: 'เปลี่ยนเป็นธีมมืด',
      },
    },
  },
})
