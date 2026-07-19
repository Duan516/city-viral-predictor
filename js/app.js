/**
 * app.js — 入口层
 * 包含：搜索逻辑、AI分析编排、自动补全、事件绑定、初始化
 * 依赖：city-data.js、ai-engine.js、map-module.js、ui-module.js
 */

// ===================== 搜索主逻辑 =====================

/**
 * 执行搜索 — 已知城市显示历史数据，未知城市触发 AI 推演
 */
function doSearch() {
  const input = document.getElementById('searchInput');
  const name = input.value.trim();
  if (!name) return;
  document.getElementById('searchDropdown').classList.remove('show');

  // 1. 检查是否是15城之一（有完整历史数据）
  const knownCity = cities.find(c => c.name === name);
  if (knownCity) {
    showCityDetail(knownCity, false);
    flyToCity(knownCity.lng, knownCity.lat);
    return;
  }

  // 2. 检查坐标库
  const coords = cityCoords[name];
  if (!coords) {
    // 没有坐标，仍可分析（只是地图上不标记）
    analyzeUnknownCity(name, null);
    return;
  }

  // 3. 有坐标 → 飞行 + AI 分析
  flyToCity(coords[0], coords[1]);
  analyzeUnknownCity(name, coords);
}

/**
 * 分析未知城市 — AI 实时推演五信号
 * @param {string} name - 城市名
 * @param {number[]|null} coords - [lng, lat]，为 null 时不添加地图标记
 */
function analyzeUnknownCity(name, coords) {
  // 显示加载动画
  const panel = document.getElementById('detailPanel');
  const content = document.getElementById('detailContent');
  panel.classList.add('active');
  content.innerHTML = `
    <div class="ai-loading">
      <div class="scan"></div>
      <div class="txt">AI 正在分析「${name}」的爆火信号...</div>
      <div class="txt" style="font-size:10px;color:var(--dim)">扫描短视频动量 · 搜索预订 · 基建先行 · 叙事钩子 · 区域溢出</div>
    </div>
  `;

  // 模拟 AI 分析延迟（实际场景可替换为 API 调用）
  setTimeout(() => {
    const signals  = generateSignals(name);
    const score    = calcScore(signals);
    const match    = findMatch(signals);
    const pattern  = getPatternByScore(signals, score);
    const narrative = generateNarrative(name, signals, score, match);

    // 生成叙事钩子摘要
    const attrs = cityAttributes[name] || [];
    const hookStr = attrs.length > 0 ? attrs.slice(0, 3).join(' + ') : '尚未形成明确记忆点';

    // 生成建议操作
    let actions = [];
    if (score >= 75) {
      actions = [`将${name}列入重点监测名单`, '提前准备目的地页面', '评估酒店库存情况', '考虑派人实地踩点'];
    } else if (score >= 60) {
      actions = ['纳入观察名单', '周度跟踪信号变化', '准备目的地页面素材'];
    } else {
      actions = ['保持常规监测频率', '关注周边热门城市溢出效应'];
    }

    // 构造城市数据对象
    const cityData = {
      name: name,
      province: '—',
      signals: signals,
      score: score,
      pattern: pattern,
      hook: hookStr,
      narrative: narrative,
      match: match,
      actions: actions
    };

    showCityDetail(cityData, true);

    // 在地图上添加临时标记
    if (coords && mapChart) {
      addTempMarker(name, coords, score);
    }
  }, 1200);
}

// ===================== 搜索自动补全 =====================

document.getElementById('searchInput').addEventListener('input', function(e) {
  const val = e.target.value.trim();
  const dropdown = document.getElementById('searchDropdown');
  if (!val || val.length < 1) { dropdown.classList.remove('show'); return; }

  const matches = [];
  // 先搜15城（有完整数据）
  cities.forEach(c => {
    if (c.name.includes(val) || val.includes(c.name)) {
      matches.push({ name: c.name, info: c.province + ' · ' + c.pattern, color: patternColors[c.pattern], known: true });
    }
  });
  // 再搜坐标库（可分析）
  Object.keys(cityCoords).forEach(name => {
    if (matches.length >= 10) return;
    if (matches.find(m => m.name === name)) return;
    if (name.includes(val) || val.includes(name)) {
      const attrs = cityAttributes[name];
      matches.push({ name: name, info: attrs ? attrs.slice(0, 2).join('·') : '可分析', color: '#00d4ff', known: false });
    }
  });

  if (matches.length === 0) {
    dropdown.innerHTML = `<div class="item" onclick="document.getElementById('searchInput').value='${val}';doSearch();document.getElementById('searchDropdown').classList.remove('show')">🔍 分析「${val}」</div>`;
  } else {
    dropdown.innerHTML = matches.map(m =>
      `<div class="item" onclick="document.getElementById('searchInput').value='${m.name}';doSearch();document.getElementById('searchDropdown').classList.remove('show')">
        ${m.name} <span class="tag" style="background:${m.color}22;color:${m.color}">${m.info}</span>
      </div>`
    ).join('');
  }
  dropdown.classList.add('show');
});

// 回车搜索
document.getElementById('searchInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    doSearch();
    document.getElementById('searchDropdown').classList.remove('show');
  }
});

// 点击外部关闭下拉
document.addEventListener('click', function(e) {
  if (!e.target.closest('.search-wrap')) {
    document.getElementById('searchDropdown').classList.remove('show');
  }
});

// ===================== 初始化 =====================
renderFilterAndLegend();
renderBacktest();
renderPredictions();
initMap();
