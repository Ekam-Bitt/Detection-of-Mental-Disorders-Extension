import {
  DASHBOARD_WINDOW_DAYS,
  DISTRESS_WEIGHTS,
  EXTREME_RISK_SCORE,
  HIGH_RISK_KEYWORDS,
  HIGH_RISK_SCORE,
  LABEL_ORDER,
  NORMAL_LABEL,
  PAGE_RABBIT_HOLE_RATIO,
  PAGE_RABBIT_HOLE_THRESHOLD,
  VOLATILITY_AVERAGE_THRESHOLD,
  VOLATILITY_SWING_THRESHOLD,
} from '../config.js';

export function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function roundMetric(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function getPredictionScore(predictions, label) {
  return predictions?.find((prediction) => prediction.label === label)?.score || 0;
}

export function sortPredictions(predictions = []) {
  return [...predictions].sort((a, b) => b.score - a.score);
}

export function getTopPrediction(predictions = []) {
  return sortPredictions(predictions)[0] || null;
}

export function extractHighRiskKeywords(text = '') {
  const normalized = text.toLowerCase();
  return HIGH_RISK_KEYWORDS.filter((keyword) => normalized.includes(keyword));
}

export function calculateRiskScore(predictions = [], text = '') {
  if (!predictions.length) return 0;

  const normalScore = getPredictionScore(predictions, NORMAL_LABEL);
  const weightedDistress = LABEL_ORDER.reduce((total, label) => {
    return (
      total + getPredictionScore(predictions, label) * (DISTRESS_WEIGHTS[label] || 0)
    );
  }, 0);
  const keywordHits = extractHighRiskKeywords(text);
  const keywordBoost = Math.min(keywordHits.length * 0.08, 0.24);

  return roundMetric(
    clamp((1 - normalScore) * 0.55 + weightedDistress * 0.45 + keywordBoost)
  );
}

export function getRiskBand(score) {
  if (score >= EXTREME_RISK_SCORE) return 'extreme';
  if (score >= HIGH_RISK_SCORE) return 'high';
  if (score >= 0.4) return 'guarded';
  return 'calm';
}

export function describeRisk(score) {
  const band = getRiskBand(score);
  if (band === 'extreme') return 'Acute';
  if (band === 'high') return 'High';
  if (band === 'guarded') return 'Watchful';
  return 'Steady';
}

export function analyzeResult(result) {
  const topPrediction = getTopPrediction(result.predictions);
  const riskScore = calculateRiskScore(result.predictions, result.text);

  return {
    ...result,
    topPrediction,
    riskScore,
    riskBand: getRiskBand(riskScore),
  };
}

export function getVolatilityMetrics(scores = []) {
  if (scores.length < 2) {
    return {
      averageSwing: 0,
      maxSwing: 0,
      flagged: false,
      swingCount: 0,
    };
  }

  const swings = [];
  for (let index = 1; index < scores.length; index += 1) {
    swings.push(Math.abs(scores[index] - scores[index - 1]));
  }

  const averageSwing = roundMetric(
    swings.reduce((sum, value) => sum + value, 0) / swings.length
  );
  const maxSwing = roundMetric(Math.max(...swings));

  return {
    averageSwing,
    maxSwing,
    flagged:
      averageSwing >= VOLATILITY_AVERAGE_THRESHOLD ||
      maxSwing >= VOLATILITY_SWING_THRESHOLD,
    swingCount: swings.length,
  };
}

export function summarizeResults(results = []) {
  const analyzedResults = results.map(analyzeResult);
  const summary = LABEL_ORDER.reduce((accumulator, label) => {
    accumulator[label] = 0;
    return accumulator;
  }, {});

  const labelIntensity = LABEL_ORDER.reduce((accumulator, label) => {
    accumulator[label] = 0;
    return accumulator;
  }, {});

  analyzedResults.forEach((result) => {
    if (!result.topPrediction) return;
    summary[result.topPrediction.label] += 1;
    result.predictions.forEach((prediction) => {
      labelIntensity[prediction.label] += prediction.score;
    });
  });

  const riskScores = analyzedResults.map((result) => result.riskScore);
  const averageRisk = analyzedResults.length
    ? roundMetric(
        riskScores.reduce((sum, score) => sum + score, 0) / analyzedResults.length
      )
    : 0;
  const highRiskCount = riskScores.filter((score) => score >= HIGH_RISK_SCORE).length;
  const extremeRiskCount = riskScores.filter(
    (score) => score >= EXTREME_RISK_SCORE
  ).length;
  const toxicRatio = analyzedResults.length
    ? roundMetric(highRiskCount / analyzedResults.length)
    : 0;
  const dominantLabel =
    Object.entries(summary).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const volatility = getVolatilityMetrics(riskScores);

  return {
    results: analyzedResults,
    summary,
    averageRisk,
    highRiskCount,
    extremeRiskCount,
    toxicRatio,
    totalComments: analyzedResults.length,
    dominantLabel,
    labelIntensity: Object.fromEntries(
      Object.entries(labelIntensity).map(([label, value]) => [
        label,
        analyzedResults.length ? roundMetric(value / analyzedResults.length) : 0,
      ])
    ),
    rabbitHoleLikely:
      averageRisk >= PAGE_RABBIT_HOLE_THRESHOLD || toxicRatio >= PAGE_RABBIT_HOLE_RATIO,
    volatility,
  };
}

function getDayKey(date) {
  return date.toISOString().slice(0, 10);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function summarizeHistory(history = [], now = Date.now()) {
  const endDate = new Date(now);
  const startDate = startOfDay(new Date(now));
  startDate.setDate(startDate.getDate() - (DASHBOARD_WINDOW_DAYS - 1));

  const recentHistory = history
    .filter((entry) => new Date(entry.timestamp).getTime() >= startDate.getTime())
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const dailyMap = new Map();
  for (let offset = 0; offset < DASHBOARD_WINDOW_DAYS; offset += 1) {
    const day = new Date(startDate);
    day.setDate(day.getDate() + offset);
    dailyMap.set(getDayKey(day), {
      dayKey: getDayKey(day),
      label: day.toLocaleDateString(undefined, { weekday: 'short' }),
      totalMs: 0,
      highRiskMs: 0,
      averageRiskNumerator: 0,
      sessionCount: 0,
    });
  }

  let totalMs = 0;
  let highRiskMs = 0;
  let calmMs = 0;
  let guardedMs = 0;
  let intenseMs = 0;

  recentHistory.forEach((entry) => {
    const durationMs = Math.max(entry.durationMs || 0, 0);
    const riskScore = entry.riskScore || 0;
    const band = getRiskBand(riskScore);
    const key = getDayKey(new Date(entry.timestamp));
    const bucket = dailyMap.get(key);

    if (bucket) {
      bucket.totalMs += durationMs;
      bucket.highRiskMs += riskScore >= HIGH_RISK_SCORE ? durationMs : 0;
      bucket.averageRiskNumerator += riskScore * Math.max(durationMs, 1);
      bucket.sessionCount += 1;
    }

    totalMs += durationMs;
    highRiskMs += riskScore >= HIGH_RISK_SCORE ? durationMs : 0;
    if (band === 'calm') calmMs += durationMs;
    if (band === 'guarded') guardedMs += durationMs;
    if (band === 'high' || band === 'extreme') intenseMs += durationMs;
  });

  const dailySeries = Array.from(dailyMap.values()).map((bucket) => ({
    ...bucket,
    averageRisk: bucket.totalMs
      ? roundMetric(bucket.averageRiskNumerator / bucket.totalMs)
      : 0,
    highRiskShare: bucket.totalMs ? roundMetric(bucket.highRiskMs / bucket.totalMs) : 0,
    totalMinutes: Math.round(bucket.totalMs / 60000),
  }));

  const trackedHistory = recentHistory.filter((entry) => (entry.durationMs || 0) > 0);
  const riskScores = trackedHistory.map((entry) => entry.riskScore || 0);
  const volatility = getVolatilityMetrics(riskScores);
  const totalMinutes = Math.round(totalMs / 60000);
  const highRiskShare = totalMs ? roundMetric(highRiskMs / totalMs) : 0;

  let insight =
    'Not enough weekly exposure data yet. Browse supported threads to build your dashboard.';
  if (trackedHistory.length && totalMs > 0) {
    if (highRiskShare >= 0.8) {
      insight = `About ${Math.round(
        highRiskShare * 100
      )}% of your tracked browsing time landed on high-risk threads this week.`;
    } else if (volatility.flagged) {
      insight = `Your feed tone swung sharply this week, with a max session-to-session jump of ${Math.round(
        volatility.maxSwing * 100
      )} points.`;
    } else if (highRiskShare >= 0.45) {
      insight = `Nearly ${Math.round(
        highRiskShare * 100
      )}% of your tracked time was spent in high-intensity conversations.`;
    } else {
      insight = 'Your tracked browsing pattern looks relatively steady this week.';
    }
  }

  return {
    recentHistory,
    totalMinutes,
    totalSessions: trackedHistory.length,
    highRiskShare,
    calmShare: totalMs ? roundMetric(calmMs / totalMs) : 0,
    guardedShare: totalMs ? roundMetric(guardedMs / totalMs) : 0,
    intenseShare: totalMs ? roundMetric(intenseMs / totalMs) : 0,
    averageRisk: trackedHistory.length
      ? roundMetric(
          riskScores.reduce((sum, value) => sum + value, 0) / trackedHistory.length
        )
      : 0,
    volatility,
    dailySeries,
    insight,
    lastUpdated: recentHistory.at(-1)?.timestamp || endDate.toISOString(),
  };
}
