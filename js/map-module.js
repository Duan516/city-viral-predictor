/**
 * map-module.js — 地图渲染层
 * 包含：ECharts地图初始化、标记渲染、模式筛选、地图飞行、临时标记
 * 依赖：echarts（CDN）、china-geo.js、city-data.js（cities, patternColors）
 *       ui-module.js（showCityDetail — 运行时调用，加载顺序在后即可）
 */

let mapChart = null;
let currentFilter = "all";

/**
 * 初始化中国地图
 * 从 china-geo.js 加载内嵌的 GeoJSON 数据，注册到 ECharts
 */
function initMap() {
  try {
    if (!window.chinaGeoJson) throw new Error('GeoJSON not loaded');
    echarts.registerMap('china', window.chinaGeoJson);

    document.getElementById('mapLoading').style.display = 'none';
    document.getElementById('mapChart').style.display = 'block';
    document.getElementById('mapTip').style.display = 'block';
    document.getElementById('mapFilter').style.display = 'flex';
    document.getElementById('mapLegend').style.display = 'block';

    mapChart = echarts.init(document.getElementById('mapChart'));
    renderMap();

    window.addEventListener('resize', () => {
      if (mapChart) mapChart.resize();
      if (radarChart) radarChart.resize();
    });
  } catch(e) {
    document.getElementById('mapLoading').innerHTML =
      '<div style="text-align:center;color:var(--coral)">⚠️ 地图加载失败<br>' +
      '<span style="font-size:11px;color:var(--muted)">' + e.message + '</span></div>';
  }
}

/**
 * 渲染地图标记
 * 按当前筛选条件渲染城市 effectScatter 脉冲标记
 */
function renderMap() {
  const filtered = currentFilter === "all"
    ? cities
    : cities.filter(c => c.pattern === currentFilter);

  const markers = filtered.map(c => ({
    name: c.name,
    value: [c.lng, c.lat, c.score],
    cityData: c,
    itemStyle: {
      color: patternColors[c.pattern],
      shadowBlur: 12,
      shadowColor: patternColors[c.pattern]
    }
  }));

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(15,30,55,.95)',
      borderColor: 'rgba(0,212,255,.3)',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: function(p) {
        if (!p.data.cityData) return p.name;
        const c = p.data.cityData;
        return `<div style="font-size:14px;font-weight:700;margin-bottom:4px">${c.name} <span style="font-size:11px;color:#7a8ba8">${c.province}</span></div>
                <div style="font-size:11px;color:#00d4ff;margin-bottom:4px">${c.hook}</div>
                <div style="font-size:11px;color:#7a8ba8">爆火指数: <b style="color:${c.score>=85?'#34d399':c.score>=75?'#00d4ff':'#fbbf24'}">${c.score}</b> · ${c.pattern}</div>
                <div style="font-size:10px;color:#4a5b78;margin-top:4px">点击查看详细分析 →</div>`;
      }
    },
    geo: {
      map: 'china',
      roam: true,
      zoom: 1.25,
      center: [107, 36],
      itemStyle: { areaColor: '#0d1f3c', borderColor: '#1a3a5c', borderWidth: 0.5 },
      emphasis: { itemStyle: { areaColor: '#13294a' }, label: { show: false } },
      label: { show: false }
    },
    series: [{
      // 城市标记
      type: 'effectScatter',
      coordinateSystem: 'geo',
      data: markers,
      symbolSize: function(val) { return Math.max(8, val[2] / 5); },
      rippleEffect: { brushType: 'stroke', scale: 3.5, period: 4 },
      showEffectOn: 'render',
      label: {
        show: true,
        formatter: '{b}',
        position: 'right',
        fontSize: 11,
        color: '#e2e8f0',
        textShadowColor: '#0a1628',
        textShadowBlur: 3
      },
      itemStyle: {
        shadowBlur: 10,
        shadowColor: 'rgba(0,212,255,0.4)'
      },
      zlevel: 2
    }, {
      // 搜索临时标记（初始为空，由 addTempMarker 填充）
      type: 'effectScatter',
      coordinateSystem: 'geo',
      data: [],
      symbolSize: 14,
      rippleEffect: { brushType: 'stroke', scale: 4, period: 3 },
      label: { show: true, formatter: '{b}', position: 'right', fontSize: 12, color: '#00d4ff', fontWeight: 700, textShadowColor: '#0a1628', textShadowBlur: 4 },
      itemStyle: { color: '#00d4ff', shadowBlur: 15, shadowColor: '#00d4ff' },
      zlevel: 3
    }]
  };

  mapChart.setOption(option, true);

  // 点击城市标记 → 展示详情
  mapChart.off('click');
  mapChart.on('click', function(params) {
    if (params.data && params.data.cityData) {
      showCityDetail(params.data.cityData, false);
    }
  });
}

/**
 * 渲染筛选器栏和图例
 */
function renderFilterAndLegend() {
  const patterns = Object.keys(patternColors);

  const filterEl = document.getElementById('mapFilter');
  filterEl.innerHTML = '<div class="filter-chip active" data-p="all" onclick="setFilter(\'all\')">全部</div>' +
    patterns.map(p =>
      `<div class="filter-chip" data-p="${p}" onclick="setFilter('${p}')">${p.replace('型','')}</div>`
    ).join('');

  const legendEl = document.getElementById('legendItems');
  legendEl.innerHTML = patterns.map(p =>
    `<div class="lg-item" onclick="setFilter('${p}')"><div class="dot" style="background:${patternColors[p]}"></div>${p.replace('型','')}</div>`
  ).join('');
}

/**
 * 设置筛选模式并重新渲染地图
 */
function setFilter(p) {
  currentFilter = p;
  document.querySelectorAll('.filter-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.p === p);
  });
  if (mapChart) renderMap();
}

/**
 * 地图飞行到指定坐标
 * @param {number} lng - 经度
 * @param {number} lat - 纬度
 */
function flyToCity(lng, lat) {
  if (!mapChart) return;
  mapChart.setOption({
    geo: { center: [lng, lat], zoom: 3, animationDurationUpdate: 800, animationEasingUpdate: 'cubicInOut' }
  });
}

/**
 * 在地图上添加搜索结果临时标记
 * @param {string} name - 城市名
 * @param {number[]} coords - [lng, lat]
 * @param {number} score - 爆火指数
 */
function addTempMarker(name, coords, score) {
  const tempData = [{
    name: name,
    value: [coords[0], coords[1], score],
    cityData: null,
    itemStyle: { color: '#00d4ff', shadowBlur: 15, shadowColor: '#00d4ff' }
  }];

  mapChart.setOption({
    series: [{}, { data: tempData }]
  });
}
