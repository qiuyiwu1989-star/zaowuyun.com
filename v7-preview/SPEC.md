# 造物云官网 v7 · 站点规范 SPEC

> 单一事实源 · 2026-06-22 起。新增或迁移任何页面**必须**遵循本规范。
> 配套:可视样板间 `design-system.html`、共享静态样式 `site.css`、产品日志 `../log.html`。
> 文案脊柱见 `../官网策划.md`、定位见 `../战略诊断与定位-v3.md`。

---

## 0. 运行时(先理解这一条)

页面是 **daymug 源码态**:`<x-dc>` 容器 + `<script type="text/x-dc">` 内的组件类,靠 `support.js` 运行时在浏览器渲染。
- `{{ var }}` 模板由组件 `renderVals()` 求值;`<image-slot>` 是占位图;`support.js` 每次 `setState` 从干净模板**整树重渲染**。
- 因此:**不要把头尾抽成需要 JS 注入的共享组件**(会被重渲染冲掉)。共享靠「`site.css` 外联 + 本规范的 canonical 复制块 + 一致性清单」。
- 随主题/断点变化的 token(`--navBg`/`--navLinks`/`--footerCols`/`rootStyle`…)由各页 `renderVals()` 注入,**不外联**。

---

## A. 信息架构 (Sitemap)

**主导航(对外,固定 5 项)**

| 文案 | 文件 | 说明 |
|---|---|---|
| 首页 | `index.html` | 唯一首页 |
| 产品中心 | `products.html` | 产品族总览;首页用「产品」hover 下拉露出 工作台/API HUB |
| 解决方案 | `solutions.html` | 按行业 + 合作模式 |
| 案例 | `cases.html` | 社会证明 |
| 关于我们 | `about.html` | 企业信息 + 联系方式 |

- **产品族详情页**:`workbench.html`(AI 工作台)、`api-hub.html`(智核·API HUB)——经「产品中心」或首页下拉进入。
- **辅助页(仅 footer/日志可达)**:`design-system.html`(设计系统)、`../log.html`(产品日志/索引)。
- **设计实验室 `_lab` 性质**(仅 `../log.html` 可达,不进任何对外导航):`font-lab` `logo-lab` `nav-lab` `logo-guide` `logo-polish-compare` `vi-applications` `accent-tune` `preview`。
- **归档 `../_archive/`**(随站发布但只经日志可达):旧 Tailwind 站 + 历史首页草稿(`home-*`)。裸域 `../index.html` 已改为跳转本目录 `index.html`。

> 站点形态:本轮保持 `/v7-preview/` 子路径。「提升为站点根」是独立的后续步骤(届时改 `deploy.sh` 与全部内部链接)。

---

## B. 主页版式规范

`index.html` 是唯一首页,区块顺序按 `../官网策划.md` 的叙事脊柱固定:

1. **Hero** — H1「你自己的 AI 中台 / AI 时代的 ERP」+ 主 CTA
2. **痛点** — 工具零散 / 知识库没人用 / ERP 只有数据没业务
3. **主张 + 飞轮** — 会自己进化的中台;场景→数据→模型→更好的场景
4. **机制四件套** — 文件 / 大脑 / 手 / 自动化 + 三徽章(数据不出门·不做知识库·中立不锁)
5. **楔子** — 数字项目经理:从立项到复盘从头串到尾
6. **越用越离不开** — 失败库 / 每轮更健壮
7. **证据** — 案例 + 资质条(浙大孵化·AIGC TOP50·专精特新…)
8. **为什么是我们** — 方法是我们的 + 浙大设计系血脉
9. **合作 / ROI / CTA**
10. **Footer**

**单一主 CTA:预约演示 → `index.html#cta`**。全站所有「预约/演示」动作都指向它,不另开转化路径。

---

## C. 设计系统 · 单一事实源

