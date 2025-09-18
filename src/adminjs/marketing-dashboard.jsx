// src/adminjs/marketing-dashboard.jsx
import React, { useEffect, useRef, useState } from 'react'
import Chart from 'chart.js/auto'

/* ================= UI ================= */
const UI = {
  pageBg: 'linear-gradient(135deg,#0b1e34,#111a3b 50%,#151335)',
  cardBg: 'rgba(15,27,54,0.75)',
  cardBorder: '3px solid rgba(255,255,255,0.06)',
  cardShadow: '0 10px 30px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
  title: '#e3e8ff',
  sub: '#98a2c3',
  kpi: '#ffffff',
  a1: '#29b6f6', a2: '#7c4dff', a3: '#ff6e40', a4: '#2fd08f',
  gap: 16,
}

/* ================= Currency (USD/QAR/EGP) ================= */
const FX = { USD: 1, QAR: 3.64, EGP: 48 } // عدّلي أسعار الصرف إذا لزم
const fxConvert = (n, cur) => Number(n || 0) * (FX[cur] ?? 1)
const fxShort = (n, cur) => {
  const v = fxConvert(n, cur)
  if (v >= 1_000_000) return (v/1_000_000).toFixed(1) + 'M ' + cur
  if (v >= 1_000)     return (v/1_000).toFixed(1) + 'K ' + cur
  return Math.round(v).toLocaleString() + ' ' + cur
}
const fxMoney = (n, cur) =>
  new Intl.NumberFormat('en', { style:'currency', currency:cur, maximumFractionDigits:2 })
    .format(fxConvert(n, cur))

/* ================= Helpers ================= */
const kFmt = (n) =>
  n == null ? '—'
            : n >= 1_000_000 ? (n/1_000_000).toFixed(1)+'M'
            : n >= 1_000     ? (n/1_000).toFixed(1)+'K'
            : String(Math.round(n*100)/100)

/* ================= Components ================= */
const Kpi = ({ label, value, color = UI.a1 }) => (
  <div style={{ background:UI.cardBg, border:UI.cardBorder, boxShadow:UI.cardShadow, borderRadius:18, padding:20 }}>
    <div style={{color:UI.kpi, fontSize:16, fontWeight:700, letterSpacing:.2}}>{label}</div>
    <div style={{display:'flex', alignItems:'baseline', gap:10, marginTop:6}}>
      <div style={{color:UI.kpi, fontWeight:900, fontSize:32}}>{value}</div>
      <span style={{width:10,height:10,borderRadius:3, background:color, display:'inline-block'}}/>
    </div>
  </div>
)

const Gauge = ({ pct=0, color=UI.a2 }) => {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const ctx = el.getContext('2d')
    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: { labels:['Progress',''], datasets: [{ data:[pct, 100 - pct], cutout:'75%', borderWidth:0, backgroundColor:[color, 'rgba(255,255,255,0.08)'] }] },
      options: { plugins:{legend:{display:false}}, rotation:-90, circumference:180, responsive:true, maintainAspectRatio:false }
    })
    return () => chart.destroy()
  }, [pct, color])
  return <div style={{height:80}}><canvas ref={ref}/></div>
}

/* ================= Chart helpers ================= */
const useBar = (ref, labels, values, label, color) => {
  useEffect(() => {
    const el = ref.current; if (!el) return
    const ctx = el.getContext('2d')
    const chart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label, data: values, backgroundColor: color }] },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{labels:{color:UI.sub, font:{size:13}}} },
        scales:{
          x:{ ticks:{ color:UI.sub, font:{size:12} }, grid:{ color:'rgba(255,255,255,0.06)'} },
          y:{ ticks:{ color:UI.sub, font:{size:12} }, grid:{ color:'rgba(255,255,255,0.06)'} },
        }
      }
    })
    return () => chart.destroy()
  }, [ref, labels, values, label, color])
}

function drawPie(ref, chartRef, labels, values, palette=['#29b6f6','#7c4dff','#ff6e40','#26c6da','#ab47bc','#ffd54f','#66bb6a','#42a5f5']) {
  const el = ref.current; if (!el) return
  const ctx = el.getContext('2d')
  if (chartRef.current) chartRef.current.destroy()
  chartRef.current = new Chart(ctx, {
    type:'pie',
    data:{ labels, datasets:[{ data: values, backgroundColor: labels.map((_,i)=>palette[i%palette.length]) }]},
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{ legend:{ position:'bottom', labels:{ color: UI.sub, font:{ size:13 } } } }
    }
  })
}

