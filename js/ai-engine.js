/**
 * ai-engine.js — AI 分析引擎
 * 包含：信号生成、加权打分、历史类比、叙事分析、模式判定
 * 依赖：city-data.js（cities, cityAttributes, signalWeights）
 */

/**
 * 城市名哈希函数 — 为同一城市生成确定性的信号分数
 * 保证同一城市每次分析结果一致
 */
function hashCity(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) - h) + name.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/**
 * 五信号加权打分
 * @param {Object} sig - {sv, sb, inf, nar, sp}
 * @returns {number} 0-100 综合爆火指数
 */
function calcScore(sig) {
  return Math.round(
    sig.sv  * signalWeights.sv +
    sig.sb  * signalWeights.sb +
    sig.inf * signalWeights.inf +
    sig.nar * signalWeights.nar +
    sig.sp  * signalWeights.sp
  );
}

/**
 * 历史类比引擎 — 计算与15城历史案例的信号相似度
 * @param {Object} signals - 当前城市的五信号
 * @returns {{city: Object, similarity: number}} 最相似的历史城市及相似度
 */
function findMatch(signals) {
  let best = null, bestDist = Infinity;
  cities.forEach(c => {
    const d = Math.sqrt(
      Math.pow(c.signals.sv  - signals.sv,  2) +
      Math.pow(c.signals.sb  - signals.sb,  2) +
      Math.pow(c.signals.inf - signals.inf, 2) +
      Math.pow(c.signals.nar - signals.nar, 2) +
      Math.pow(c.signals.sp  - signals.sp,  2)
    );
    if (d < bestDist) { bestDist = d; best = c; }
  });
  const sim = Math.max(0, Math.round((1 - bestDist / (100 * Math.sqrt(5))) * 100));
  return { city: best, similarity: sim };
}

/**
 * 信号生成器 — 基于城市名哈希生成确定性五信号分数
 * 未来可替换为调用真实大模型 API
 * @param {string} name - 城市名
 * @returns {Object} {sv, sb, inf, nar, sp} 各维度 0-100
 */
function generateSignals(name) {
  const h = hashCity(name);
  return {
    sv:  35 + (h % 60),
    sb:  30 + ((h >> 3) % 60),
    inf: 25 + ((h >> 6) % 55),
    nar: 30 + ((h >> 9) % 60),
    sp:  20 + ((h >> 12) % 55)
  };
}

/**
 * 叙事分析报告生成器 — 生成结构化的 AI 分析文本
 * @param {string} name - 城市名
 * @param {Object} sig - 五信号
 * @param {number} score - 综合得分
 * @param {Object} match - 历史类比结果
 * @returns {string} 多段分析报告
 */
function generateNarrative(name, sig, score, match) {
  const attrs = cityAttributes[name] || [];
  const parts = [];

  // 综合评分评估
  if (score >= 80) {
    parts.push(`📊 ${name}当前五信号综合得分 ${score} 分，已接近历史爆火城市水平。多个维度信号共振，建议立即启动重点监测。`);
  } else if (score >= 65) {
    parts.push(`📊 ${name}当前五信号综合得分 ${score} 分，已出现萌芽期特征。部分信号开始异动，建议持续关注。`);
  } else if (score >= 50) {
    parts.push(`📊 ${name}当前五信号综合得分 ${score} 分，信号偏弱但有个别维度值得关注。暂不建议列入重点监测名单。`);
  } else {
    parts.push(`📊 ${name}当前五信号综合得分 ${score} 分，各维度信号均在正常范围内，暂无明显爆火迹象。`);
  }

  // 各信号维度分析
  const sigs = [];
  if (sig.sv >= 75) sigs.push(`短视频动量强劲（${sig.sv}分），视频发布量加速度显著高于均值`);
  else if (sig.sv >= 60) sigs.push(`短视频动量中等（${sig.sv}分），视频量有增长但加速度尚不显著`);
  if (sig.sb >= 75) sigs.push(`搜索-预订剪刀差明显（${sig.sb}分），用户"心动但未出发"状态突出，预测黄金窗口已开启`);
  else if (sig.sb >= 60) sigs.push(`搜索-预订不对称初步显现（${sig.sb}分），搜索增速开始领先预订量`);
  if (sig.inf >= 70) sigs.push(`基建先行信号突出（${sig.inf}分），检测到交通/酒店供给端异常增长`);
  if (sig.nar >= 75) sigs.push(`叙事钩子潜力较高（${sig.nar}分），存在可一句话概括的记忆点`);
  else if (sig.nar >= 60) sigs.push(`叙事钩子尚在形成中（${sig.nar}分），有潜在传播点但尚未固化`);
  if (sig.sp >= 65) sigs.push(`区域溢出效应显现（${sig.sp}分），周边城市搜索量出现跟涨`);
  if (sigs.length > 0) parts.push(sigs.join('；') + '。');

  // 历史类比
  if (match && match.similarity > 40) {
    parts.push(`🔗 历史类比：${name}当前信号模式与「${match.city.name}」爆发前信号相似度 ${match.similarity}%，属于「${match.city.pattern}」。${match.city.name}的叙事钩子为"${match.city.hook}"。`);
  }

  // 城市标签分析
  if (attrs.length > 0) {
    const attrStr = attrs.slice(0, 4).join('、');
    parts.push(`🏷️ 城市标签：${attrStr}。${attrs.includes("美食") ? "美食属性有利于短视频传播和低门槛体验。" : ""}${attrs.includes("古城") || attrs.includes("古都") || attrs.includes("文化") ? "文化底蕴深厚，适合打造沉浸式体验叙事。" : ""}${attrs.includes("海滨") || attrs.includes("热带") ? "自然景观资源突出，视觉奇观型传播潜力大。" : ""}`);
  }

  // 建议操作
  if (score >= 75) {
    parts.push(`⚡ 建议操作：\n① 将${name}列入重点监测名单\n② 提前准备目的地页面\n③ 评估酒店库存情况\n④ 考虑派人实地踩点`);
  } else if (score >= 60) {
    parts.push(`⚡ 建议操作：\n① 纳入观察名单\n② 周度跟踪信号变化\n③ 准备目的地页面素材`);
  } else {
    parts.push(`⚡ 建议操作：暂不需特别跟进，保持常规监测频率即可。`);
  }

  return parts.join('\n\n');
}

/**
 * 根据信号特征判定爆火模式
 * @param {Object} sig - 五信号
 * @param {number} score - 综合得分
 * @returns {string} 爆火模式类型
 */
function getPatternByScore(sig, score) {
  if (sig.nar >= 85 && sig.sv >= 85) return "美食驱动型";
  if (sig.inf >= 75) return "文化体验型";
  if (sig.nar >= 80) return "话题造梗型";
  if (sig.sv >= 85 && sig.inf < 60) return "人物IP型";
  if (sig.sv >= 85) return "视觉奇观型";
  if (sig.sb >= 80) return "消费打卡型";
  return "文化体验型";
}
