const LABELS = {
  LABEL_0: { name: 'ADHD', color: '#38bdf8' },
  LABEL_1: { name: 'Anxiety', color: '#fb923c' },
  LABEL_2: { name: 'Autism', color: '#facc15' },
  LABEL_3: { name: 'BPD', color: '#f472b6' },
  LABEL_4: { name: 'Depression', color: '#8b5cf6' },
  LABEL_5: { name: 'PTSD', color: '#ef4444' },
  LABEL_6: { name: 'Normal', color: '#22c55e' },
};

document.addEventListener('DOMContentLoaded', async () => {
  bindSelfCheck();
  await refreshDashboard();
});

async function refreshDashboard() {
  try {
    const data = await fetchJson('/api/dashboard');
    renderDashboard(data.dashboard, data.recentEvents);
  } catch (error) {
    console.error('Failed to load dashboard:', error);
  }
}

function bindSelfCheck() {
  document.getElementById('selfCheckButton')?.addEventListener('click', async () => {
    const input = document.getElementById('selfCheckInput');
    const text = input?.value.trim() || '';
    if (!text) return;

    const button = document.getElementById('selfCheckButton');
    if (button) {
      button.disabled = true;
      button.textContent = 'Analyzing...';
    }

    try {
      const data = await fetchJson('/api/self-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          locale: navigator.language,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      renderSelfCheck(data);
      await refreshDashboard();
    } catch (error) {
      console.error('Self-check failed:', error);
      showSupportMessage(
        'The self-check could not be completed right now. Confirm the local backend is running and try again.'
      );
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = 'Analyze text';
      }
    }
  });
}

function renderDashboard(dashboard, recentEvents) {
  setText('#weeklyHighRiskValue', `${Math.round((dashboard.highRiskShare || 0) * 100)}%`);
  setText('#weeklyAvgRiskValue', `${Math.round((dashboard.averageRisk || 0) * 100)}%`);
  setText('#weeklyVolatilityValue', dashboard.volatility?.flagged ? 'Elevated' : 'Stable');
  setText('#trackedTimeValue', `${dashboard.totalMinutes || 0} min`);
  setText('#dashboardInsight', dashboard.insight || 'No data yet.');

  const updatedAt = dashboard.lastUpdated
    ? new Date(dashboard.lastUpdated).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'No data yet';
  setText('#dashboardUpdatedAt', `Updated ${updatedAt}`);

  renderDietBreakdown(dashboard);
  renderTrendList(dashboard.dailySeries || []);
  renderSourceBreakdown(dashboard.sourceBreakdown || {});
  renderRecentEvents(recentEvents || []);
}

function renderDietBreakdown(dashboard) {
  const calm = Math.round((dashboard.calmShare || 0) * 100);
  const guarded = Math.round((dashboard.guardedShare || 0) * 100);
  const intense = Math.round((dashboard.intenseShare || 0) * 100);

  setText('#dietCalmValue', `${calm}%`);
  setText('#dietGuardedValue', `${guarded}%`);
  setText('#dietIntenseValue', `${intense}%`);
  setWidth('#dietCalmBar', calm);
  setWidth('#dietGuardedBar', guarded);
  setWidth('#dietIntenseBar', intense);
}

function renderTrendList(series) {
  const list = document.getElementById('trendList');
  if (!list) return;

  list.innerHTML = '';
  if (!series.length) {
    list.innerHTML = '<div class="trend-item">No trend data yet.</div>';
    return;
  }

  series.forEach((item) => {
    const trend = document.createElement('div');
    trend.className = 'trend-item';
    trend.innerHTML = `
      <div class="trend-meta">
        <strong>${item.label}</strong>
        <span>${Math.round((item.averageRisk || 0) * 100)}% average risk</span>
      </div>
      <div class="trend-track">
        <div class="trend-fill" style="width:${Math.round((item.averageRisk || 0) * 100)}%"></div>
      </div>
    `;
    list.appendChild(trend);
  });
}

function renderSourceBreakdown(sourceBreakdown) {
  const list = document.getElementById('sourceBreakdown');
  if (!list) return;

  const entries = [
    {
      key: 'extension',
      title: 'Extension companion',
      description: `${sourceBreakdown.extension?.count || 0} synced browsing events`,
      averageRisk: sourceBreakdown.extension?.averageRisk || 0,
      className: 'browsing',
    },
    {
      key: 'selfCheck',
      title: 'Manual self-checks',
      description: `${sourceBreakdown.selfCheck?.count || 0} saved text checks`,
      averageRisk: sourceBreakdown.selfCheck?.averageRisk || 0,
      className: 'manual',
    },
  ];

  list.innerHTML = '';
  entries.forEach((entry) => {
    const item = document.createElement('div');
    item.className = 'source-item';
    item.innerHTML = `
      <div class="source-meta">
        <strong>${entry.title}</strong>
        <span>${Math.round(entry.averageRisk * 100)}% avg risk</span>
      </div>
      <p>${entry.description}</p>
      <div class="source-track">
        <div class="source-fill ${entry.className}" style="width:${Math.round(entry.averageRisk * 100)}%"></div>
      </div>
    `;
    list.appendChild(item);
  });
}