- **静态层 → `site.css`**(每页 `<head>`/`<helmet>` 内 `<link rel="stylesheet" href="./site.css">`):
  reset、跨页共享 `@keyframes`(`spinRing`/`fadeUp`/`logoAppear`/`menuIn`)、品牌标动画(`.brand-mark .f-*` + `brandShim`)、顶栏下拉(`.nav-prod` / `.nav-prod-menu`)、字体工具类(`.font-sans`/`.font-serif`→黑体/`.font-mono`)、`prefers-reduced-motion`。
  - **禁止**在各页 helmet 内重复定义以上内容;页内 `<style>` 只放**本页专用**动画(如 `pulsOrb`/`floatY`/`gradShift`/`shimmerBorder`/`flowLine`)。
- **动态层 → 组件 `renderVals()`**:颜色/响应式 token 以内联 CSS 变量注入 `rootStyle` 与各 `--xxx`,随主题(明/暗)与断点变化。
- **可视样板间 → `design-system.html`**:配色/字体/间距/圆角阴影/动效 + 组件库,色值点击即复制。

**字体**:思源黑体(`Noto Sans SC` / `Source Han Sans SC`)为**唯一品牌字**,标题靠字重分层(900/700/500/400),不用衬线;拉丁与数字走 `Space Grotesk`。经 `https://fonts.font.im`(360 镜像,国内可达)异步加载 + `display=swap`。

---

## D. 共享头尾 (canonical) 与一致性清单

头尾焊在各页模板里(含巨幅 logo SVG),靠**复制 + 核对**保持一致,不做运行时注入。

**统一 header(2026-07-02 起全站单一版本)**(共用 `site.css` 与同一 logo SVG):
- 全站(首页 + 6 营销页)统一为**完整版**:矢量字标 logo + `产品`hover 下拉(CSS,`site.css` `.nav-prod`)+ 解决方案 / 3D渲染外链 / 案例 / 关于 + 主题切换 + 预约演示 + 汉堡(移动菜单)。
- 当前页项高亮(`color:var(--fg);background:var(--surf)`):产品页高亮「产品」下拉按钮,solutions/cases/about 高亮对应链接。
- 主题切换图标用 **SVG(禁 emoji)**;CTA `navCtaBtn` 用品牌紫(`d?'#7B80FF':'#3535B5'`)。
- 移动菜单用 React 状态(`mobileMenuOpen`/`toggleMobile`/`closeMobile` + `hambBtn`);`--hamburger`/`--navLinks` 由各页 `_resp` 注入。
- ~~此前分「完整版(仅首页)/ 精简版(其余 6 页)」两变体已废弃,统一为完整版。~~

**复制源**:全站顶栏以 `index.html` 顶栏为准(完整版下拉)。

**Footer 全站统一为「跟随主题的四栏页脚」**(2026-07-02 起,以 `index.html` 页脚为 canonical 复制源):
- 结构:`Create with AI` 大字品牌带 + 四栏链接网格(品牌简介/`PRODUCTS`/`SOLUTIONS`/`COMPANY`)+ 版权条。
- **颜色随明暗主题切换**(取代旧「恒深 `#100B1F`」规范):用 `--ftr*` 变量(浅色主题=暖白面板 `#EFE9DE`+墨色文字;深色主题=深蓝锚 `#0E0A1E`+白色文字);品牌带水印用 `--wmColor`。`--ftr*` 与 `--wmColor` 在各页 `renderVals()` 的 `rootStyle` 里按 `d ? {深} : {浅}` 注入。
- 四栏网格需 `--footerCols` 响应式 token,在各页 `_resp` 注入:`m/t ? 'repeat(2,1fr)' : '1.4fr 1fr 1fr 1fr'`。
- **子页链接改写**(防死链,见 F):品牌「预约演示」与 CTA → `index.html#cta`;`PRODUCTS` 列 → `products.html`;`SOLUTIONS` 列 → `solutions.html`;`COMPANY` 列 → `about.html`/`cases.html`。首页因内容同页用 `#cta`/`#products` 锚点,子页一律换真实页。
- 版权条必含:`© 2026 杭州造物云技术有限公司. 保留所有权利.` · `设计系统`(→`design-system.html`)· 备案号两条,逐字一致:
  `浙ICP备2021038972号-1` / `浙公网安备 33010602013219号`。

