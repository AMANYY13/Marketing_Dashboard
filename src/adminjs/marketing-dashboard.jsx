// src/adminjs/marketing-dashboard.jsx
import React, { useEffect, useRef, useState } from 'react'
import Chart from 'chart.js/auto'

/* ===== هوية/ألوان ===== */
const UI = {
  pageBg: 'linear-gradient(135deg,#0b1e34,#111a3b 50%,#151335)',
  cardBg: 'rgba(15,27,54,0.75)',
  cardBorder: '1px solid rgba(255,255,255,0.06)',
  cardShadow: '0 10px 30px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
  title: '#e3e8ff',
  sub: '#98a2c3',
  kpi: '#ffffff',
  a1: '#29b6f6', // Blue
  a2: '#7c4dff', // Purple
  a3: '#ff6e40', // Orange
  a4: '#2fd08f', // Green
  gap: 16,
}

/* ===== تنسيق أرقام K/M ===== */
const kFmt = (n) =>
  n == null
    ? '—'
    : n >= 1_000_000
    ? (n / 1_000_000).toFixed(1) + 'M'
    : n >= 1_000
    ? (n / 1_000).toFixed(1) + 'K'
    : String(Math.round(n * 100) / 100)

/* ===== بطاقة KPI ===== */
const Kpi = ({ label, value, hint, color = UI.a1 }) => (
  <div style={{ background: UI.cardBg, border: UI.cardBorder, boxShadow: UI.cardShadow, borderRadius: 18, padding: 18 }}>
    <div style={{ color: UI.sub, fontSize: 13 }}>{label}</div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <div style={{ color: UI.kpi, fontWeight: 800, fontSize: 26 }}>{value}</div>
      <span style={{ width: 8, height: 8, borderRadius: 3, background: color, display: 'inline-block' }} />
    </div>
    {hint ? <div style={{ color: UI.sub, fontSize: 11, marginTop: 4 }}>{hint}</div> : null}
  </div>
)

/* ===== Gauge نصف دائرة ===== */
const Gauge = ({ pct = 0, color = UI.a2 }) => {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ctx = el.getContext('2d')
    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Progress', ''],
        datasets: [{ data: [pct, 100 - pct], cutout: '75%', borderWidth: 0, backgroundColor: [color, 'rgba(255,255,255,0.08)'] }],
      },
      options: { plugins: { legend: { display: false } }, rotation: -90, circumference: 180, responsive: true, maintainAspectRatio: false },
    })
    return () => chart.destroy()
  }, [pct, color])
  return (
    <div style={{ height: 70 }}>
      <canvas ref={ref} />
    </div>
  )
}

/* ===== Hook لِـ Bar ===== */
const useBar = (ref, labels, values, label, color) => {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ctx = el.getContext('2d')
    const chart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label, data: values, backgroundColor: color }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: UI.sub } } },
        scales: {
          x: { ticks: { color: UI.sub }, grid: { color: 'rgba(255,255,255,0.06)' } },
          y: { ticks: { color: UI.sub }, grid: { color: 'rgba(255,255,255,0.06)' } },
        },
      },
    })
    return () => chart.destroy()
  }, [ref, labels, values, label, color])
}

/* ===== دالة رسم Pie عامة (مع تدمير السابق) ===== */
function drawPie(ref, chartRef, labels, values, palette = ['#29b6f6', '#7c4dff', '#ff6e40', '#26c6da', '#ab47bc', '#ffd54f', '#66bb6a', '#42a5f5']) {
  const el = ref.current
  if (!el) return
  const ctx = el.getContext('2d')
  if (chartRef.current) chartRef.current.destroy()
  chartRef.current = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: labels.map((_, i) => palette[i % palette.length]) }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: UI.sub } } },
    },
  })
}

