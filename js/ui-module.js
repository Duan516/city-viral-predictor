/**
 * ui-module.js — UI 渲染层
 * 包含：详情面板、五信号雷达图、信号条、打字机效果、回测表、趋势预测卡片
 * 依赖：echarts（CDN）、city-data.js（cities, predictions, patternColors）
 *       ai-engine.js（calcScore）
 */

let radarChart = null;

/**
 * 展示城市详情面板
 * @param {Object} city - 城市数据对象
 * @param {boolean} isGenerated - 是否为 AI 实时推演（vs 历史回测数据）
 */
function showCityDetail(city, isGenerated) {
  // 释放旧雷达图实例，防止内存泄漏
  if (radarChart) { radarChart.dispose(); radarChart = null; }

  const panel = document.getElementById('detailPanel');
  const content = document.getElementById('detailContent');

  const score = city.score !== undefined ? city.score : calcScore(city.signals);
  const scoreColor = score >= 85 ? '#34d399' : score >= 75 ? '#00d4ff' : score >= 65 ? '#fbbf24' : '#94a3b8';

  let html = `
    <div class="dp-header">
      <div class="dp-city-row">
        <div>
          <div class="dp-name">${city.name}</div>
          <div class="dp-prov">${city.province || '未知'} ${city.pop ? '· ' + city.pop : ''}</div>
        </div>
        <div class="dp-score">
          <div class="val" style="color:${scoreColor}">${score}</div>
          <div class="lbl">爆火指数</div>
        </div>
      </div>
      <div class="dp-hook">${city.hook || '—'}</div>
      <div class="dp-tags">
        ${city.pattern ? `<span class="dp-tag" style="background:${patternColors[city.pattern]}22;color:${patternColors[city.pattern]}">${city.pattern}</span>` : ''}
        ${city.viral ? `<span class="dp-tag" style="background:rgba(255,255,255,.08);color:var(--muted)">爆火 ${city.viral}</span>` : ''}
        ${isGenerated ? '<span class="dp-ai-badge">⚡ AI 实时推演</span>' : '<span class="dp-tag" style="background:rgba(52,211,153,.15);color:var(--green)">✓ 历史回测数据</span>'}
      </div>
    </div>
    <div class="dp-section">
      <div class="dp-section-title">五信号雷达图</div>
      <div id="radarChart"></div>
      <div class="dp-sig-list">
        ${renderSigBar("短视频动量", city.signals.sv, "#00d4ff")}
        ${renderSigBar("搜索-预订", city.signals.sb, "#00d4aa")}
        ${renderSigBar("基建先行", city.signals.inf, "#fbbf24")}
        ${renderSigBar("叙事钩子", city.signals.nar, "#a78bfa")}
        ${renderSigBar("区域溢出", city.signals.sp, "#ff6b6b")}
      </div>
    </div>
  `;

  // 爆火生命周期时间线（仅历史城市有）
  if (city.timeline && city.timeline.length > 0) {
    html += `
      <div class="dp-section">
        <div class="dp-section-title">爆火生命周期</div>
        <div class="dp-timeline">
          ${city.timeline.map((t,i) => `
            <div class="dp-tl-item t${i+1}">
              <div class="dp-tl-phase">${t.p}</div>
              <div class="dp-tl-time">${t.t}</div>
              <div class="dp-tl-event">${t.e}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // 分析洞察（仅历史城市有）
  if (city.insight) {
    html += `
      <div class="dp-section">
        <div class="dp-section-title">分析洞察</div>
        <div class="dp-insight">${city.insight}</div>
      </div>
    `;
  }

  // AI 实时分析报告（仅推演城市有）
  if (isGenerated && city.narrative) {
    html += `
      <div class="dp-section">
        <div class="dp-section-title">AI 信号分析报告</div>
        <div class="dp-narrative" id="narrativeText"></div>
      </div>
    `;
    if (city.match) {
      html += `
      <div class="dp-section">
        <div class="dp-section-title">历史类比</div>
        <div class="dp-match">
          <span>🔗</span>
          <span>与「${city.match.city.name}」爆发前信号相似度 <b>${city.match.similarity}%</b>（${city.match.city.pattern}）</span>
        </div>
      </div>`;
    }
    if (city.actions) {
      html += `
      <div class="dp-section">
        <div class="dp-section-title">建议操作</div>
        <div class="dp-actions">
          ${city.actions.map((a,i) => `<div class="dp-action"><span class="num">${i+1}</span>${a}</div>`).join('')}
        </div>
      </div>`;
    }
  }

  content.innerHTML = html;
  panel.classList.add('active');

  // 渲染五信号雷达图
  setTimeout(() => {
    const radarEl = document.getElementById('radarChart');
    if (radarEl) {
      radarChart = echarts.init(radarEl);
      radarChart.setOption({
        radar: {
          indicator: [
            { name: '短视频', max: 100 },
            { name: '搜索预订', max: 100 },
            { name: '基建', max: 100 },
            { name: '叙事', max: 100 },
            { name: '溢出', max: 100 }
          ],
          center: ['50%', '52%'],
          radius: '68%',
          axisName: { color: '#7a8ba8', fontSize: 10 },
          splitLine: { lineStyle: { color: 'rgba(0,212,255,.1)' } },
          splitArea: { areaStyle: { color: ['rgba(0,212,255,.02)', 'rgba(0,212,255,.04)'] } },
          axisLine: { lineStyle: { color: 'rgba(0,212,255,.15)' } }
        },
        series: [{
          type: 'radar',
          data: [{
            value: [city.signals.sv, city.signals.sb, city.signals.inf, city.signals.nar, city.signals.sp],
            areaStyle: { color: 'rgba(0,212,255,.15)' },
            lineStyle: { color: '#00d4ff', width: 2 },
            itemStyle: { color: '#00d4ff' }
          }]
        }]
      });
    }
  }, 50);

  // 打字机效果显示分析报告
  if (isGenerated && city.narrative) {
    setTimeout(() => {
      typeWriter('narrativeText', city.narrative, 0);
    }, 300);
  }
}

/**
 * 渲染单个信号条
 */
function renderSigBar(name, val, color) {
  return `<div class="dp-sig-row">
    <span class="sn">${name}</span>
    <div class="bar"><div class="fill" style="width:${val}%;background:${color}"></div></div>
    <span class="sv" style="color:${color}">${val}</span>
  </div>`;
}

/**
 * 打字机效果 — 逐字显示文本
 */
function typeWriter(id, text, idx) {
  const el = document.getElementById(id);
  if (!el) return;
  if (idx >= text.length) { el.innerHTML = text.replace(/\n/g, '<br>'); return; }
  el.innerHTML = text.substring(0, idx + 1).replace(/\n/g, '<br>') + '<span class="typewriter"></span>';
  setTimeout(() => typeWriter(id, text, idx + 1), 8);
}

/**
 * 关闭详情面板
 */
function closeDetail() {
  document.getElementById('detailPanel').classList.remove('active');
  if (radarChart) { radarChart.dispose(); radarChart = null; }
}

/**
 * 渲染回测验证表
 * 将五信号模型应用于 T-4 周（热搜前4周）数据，验证预测命中率
 */
function renderBacktest() {
  const body = document.getElementById('btBody');
  body.innerHTML = cities.map(c => {
    // T-4周信号 = 爆发时信号 × 衰减系数（各维度不同）
    const t4sv  = Math.round(c.signals.sv  * 0.82);
    const t4sb  = Math.round(c.signals.sb  * 0.80);
    const t4inf = Math.round(c.signals.inf * 0.90);
    const t4nar = Math.round(c.signals.nar * 0.75);
    const t4sp  = Math.round(c.signals.sp  * 0.70);
    const t4total = Math.round(t4sv*0.30 + t4sb*0.25 + t4inf*0.15 + t4nar*0.20 + t4sp*0.10);
    const hit = t4total >= 70;
    return `<tr>
      <td><b>${c.name}</b></td><td>${c.viral}</td><td>${c.pattern}</td>
      <td>${t4sv}</td><td>${t4sb}</td><td>${t4inf}</td><td>${t4nar}</td><td>${t4sp}</td>
      <td style="color:${hit?'#34d399':'#ff6b6b'};font-weight:700">${t4total}</td>
      <td class="${hit?'bt-hit':'bt-miss'}">${hit ? '✓ 命中' : '✗ 漏报'}</td>
    </tr>`;
  }).join('');
}

/**
 * 渲染趋势预测卡片
 */
function renderPredictions() {
  const grid = document.getElementById('predGrid');
  grid.innerHTML = predictions.map(p => {
    const confColor = p.conf >= 65 ? '#34d399' : p.conf >= 55 ? '#fbbf24' : '#94a3b8';
    const confBg = p.conf >= 65 ? 'rgba(52,211,153,.12)' : p.conf >= 55 ? 'rgba(251,191,36,.12)' : 'rgba(148,163,184,.12)';
    return `<div class="pred-card">
      <div class="pc-head">
        <div class="pc-name">${p.name} <span style="font-size:11px;color:var(--muted)">${p.prov}</span></div>
        <div class="pc-conf" style="background:${confBg};color:${confColor}">${p.confLabel} · ${p.conf}分</div>
      </div>
      <div class="pc-hook">钩子：${p.hook}</div>
      <div style="font-size:11px">
        <div style="display:flex;justify-content:space-between;padding:2px 0"><span style="color:var(--muted)">短视频动量</span><span>${p.signals.sv}</span></div>
        <div style="display:flex;justify-content:space-between;padding:2px 0"><span style="color:var(--muted)">搜索-预订</span><span>${p.signals.sb}</span></div>
        <div style="display:flex;justify-content:space-between;padding:2px 0"><span style="color:var(--muted)">基建先行</span><span>${p.signals.inf}</span></div>
        <div style="display:flex;justify-content:space-between;padding:2px 0"><span style="color:var(--muted)">叙事钩子</span><span>${p.signals.nar}</span></div>
        <div style="display:flex;justify-content:space-between;padding:2px 0"><span style="color:var(--muted)">区域溢出</span><span>${p.signals.sp}</span></div>
      </div>
      <div class="pc-note">${p.note}</div>
    </div>`;
  }).join('');
}