/* ================= Page ================= */
export default function MarketingDashboard(){
  const [days, setDays] = useState(30)
  const [countryPlatform, setCountryPlatform] = useState('Facebook')
  const [countryLimit, setCountryLimit]       = useState(5)
  const [currency, setCurrency]               = useState('USD')   // ← NEW

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fbRef = useRef(null), igRef = useRef(null), tkRef = useRef(null)
  const pieCountryRef = useRef(null), pieOSRef = useRef(null), pieChannelRef = useRef(null)
  const pieCountryChart = useRef(null), pieOSChart = useRef(null), pieChannelChart = useRef(null)

  useEffect(() => {
    let cancel = false
    setLoading(true)
    const qs = new URLSearchParams({
      days: String(days),
      countryPlatform,
      countryLimit: String(countryLimit),
      // currency يُمرَّر احتياطيًا لو حبيتي تعملي تحويل من السيرفر لاحقًا
      currency
    })
    fetch(`/admin/api/marketing/overview?${qs}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error('bad status')))
      .then(j => { if(!cancel) setData(j?.data || null) })
      .catch(() => { if(!cancel) setData(null) })
      .finally(() => { if(!cancel) setLoading(false) })
    return () => { cancel = true }
  }, [days, countryPlatform, countryLimit, currency])

  // Bars — بدون كلمة “Bar Chart” في العناوين
  useBar(fbRef, data?.bars?.fb?.labels || [], data?.bars?.fb?.values || [], 'Spent FB', UI.a1)
  useBar(igRef, data?.bars?.ig?.labels || [], data?.bars?.ig?.values || [], 'Spent Instagram', UI.a3)
  useBar(tkRef, data?.bars?.tiktok?.labels || [], data?.bars?.tiktok?.values || [], 'Spent TikTok', UI.a2)

  // Pies
  const pies = data?.pies || { byCountry:{labels:[],values:[]}, byOS:{labels:[],values:[]}, byChannel:{labels:[],values:[]} }
  useEffect(() => {
    drawPie(pieCountryRef, pieCountryChart, pies.byCountry.labels || [], pies.byCountry.values || [])
    drawPie(pieOSRef,      pieOSChart,      pies.byOS.labels      || ['Android','iOS'], pies.byOS.values || [60,40])
    drawPie(pieChannelRef, pieChannelChart, pies.byChannel.labels || [], pies.byChannel.values || [])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(pies)])

  const kpis = data?.kpis || {}
  const subs = Math.round(kpis.subscriptionsPct || 0)

  return (
    <div style={{ padding:24, background:UI.pageBg, minHeight:'calc(100vh - 64px)' }}>
      {/* ===== Header + Filters ===== */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
        <div style={{ color:UI.title, fontSize:22, fontWeight:800 }}>
          Marketing Performance Dashboard
        </div>

        <div style={{ marginLeft:'auto', display:'flex', gap:16 }}>
          {/* Channel */}
          <div style={{ display:'grid', gap:4 }}>
            <div style={{ color:UI.sub, fontSize:12, fontWeight:700 }}>Channel</div>
            <select
              value={countryPlatform}
              onChange={(e)=>setCountryPlatform(e.target.value)}
              style={{ background:'#0f2740', color:'#e3e8ff', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'6px 10px' }}
            >
              <option value="Facebook">Facebook</option>
              <option value="Instagram">Instagram</option>
            </select>
          </div>

          {/* Top Countries */}
          <div style={{ display:'grid', gap:4 }}>
            <div style={{ color:UI.sub, fontSize:12, fontWeight:700 }}>Top Countries</div>
            <select
              value={countryLimit}
              onChange={(e)=>setCountryLimit(Number(e.target.value))}
              style={{ background:'#0f2740', color:'#e3e8ff', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'6px 10px' }}
            >
              {[3,5,7,10].map(n => <option key={n} value={n}>Top {n}</option>)}
            </select>
          </div>

          {/* Range */}
          <div style={{ display:'grid', gap:4 }}>
            <div style={{ color:UI.sub, fontSize:12, fontWeight:700 }}>Range</div>
            <select
              value={days}
              onChange={(e)=>setDays(Number(e.target.value))}
              style={{ background:'#0f2740', color:'#e3e8ff', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'6px 10px' }}
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last 365 days</option>
            </select>
          </div>

          {/* Currency */}
          <div style={{ display:'grid', gap:4 }}>
            <div style={{ color:UI.sub, fontSize:12, fontWeight:700 }}>Currency</div>
            <select
              value={currency}
              onChange={(e)=>setCurrency(e.target.value)}
              style={{ background:'#0f2740', color:'#e3e8ff', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'6px 10px' }}
            >
              <option value="USD">USD</option>
              <option value="QAR">QAR</option>
              <option value="EGP">EGP</option>
            </select>
          </div>
        </div>
      </div>

      {/* ===== KPIs ===== */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:UI.gap, marginBottom:16 }}>
        <Kpi
          label="Total Spent"
          value={loading ? 'Loading…' : fxShort(kpis.totalSpent, currency)}
          color={UI.a1}
        />
        <Kpi
          label="CPI"
          value={loading ? 'Loading…' : fxMoney(kpis.cpi ?? 0, currency)}
          color={UI.a4}
        />
        <Kpi
          label="Installed Audience (All Countries)"
          value={loading ? 'Loading…' : kFmt(kpis.installs)}
          color={UI.a3}
        />
        <div style={{ background:UI.cardBg, border:UI.cardBorder, boxShadow:UI.cardShadow, borderRadius:18, padding:20, display:'grid', gridTemplateColumns:'110px 1fr', alignItems:'center', gap:12 }}>
          <Gauge pct={Math.round(kpis.subscriptionsPct || 0)}/>
          <div style={{display:'flex', flexDirection:'column'}}>
            <div style={{color:UI.kpi, fontSize:16, fontWeight:700, marginBottom:8}}>Subscriptions</div>
            <div style={{color:UI.kpi, fontWeight:900, fontSize:30}}>{Math.round(kpis.subscriptionsPct || 0)}%</div>
          </div>
        </div>
      </div>

      {/* ===== Bars ===== */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:UI.gap }}>
        <div style={{ background:UI.cardBg, border:UI.cardBorder, boxShadow:UI.cardShadow, borderRadius:18, padding:18, minHeight:260 }}>
          <div style={{ color:UI.title, fontWeight:800, fontSize:18, marginBottom:8 }}>Spent FB</div>
          <div style={{height:210}}><canvas ref={fbRef}/></div>
        </div>
        <div style={{ background:UI.cardBg, border:UI.cardBorder, boxShadow:UI.cardShadow, borderRadius:18, padding:18, minHeight:260 }}>
          <div style={{ color:UI.title, fontWeight:800, fontSize:18, marginBottom:8 }}>Spent Instagram</div>
          <div style={{height:210}}><canvas ref={igRef}/></div>
        </div>
        <div style={{ background:UI.cardBg, border:UI.cardBorder, boxShadow:UI.cardShadow, borderRadius:18, padding:18, minHeight:260 }}>
          <div style={{ color:UI.title, fontWeight:800, fontSize:18, marginBottom:8 }}>Spent TikTok</div>
          <div style={{height:210}}><canvas ref={tkRef}/></div>
        </div>
      </div>

      {/* ===== Pies ===== */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:UI.gap, marginTop:16 }}>
        <div style={{ background:UI.cardBg, border:UI.cardBorder, boxShadow:UI.cardShadow, borderRadius:18, padding:18, minHeight:280 }}>
          <div style={{ color:UI.title, fontWeight:800, fontSize:18, marginBottom:8 }}>By Country — Slice</div>
          <div style={{height:220}}><canvas ref={pieCountryRef}/></div>
        </div>
        <div style={{ background:UI.cardBg, border:UI.cardBorder, boxShadow:UI.cardShadow, borderRadius:18, padding:18, minHeight:280 }}>
          <div style={{ color:UI.title, fontWeight:800, fontSize:18, marginBottom:8 }}>By OS — Pie Chart</div>
          <div style={{height:220}}><canvas ref={pieOSRef}/></div>
        </div>
        <div style={{ background:UI.cardBg, border:UI.cardBorder, boxShadow:UI.cardShadow, borderRadius:18, padding:18, minHeight:280 }}>
          <div style={{ color:UI.title, fontWeight:800, fontSize:18, marginBottom:8 }}>By Channel — Pie</div>
          <div style={{height:220}}><canvas ref={pieChannelRef}/></div>
        </div>
      </div>
    </div>
  )
}