export default function MarketingDashboard() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  // ====== فلاتر pies للـ Country ======
  const [countryPlatform, setCountryPlatform] = useState('Facebook')
  const [countryLimit, setCountryLimit] = useState(5)

  // ====== مراجع الرسوم ======
  const fbRef = useRef(null)
  const igRef = useRef(null)
  const tkRef = useRef(null)

  // Pie refs + instances
  const pieCountryRef = useRef(null)
  const pieOSRef = useRef(null)
  const pieChannelRef = useRef(null)
  const pieCountryChart = useRef(null)
  const pieOSChart = useRef(null)
  const pieChannelChart = useRef(null)

  // ====== جلب البيانات ======
  useEffect(() => {
    let cancel = false
    setLoading(true)

    const qs = new URLSearchParams({
      days: String(days),
      countryPlatform,
      countryLimit: String(countryLimit),
    })

    fetch(`/admin/api/marketing/overview?${qs.toString()}`)
      .then((r) => r.json())
      .then((j) => {
        if (!cancel) setData(j?.data || null)
      })
      .finally(() => {
        if (!cancel) setLoading(false)
      })
    return () => {
      cancel = true
    }
  }, [days, countryPlatform, countryLimit])

  // ====== Bars (صف 2) ======
  useBar(fbRef, data?.bars?.fb?.labels || [], data?.bars?.fb?.values || [], 'Spent FB (Impressions)', UI.a1)
  useBar(igRef, data?.bars?.ig?.labels || [], data?.bars?.ig?.values || [], 'Spent Instagram (Followers)', UI.a3)
  useBar(tkRef, data?.bars?.tiktok?.labels || [], data?.bars?.tiktok?.values || [], 'Spent TikTok (dummy)', UI.a2)

  // ====== Pies (صف 3) ======
  const pies = data?.pies || { byCountry: { labels: [], values: [] }, byOS: { labels: [], values: [] }, byChannel: { labels: [], values: [] } }

  useEffect(() => {
    drawPie(pieCountryRef, pieCountryChart, pies.byCountry.labels || [], pies.byCountry.values || [])
    drawPie(pieOSRef, pieOSChart, pies.byOS.labels || ['Android', 'iOS'], pies.byOS.values || [60, 40])
    drawPie(pieChannelRef, pieChannelChart, pies.byChannel.labels || [], pies.byChannel.values || [])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(pies)])

  // ====== KPIs ======
  const kpis = data?.kpis || {}
  const subs = Math.round(kpis.subscriptionsPct || 0)

  return (
    <div style={{ padding: 24, background: UI.pageBg, minHeight: 'calc(100vh - 64px)' }}>
      {/* العنوان + فلتر الأيام */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ color: UI.title, fontSize: 22, fontWeight: 800 }}>Marketing Overview</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {/* فلاتر Pie Country */}
          <select
            value={countryPlatform}
            onChange={(e) => setCountryPlatform(e.target.value)}
            title="Country Platform"
            style={{ background: '#0f2740', color: '#e3e8ff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 10px' }}
          >
            <option>Facebook</option>
            <option>Instagram</option>
          </select>
          <select
            value={countryLimit}
            onChange={(e) => setCountryLimit(Number(e.target.value))}
            title="Top N Countries"
            style={{ background: '#0f2740', color: '#e3e8ff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 10px' }}
          >
            {[3, 5, 7, 10].map((n) => (
              <option key={n} value={n}>
                Top {n}
              </option>
            ))}
          </select>

          {/* أيام */}
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            style={{ background: '#0f2740', color: '#e3e8ff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 10px' }}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* ====== KPIs (4 Cards) ====== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: UI.gap, marginBottom: 16 }}>
        <Kpi label="Total Spent" value={loading ? 'Loading…' : kFmt(kpis.totalSpent)} hint="Proxy from bars (FB+IG+TikTok)" color={UI.a1} />
        <Kpi label="CPI" value={loading ? 'Loading…' : (kpis.cpi ?? 0).toFixed(2)} hint="Spent / Installs" color={UI.a4} />
        <Kpi label="Installed Audience (All Countries)" value={loading ? 'Loading…' : kFmt(kpis.installs)} hint="Sum over range" color={UI.a3} />
        <div
          style={{
            background: UI.cardBg,
            border: UI.cardBorder,
            boxShadow: UI.cardShadow,
            borderRadius: 18,
            padding: 16,
            display: 'grid',
            gridTemplateColumns: '100px 1fr',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Gauge pct={subs} />
          <div>
            <div style={{ color: UI.sub, fontSize: 16 }}>Subscriptions</div>
            <div style={{ color: UI.kpi, fontWeight: 800, fontSize: 26 }}>{subs}%</div>
            <div style={{ color: UI.sub, fontSize: 11, marginTop: 4 }}>IG Views / IG Reach (est.)</div>
          </div>
        </div>
      </div>

      {/* ====== الصف 2: 3 بارات ====== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: UI.gap }}>
        <div style={{ background: UI.cardBg, border: UI.cardBorder, boxShadow: UI.cardShadow, borderRadius: 18, padding: 16, minHeight: 260 }}>
          <div style={{ color: UI.title, fontWeight: 700, marginBottom: 8 }}>Spent FB — Bar Chart</div>
          <div style={{ height: 200 }}>
            <canvas ref={fbRef} />
          </div>
        </div>

        <div style={{ background: UI.cardBg, border: UI.cardBorder, boxShadow: UI.cardShadow, borderRadius: 18, padding: 16, minHeight: 260 }}>
          <div style={{ color: UI.title, fontWeight: 700, marginBottom: 8 }}>Spent Instagram — Bar Chart</div>
          <div style={{ height: 200 }}>
            <canvas ref={igRef} />
          </div>
        </div>

        <div style={{ background: UI.cardBg, border: UI.cardBorder, boxShadow: UI.cardShadow, borderRadius: 18, padding: 16, minHeight: 260 }}>
          <div style={{ color: UI.title, fontWeight: 700, marginBottom: 8 }}>Spent TikTok — Bar Chart</div>
          <div style={{ height: 200 }}>
            <canvas ref={tkRef} />
          </div>
        </div>
      </div>

      {/* ====== الصف 3: 3 Pie Charts ====== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: UI.gap, marginTop: 16 }}>
        {/* By Country */}
        <div style={{ background: UI.cardBg, border: UI.cardBorder, boxShadow: UI.cardShadow, borderRadius: 18, padding: 16, minHeight: 280 }}>
          <div style={{ color: UI.title, fontWeight: 700, marginBottom: 8 }}>By Country — Slice</div>
          <div style={{ height: 220 }}>
            <canvas ref={pieCountryRef} />
          </div>
        </div>

        {/* By OS */}
        <div style={{ background: UI.cardBg, border: UI.cardBorder, boxShadow: UI.cardShadow, borderRadius: 18, padding: 16, minHeight: 280 }}>
          <div style={{ color: UI.title, fontWeight: 700, marginBottom: 8 }}>By OS — Pie Chart</div>
          <div style={{ height: 220 }}>
            <canvas ref={pieOSRef} />
          </div>
        </div>

        {/* By Channel */}
        <div style={{ background: UI.cardBg, border: UI.cardBorder, boxShadow: UI.cardShadow, borderRadius: 18, padding: 16, minHeight: 280 }}>
          <div style={{ color: UI.title, fontWeight: 700, marginBottom: 8 }}>By Channel — Pie</div>
          <div style={{ height: 220 }}>
            <canvas ref={pieChannelRef} />
          </div>
        </div>
      </div>
    </div>
  )
}