function renderRecentEvents(events) {
  const list = document.getElementById('recentEvents');
  if (!list) return;

  list.innerHTML = '';
  if (!events.length) {
    list.innerHTML = '<div class="timeline-item">No synced events yet.</div>';
    return;
  }

  events.forEach((event) => {
    const item = document.createElement('div');
    item.className = `timeline-item ${event.riskScore >= 0.68 ? 'high' : ''}`;
    item.innerHTML = `
      <div class="timeline-meta">
        <strong>${getEventTitle(event)}</strong>
        <span>${new Date(event.timestamp).toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })}</span>
      </div>
      <p>${event.excerpt || event.title || 'Synced wellbeing event'}</p>
    `;
    list.appendChild(item);
  });
}

function renderSelfCheck(data) {
  const result = data.result;
  const metrics = data.metrics;
  const topLabel = LABELS[result.topPrediction?.label]?.name || result.topPrediction?.label || 'Normal';
  const riskText = `${Math.round((result.riskScore || 0) * 100)}% risk score`;

  document.getElementById('selfCheckResult')?.classList.remove('hidden');
  setText('#selfCheckTopLabel', topLabel);
  setText('#selfCheckRiskDetail', riskText);
  setText(
    '#selfCheckSummary',
    `${result.riskBand === 'calm' ? 'Steady' : 'Elevated'} signal with ${topLabel} as the strongest detected label.`
  );
  setText('#selfCheckRiskPill', humanizeBand(result.riskBand));

  const riskPill = document.getElementById('selfCheckRiskPill');
  if (riskPill) {
    riskPill.style.background = result.riskScore >= 0.68 ? 'rgba(225,29,72,0.12)' : 'rgba(15,118,110,0.12)';
    riskPill.style.color = result.riskScore >= 0.68 ? '#9f1239' : '#115e59';
  }

  renderPredictionBars(result.predictions || []);
  renderSupportCard(data.supportResource, result, metrics);
}

function renderPredictionBars(predictions) {
  const container = document.getElementById('predictionBars');
  if (!container) return;
  container.innerHTML = '';

  predictions.forEach((prediction) => {
    const info = LABELS[prediction.label] || { name: prediction.label, color: '#94a3b8' };
    const item = document.createElement('div');
    item.className = 'bar-item';
    item.innerHTML = `
      <div class="bar-topline">
        <span>${info.name}</span>
        <span>${Math.round((prediction.score || 0) * 100)}%</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill ${prediction.score >= 0.68 ? 'risk-high' : ''}" style="width:${Math.round(
          (prediction.score || 0) * 100
        )}%;background:${info.color};"></div>
      </div>
    `;
    container.appendChild(item);
  });
}

function renderSupportCard(resource, result, metrics) {
  if ((result.riskScore || 0) < 0.68 && !result.riskBand.includes('extreme')) {
    showSupportMessage(
      `This result looks ${humanizeBand(result.riskBand).toLowerCase()}. Keep using the dashboard to spot patterns over time.`
    );
    return;
  }

  const card = document.getElementById('supportCard');
  if (!card) return;
  card.innerHTML = `
    <h3>${resource.name}</h3>
    <p>
      This text scored ${Math.round((result.riskScore || 0) * 100)}% risk with
      ${LABELS[metrics.dominantLabel]?.name || 'a high-intensity signal'} as the dominant label.
    </p>
    <div class="hero-actions">
      <a class="button button-primary" href="${resource.primaryHref}">${resource.primaryLabel}</a>
      <a class="button button-secondary" href="${resource.secondaryHref}" target="_blank" rel="noreferrer">${resource.secondaryLabel}</a>
    </div>
    <p class="helper-text">${resource.helperText} Try one grounding cycle: 4 seconds in, 4 hold, 6 out.</p>
  `;
}

function showSupportMessage(message) {
  const card = document.getElementById('supportCard');
  if (!card) return;
  card.innerHTML = `<p>${message}</p>`;
}

function getEventTitle(event) {
  if (event.kind === 'self_check') return 'Manual self-check';
  return event.title || 'Browser companion event';
}

function humanizeBand(band) {
  if (band === 'extreme') return 'Acute';
  if (band === 'high') return 'High';
  if (band === 'guarded') return 'Watchful';
  return 'Steady';
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const data = await response.json();
      message = data.error || message;
    } catch {
      // Ignore JSON parsing issues here.
    }
    throw new Error(message);
  }
  return response.json();
}

function setText(selector, value) {
  const target = document.querySelector(selector);
  if (target) target.textContent = value;
}

function setWidth(selector, value) {
  const target = document.querySelector(selector);
  if (target) target.style.width = `${value}%`;
}
