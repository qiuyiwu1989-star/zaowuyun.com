/* ============================================================
 * daymug (dc) 运行时垫片  ——  造物云官网预览用
 * 让 daymug 出码的 .dc.html「源码态」直接在浏览器里渲染：
 *   - <x-dc> 容器 + <script type="text/x-dc"> 里的 class Component extends DCLogic
 *   - {{ var }} 模板：求值 renderVals() 返回的键
 *       · style="{{ k }};extra"  -> 把样式对象转 css 字符串后拼接 extra
 *       · onClick="{{ fn }}"      -> 绑定事件
 *       · 文本 {{ k }}            -> React 元素 / 字符串
 *   - style-hover="..."           -> 鼠标进出时切换内联样式
 *   - <sc-if value="{{ flag }}">  -> 条件显隐（保留 DOM，按需挂载）
 *   - React.createElement          -> 极简实现，产出真实 DOM
 *   - 组件 setState 触发整树重渲染（数据量小，够预览用）
 *   - 不依赖任何外部库
 * ============================================================ */
(function () {
  'use strict';

  /* ---------- IntersectionObserver 兜底：不支持则直接显形（不挡内容） ---------- */
  if (typeof window !== 'undefined' && !('IntersectionObserver' in window)) {
    window.IntersectionObserver = function (cb) {
      return {
        observe(elm) {
          // 立即当作进入视口，触发一次回调
          try { cb([{ isIntersecting: true, target: elm }], this); } catch (e) {}
        },
        unobserve() {}, disconnect() {},
      };
    };
  }

  /* ---------- 极简 React.createElement -> DOM ---------- */
  function el(tag, props, ...children) {
    children = children.flat(Infinity).filter(c => c != null && c !== false);
    if (typeof tag === 'function') {
      return tag({ ...(props || {}), children });
    }
    const node = document.createElementNS(
      /^(svg|path|circle|rect|line|g|polygon|polyline|ellipse|defs|linearGradient|stop|text|tspan|use|clipPath|mask|filter)$/.test(tag)
        ? 'http://www.w3.org/2000/svg'
        : 'http://www.w3.org/1999/xhtml',
      tag
    );
    applyProps(node, props || {});
    children.forEach(c => {
      if (c instanceof Node) node.appendChild(c);
      else node.appendChild(document.createTextNode(String(c)));
    });
    return node;
  }
  function applyProps(node, props) {
    for (const k in props) {
      const v = props[k];
      if (k === 'key' || k === 'children' || v == null) continue;
      if (k === 'style' && typeof v === 'object') {
        Object.assign(node.style, styleToCamelFix(v));
      } else if (/^on[A-Z]/.test(k) && typeof v === 'function') {
        node.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (k === 'className') {
        node.setAttribute('class', v);
      } else if (k in node && node.namespaceURI === 'http://www.w3.org/1999/xhtml' && typeof v !== 'object') {
        try { node[k] = v; } catch (e) { node.setAttribute(k, v); }
      } else {
        node.setAttribute(camelToKebabAttr(k), v);
      }
    }
  }
  function camelToKebabAttr(k) {
    // SVG presentation attrs come camelCased from React-style code
    if (k === 'strokeWidth') return 'stroke-width';
    if (k === 'strokeLinecap') return 'stroke-linecap';
    if (k === 'strokeLinejoin') return 'stroke-linejoin';
    if (k === 'strokeDasharray') return 'stroke-dasharray';
    if (k === 'fillRule') return 'fill-rule';
    if (k === 'clipRule') return 'clip-rule';
    if (k === 'viewBox') return 'viewBox';
    if (k === 'transformOrigin') return 'transform-origin';
    return k.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }
  function styleToCamelFix(obj) {
    // style objects are already camelCase JS; assign directly
    return obj;
  }
  const React = { createElement: el };
  window.React = window.React || React;

  /* ---------- style 对象 -> css 字符串 ---------- */
  function styleObjToCss(obj) {
    if (typeof obj === 'string') return obj;
    if (!obj || typeof obj !== 'object') return '';
    let out = '';
    for (const k in obj) {
      const v = obj[k];
      if (v == null) continue;
      const prop = k.startsWith('--')
        ? k
        : k.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/^Webkit/, '-webkit').replace(/^webkit/, '-webkit').toLowerCase();
      out += prop + ':' + v + ';';
    }
    return out;
  }

  /* ---------- DCLogic 基类 ---------- */
  class DCLogic {
    constructor(host) {
      this._host = host;
      this.state = this.state || {};
    }
    setState(patch, cb) {
      const next = typeof patch === 'function' ? patch(this.state) : patch;
      this.state = { ...this.state, ...next };
      this._host._render();
      if (cb) cb();
    }
    componentDidMount() {}
    componentWillUnmount() {}
    renderVals() { return {}; }
  }
  window.DCLogic = DCLogic;

  /* ---------- 模板插值核心 ---------- */
  const TOKEN = /\{\{\s*([a-zA-Z0-9_$]+)\s*\}\}/;
  const TOKEN_G = /\{\{\s*([a-zA-Z0-9_$]+)\s*\}\}/g;

  function resolveToken(name, vals) {
    if (name === 'false') return false;
    if (name === 'true') return true;
    return vals[name];
  }

  // 处理一个元素的属性里的 {{ }}（style / onClick / 其它）
  function processAttrs(node, vals, hostInstance) {
    if (!node.attributes) return;
    const attrs = Array.from(node.attributes);
    for (const attr of attrs) {
      const name = attr.name, raw = attr.value;
      if (!TOKEN.test(raw) && name !== 'style-hover') continue;

      if (name === 'style') {
        // 可能形如 "{{ k }};extra-css"  或纯 "{{ k }}"
        const m = raw.match(/^\s*\{\{\s*([a-zA-Z0-9_$]+)\s*\}\}\s*(;?.*)$/s);
        if (m) {
          const obj = resolveToken(m[1], vals);
          let css = styleObjToCss(obj);
          const extra = m[2] || '';
          node.setAttribute('style', css + (extra.replace(/^;/, '') ? (';' + extra.replace(/^;/, '')) : ''));
          node._baseStyle = node.getAttribute('style'); // 记录基线，供 hover 还原
        } else {
          // 普通 css 里夹 {{ var }}（var 是字符串型）
          node.setAttribute('style', raw.replace(TOKEN_G, (_, k) => {
            const v = resolveToken(k, vals); return v == null ? '' : String(v);
          }));
          node._baseStyle = node.getAttribute('style');
        }
      } else if (/^on[a-z]+$/i.test(name)) {
        // 通用事件绑定:onclick / onmouseenter / onmouseleave …(浏览器会把属性名小写)
        const m = raw.match(TOKEN);
        if (m) {
          const fn = resolveToken(m[1], vals);
          const evt = name.slice(2).toLowerCase();
          node.removeAttribute(name);
          if (typeof fn === 'function') {
            node.addEventListener(evt, function (e) {
              if (node.tagName === 'A' && node.getAttribute('href') === '#') e.preventDefault();
              fn(e);
            });
          }
        }
      } else {
        // 普通属性里的字符串插值
        node.setAttribute(name, raw.replace(TOKEN_G, (_, k) => {
          const v = resolveToken(k, vals); return v == null ? '' : String(v);
        }));
      }
    }

    // style-hover
    const hov = node.getAttribute && node.getAttribute('style-hover');
    if (hov) {
      node.removeAttribute('style-hover');
      const base = node._baseStyle != null ? node._baseStyle : (node.getAttribute('style') || '');
      node.addEventListener('mouseenter', () => {
        node.setAttribute('style', base + ';' + hov);
      });
      node.addEventListener('mouseleave', () => {
        node.setAttribute('style', base);
      });
    }
  }

  // 把纯文本里的 {{ k }} 替换成实际值（字符串或 React 元素）
  function processTextTokens(node, vals) {
    // 仅处理直接文本子节点
    const kids = Array.from(node.childNodes);
    for (const kid of kids) {
      if (kid.nodeType === Node.TEXT_NODE && TOKEN.test(kid.nodeValue)) {
        const parts = [];
        let last = 0, m;
        const re = new RegExp(TOKEN_G.source, 'g');
        const text = kid.nodeValue;
        while ((m = re.exec(text)) !== null) {
          if (m.index > last) parts.push(document.createTextNode(text.slice(last, m.index)));
          const v = resolveToken(m[1], vals);
          if (v instanceof Node) parts.push(v);
          else if (v != null && typeof v !== 'function' && typeof v !== 'object') parts.push(document.createTextNode(String(v)));
          else if (v == null) parts.push(document.createTextNode(''));
          last = m.index + m[0].length;
        }
        if (last < text.length) parts.push(document.createTextNode(text.slice(last)));
        const frag = document.createDocumentFragment();
        parts.forEach(p => frag.appendChild(p));
        node.replaceChild(frag, kid);
      }
    }
  }

  // 递归处理 DOM 树
  function walk(node, vals, hostInstance) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const tag = node.tagName.toLowerCase();

    // sc-if 条件块
    if (tag === 'sc-if') {
      const valAttr = node.getAttribute('value') || '';
      const m = valAttr.match(TOKEN);
      const flag = m ? resolveToken(m[1], vals) : false;
      node.removeAttribute('value');
      node.removeAttribute('hint-placeholder-val');
      if (!flag) {
        // 条件为假：清空内容（每次从干净模板重建，无需缓存）
        node.innerHTML = '';
        node.style.display = 'none';
        return;
      }
      node.style.display = '';
      // 条件为真：正常往下处理子树（不 return）
    }

    // image-slot 占位
    if (tag === 'image-slot') {
      renderImageSlot(node, vals);
      return;
    }

    processAttrs(node, vals, hostInstance);
    processTextTokens(node, vals);

    Array.from(node.childNodes).forEach(c => walk(c, vals, hostInstance));
  }

  function renderImageSlot(node, vals) {
    const ph = node.getAttribute('placeholder') || '产品截图';
    const baseStyle = node.getAttribute('style') || '';
    node.setAttribute('style', baseStyle + ';display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,rgba(123,128,255,.10),rgba(139,92,246,.05));border:1px dashed rgba(160,144,255,.35);color:rgba(160,144,255,.85);font-size:13px;letter-spacing:.04em;font-family:\'PingFang SC\',\'Noto Sans SC\',sans-serif;text-align:center;padding:24px;');
    node.textContent = ph;
  }

  /* ---------- 组件挂载与渲染循环 ---------- */
  function bootstrap() {
    const xdc = document.querySelector('x-dc');
    const scriptTag = document.querySelector('script[type="text/x-dc"]');
    if (!xdc || !scriptTag) return;

    // 取出模板源（首次渲染前的原始 innerHTML，含 {{ }}）
    // helmet 内容已被浏览器解析进 <head> 不影响；模板主体是 x-dc 下除 <helmet> 外的部分
    const helmet = xdc.querySelector('helmet');
    if (helmet) {
      // 把 helmet 里的 style/link 提升到 head（浏览器可能没自动处理自定义标签内的 style）
      Array.from(helmet.childNodes).forEach(n => {
        if (n.nodeType === Node.ELEMENT_NODE && /^(style|link|script)$/i.test(n.tagName)) {
          document.head.appendChild(n.cloneNode(true));
        }
      });
      helmet.remove();
    }

    const templateHTML = xdc.innerHTML;

    // 实例化组件
    const host = {
      _instance: null,
      _render() {
        const vals = this._instance.renderVals();
        // 用原始模板重建，再插值（保证 setState 后从干净模板渲染）
        const tmp = document.createElement('div');
        tmp.innerHTML = templateHTML;
        Array.from(tmp.childNodes).forEach(c => walk(c, vals, this._instance));
        xdc.innerHTML = '';
        Array.from(tmp.childNodes).forEach(c => xdc.appendChild(c));
        // 渲染后跑组件自身的动画初始化等
        if (this._instance._afterRender) this._instance._afterRender();
      }
    };

    // eslint-disable-next-line no-new-func
    const factory = new Function('DCLogic', 'React', scriptTag.textContent + '\nreturn Component;');
    const ComponentClass = factory(DCLogic, React);
    const inst = new ComponentClass(host);
    host._instance = inst;

    // 首帧
    host._render();

    // 组件生命周期 + 动画（这些方法操作真实 DOM，首帧后调用）
    let mounted = false;
    const doMount = () => {
      if (mounted) return; mounted = true;
      try { inst.componentDidMount && inst.componentDidMount(); } catch (e) { console.warn('componentDidMount', e); }
    };
    // setState 会触发 _render，重渲染后需要重新跑那些「查 DOM 加动画」的初始化
    // 简化策略：componentDidMount 里的 setTimeout(initXxx) 在每次 render 后也补跑一次幂等的。
    inst._afterRender = function () {
      // 重新应用滚动入场 / hero 文字 / 计数器（若组件定义了）
      requestAnimationFrame(() => {
        try { inst._initScrollReveal && inst._initScrollReveal(); } catch (e) {}
        try { inst._initReveal && inst._initReveal(); } catch (e) {}
        try { inst._initHeroText && inst._initHeroText(); } catch (e) {}
        try { inst._initCounters && inst._initCounters(); } catch (e) {}
        try { if (inst.state && inst.state.dark && inst._initParticles) inst._initParticles(); } catch (e) {}
      });
    };

    doMount();
    inst._afterRender();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