> 历史:①此前子页用过「一行极简页脚」→ 2026-06-22 统一为深色四栏页脚;②2026-07-02 顶栏统一为完整版下拉、页脚从「恒深」改为「跟随主题 `--ftr*`」,logo 全站换矢量字标,主题图标去 emoji 改 SVG,产品下拉与页脚 `PRODUCTS` 同源(智枢→`api-hub`、AI工作台→`workbench`、其余→`products.html`)。

**产品花名册(下拉与页脚 `PRODUCTS` 共用同一份,去向真实页):**
智枢·TOKEN HUB→`api-hub.html` · AI 工作台→`workbench.html` · 应用中心/知识管理/深脑→`products.html`(暂无独立页)。命名/去向如调整,两处同步改。

**改任一页前过一遍一致性清单:**
- [ ] 顶栏 = 完整版下拉(`index.html` 为准):产品下拉/解决方案/3D渲染/案例/关于;当前页高亮。
- [ ] 主 CTA 文案「预约演示」,href = `index.html#cta`;主题图标为 SVG(非 emoji)。
- [ ] Footer = 跟随主题四栏页脚(`index.html` 为准);`--ftr*`/`--wmColor`/`--footerCols` 已在 `renderVals` 注入;深/浅主题都正确;子页 PRODUCTS/CTA 链接已改真实页;含「设计系统」+ 两条备案号逐字一致。
- [ ] 产品下拉与页脚 `PRODUCTS` 清单同源、均指向真实页(无 `#products` 死锚)。
- [ ] logo(矢量字标,品牌紫)点击回 `index.html`;当前页在导航中高亮。
- [ ] 无 `href="#"` 等死链(见 F)。

---

## E. 页面创作约定

新页 = 复制下面骨架,填内容:

```html
<!DOCTYPE html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<script src="./support.js"></script>
</head><body>
<x-dc>
<helmet>
  <link rel="preconnect" href="https://fonts.font.im" crossorigin>
  <link href="https://fonts.font.im/css2?family=Noto+Sans+SC:wght@400;500;700;900&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="./site.css">
  <style>/* 仅本页专用 @keyframes */</style>
</helmet>
<div data-screen-label="造物云-XXX" style="{{ rootStyle }}">
  <!-- 精简版 header(从 products.html 复制) -->
  <!-- 内容区 -->
  <!-- canonical footer -->
</div>
</x-dc>
<script type="text/x-dc" data-dc-script>
class Component extends DCLogic { /* renderVals() 提供 rootStyle 与响应式 token */ }
</script>
</body></html>
```

- 图片占位一律 `<image-slot placeholder="…">`,**禁止**指向不存在文件或空白图。
- **做完一个新页面/改动,去 `../log.html` 的 `ITEMS` 数组登记一条**(带时间戳)。

---

## F. 死链与占位纪律

- **禁止** `href="#"`。动作类没目标页 → 落主 CTA `index.html#cta`;有更合适真实页 → 指过去。
- **功能不存在的入口直接删除**,不留死链:价格、登录、服务条款、隐私政策、加入我们(均无对应页)。
- 联系方式用真实值:邮箱 `mailto:hello@zaowuyun.com`;无真实电话则不放占位电话。
- 自查:`grep -rn 'href="#"\|tel:.*xxx\|email-protection' v7-preview/*.html` 应为空。

---

## G. 文案与视觉纪律(工作区通则)

- **不用 emoji 表情**(🏛🤖📷… 一律不用);需要标记用文字或排版符号(→ ← ✕ ✦ ★ ◈)。
- **中文用弯引号** `“”`(嵌套 `‘’`),不用直引号或 `「」`。
- 用词遵循 `../官网策划.md` 用词表:要说「你自己的 AI 中台 / AI 时代的 ERP / 越用越离不开 / 数据不出门 / 会进化 / 数字项目经理」;不说「咨询外包 / 操作系统·判断OS·复利回路 / 平台·生态」。

---

## H. 部署

`bash ../deploy.sh` → 发布到 `https://zwy.alimq.com`。
- 发布范围:根 `*.html`/`*.md` + `assets/` + `v7-preview/***` + `_archive/***`。
- v7 现役站:`https://zwy.alimq.com/v7-preview/`;裸域 `https://zwy.alimq.com/` 自动跳转 v7。
- 发布后逐页点导航/CTA/footer,确认无 404。
