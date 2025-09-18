// src/adminjs/overview.api.js
import dayjs from 'dayjs'

const CANDIDATES = {
  fbBars: [
    { model: 'facebook_insights',  date: 'Report__Start_date', field: 'Performance__Impressions' },
    { model: 'facebook_insights',  date: 'Report__Date',       field: 'Performance__Reach' },
  ],
  igBars: [
    { model: 'instagram_insights',  date: 'Report__Start_date', field: 'Engagement__Followers' },
    { model: 'instagram_insights',  date: 'Report__Start_date', field: 'Performance__Reach' },
    { model: 'instagram_followers', date: 'By_Day',             field: 'Followers' }, // احتياطي
  ],
  installs: [
    { model: 'installed_audience',  date: 'date', field: 'installed_audience__all_countries' },
  ],
  igViews: [{ model: 'instagram_insights',  date: 'Report__Start_date', field: 'Engagement__Views' }],
  igReach: [{ model: 'instagram_insights',  date: 'Report__Start_date', field: 'Performance__Reach' }],

  installsDaily: [
    { model: 'total_no_of_installation', date: 'date', field: 'total_no_of_installation__all_countries' },
    { model: 'first_opens',              date: 'date', field: 'first_opens__all_countries' },
  ],

  channels: [
    { key:'Facebook',  model:'atfalna_social_media',  date:'date',   field:'fb_views' },
    { key:'Instagram', model:'ig_data',               date:'date',   field:'ig_views' },
    { key:'TikTok',    model:'tiktok_insights',       date:'By_Day', field:'Views' },
  ],

  // By OS
  os: [
    { model:'device_acquisition', android:'android',                     ios:'ios' },
    { model:'device_acquisition', android:'device_acquisition__android', ios:'device_acquisition__ios' },
  ],
}

/* ================= Helpers عامة ================= */
const sumRows = (rows, key) => rows.reduce((a,r)=>a+Number(r?._sum?.[key] ?? 0),0)

async function trySumDaily(prisma, candidates, since) {
  for (const c of candidates) {
    const m = prisma[c.model]
    if (!m?.groupBy) continue
    try {
      const rows = await m.groupBy({
        by: [c.date],
        where: { [c.date]: { gte: since } },
        _sum: { [c.field]: true },
        orderBy: { [c.date]: 'asc' },
      })
      return { ok:true, rows, ...c }
    } catch { /* next */ }
  }
  return { ok:false, rows:[], date:null, field:null, model:null }
}

const sumAllTime = async (prisma, candidates) => {
  const c = candidates[0]; const m = prisma[c.model]
  if (!m?.aggregate) return 0
  try {
    const agg = await m.aggregate({ _sum: { [c.field]: true } })
    return Number(agg?._sum?.[c.field] ?? 0)
  } catch { return 0 }
}

const toBars = (rows, dateKey, field) => {
  const labels = rows.map(r => {
    const v = r[dateKey]
    if (v instanceof Date) return dayjs(v).format('DD')
    if (typeof v === 'string') return v
    return dayjs(v).format('DD')
  })
  const values = rows.map(r => Number(r?._sum?.[field] ?? 0))
  return { labels, values }
}

const dummyBars = (days) => {
  const start = dayjs().subtract(days,'day').startOf('day')
  const labels=[], values=[]
  for (let i=0;i<days;i++){
    labels.push(start.add(i,'day').format('DD'))
    values.push(Math.round(50 + (i*7 % 80) + (i%3===0?35:0)))
  }
  return { labels, values }
}

/* ================= Helpers ذكية للـ PIE: كشف أعمدة تلقائيًا ================= */
/**
 * يحاول اكتشاف أسماء أعمدة الدولة والقيمة ديناميكيًا من أول صف
 * - labelKey: أي عمود يحتوي 'country' أو 'Audience__Country'
 * - valueKey: أولوية (percent|percentage|followers|value) ويكون رقم
 */
async function detectCountryColumns(prismaModel) {
  // نجيب أول صف موجود
  const sample = await prismaModel.findFirst({ take: 1 })
  if (!sample) return null

  const keys = Object.keys(sample || {})
  const lower = (s) => s.toLowerCase()

  // ابحث عن عمود البلد
  const labelKey =
    keys.find(k => /audience__country/i.test(k)) ||
    keys.find(k => /country/i.test(k))

  // ابحث عن عمود القيمة (نسبة/متابعين/قيمة)
  const valueCandidates = [
    ...keys.filter(k => /percent(age)?/i.test(k)),
    ...keys.filter(k => /followers/i.test(k)),
    ...keys.filter(k => /value/i.test(k)),
  ]

  let valueKey = null
  for (const k of valueCandidates) {
    const v = Number(sample[k])
    if (Number.isFinite(v)) { valueKey = k; break }
  }

  if (!labelKey || !valueKey) return null
  return { labelKey, valueKey }
}

/** يجمع Top N countries لمنصّة محددة (Facebook | Instagram) */
async function pieTopCountriesSmart(prisma, platform='Facebook', limit=5) {
  const modelName = platform.toLowerCase().startsWith('f')
    ? 'facebook_demographics'
    : 'instagram_demographics'

  const m = prisma[modelName]
  if (!m) return { labels:[], values:[] }

  // حاول اكتشاف الأعمدة تلقائياً
  let detected = null
  try { detected = await detectCountryColumns(m) } catch {}
  if (!detected) {
    // لو فشل الكشف: جرّب أشهر الأسماء صراحةً (بدون تاريخ)
    const fallbacks = platform.toLowerCase().startsWith('f')
      ? [
          { labelKey:'Audience__Country', valueKey:'Engagement__Followers' },
          { labelKey:'country',           valueKey:'percent' },
          { labelKey:'Country',           valueKey:'Percentage' },
        ]
      : [
          { labelKey:'Audience__Country', valueKey:'Engagement__Followers' },
          { labelKey:'country',           valueKey:'percent' },
          { labelKey:'Country',           valueKey:'Percentage' },
        ]
    for (const cfg of fallbacks) {
      try {
        const rows = await m.groupBy({
          by: [cfg.labelKey],
          _sum: { [cfg.valueKey]: true },
          orderBy: { _sum: { [cfg.valueKey]: 'desc' } },
          take: Number(limit) || 5,
        })
        if (rows?.length) {
          return {
            labels: rows.map(r => r[cfg.labelKey]),
            values: rows.map(r => Number(r?._sum?.[cfg.valueKey] ?? 0)),
          }
        }
      } catch {}
    }
    return { labels:[], values:[] }
  }

  // عندنا labelKey/valueKey معلومين — نفذ groupBy
  try {
    const { labelKey, valueKey } = detected
    const rows = await m.groupBy({
      by: [labelKey],
      _sum: { [valueKey]: true },
      orderBy: { _sum: { [valueKey]: 'desc' } },
      take: Number(limit) || 5,
    })
    return {
      labels: rows.map(r => r[labelKey]),
      values: rows.map(r => Number(r?._sum?.[valueKey] ?? 0)),
    }
  } catch {
    return { labels:[], values:[] }
  }
}

async function pieOS(prisma) {
  for (const cfg of CANDIDATES.os) {
    const m = prisma[cfg.model]
    if (!m?.aggregate) continue
    try {
      const [a, i] = await Promise.all([
        m.aggregate({ _sum:{ [cfg.android]: true } }),
        m.aggregate({ _sum:{ [cfg.ios]:     true } }),
      ])
      const android = Number(a?._sum?.[cfg.android] ?? 0)
      const ios     = Number(i?._sum?.[cfg.ios] ?? 0)
      if (android || ios) return { labels:['Android','iOS'], values:[android, ios] }
    } catch {}
  }
  return { labels:['Android','iOS'], values:[60, 40] } // fallback
}

async function pieByChannel(prisma, since) {
  const out = []
  for (const c of CANDIDATES.channels) {
    const m = prisma[c.model]
    if (!m) continue
    try {
      if (m.groupBy) {
        const rows = await m.groupBy({
          by: [c.date],
          where: { [c.date]: { gte: since } },
          _sum: { [c.field]: true },
        })
        const v = sumRows(rows, c.field)
        if (v) out.push({ key:c.key, value:v })
      } else if (m.aggregate) {
        const agg = await m.aggregate({ _sum:{ [c.field]: true } })
        const v = Number(agg?._sum?.[c.field] ?? 0)
        if (v) out.push({ key:c.key, value:v })
      }
    } catch {}
  }
  if (!out.length) return { labels:['Facebook','Instagram','TikTok'], values:[1,1,1] }
  return { labels: out.map(x=>x.key), values: out.map(x=>x.value) }
}

/* ================== Route ================== */
export const registerMarketingOverviewApi = (app, prisma) => {
  app.get('/admin/api/marketing/overview', async (req, res) => {
    const days  = Number(req.query.days || 30)
    const since = dayjs().subtract(days,'day').startOf('day').toDate()

    const countryPlatform = String(req.query.countryPlatform || 'Facebook') // Facebook | Instagram
    const countryLimit    = Number(req.query.countryLimit || 5)

    try {
      // ===== Bars =====
      let fb = await trySumDaily(prisma, CANDIDATES.fbBars, since)
      if (!fb.rows.length) fb = await trySumDaily(prisma, CANDIDATES.fbBars, dayjs().subtract(365,'day').toDate())

      let ig = await trySumDaily(prisma, CANDIDATES.igBars, since)
      if (!ig.rows.length) ig = await trySumDaily(prisma, CANDIDATES.igBars, dayjs().subtract(365,'day').toDate())

      const fbBar = fb.rows.length ? toBars(fb.rows, fb.date, fb.field) : { labels:[], values:[] }
      const igBar = ig.rows.length ? toBars(ig.rows, ig.date, ig.field) : { labels:[], values:[] }
      const tkBar = dummyBars(days)

      // ===== KPIs =====
      // Installed Audience (تراكمي/خلال الفترة)
      let inst = await trySumDaily(prisma, CANDIDATES.installs, since)
      let installsTotal = inst.rows.length ? sumRows(inst.rows, inst.field) : 0
      if (!installsTotal) installsTotal = await sumAllTime(prisma, CANDIDATES.installs)

      // Views / Reach (Subscriptions%)
      let igV = await trySumDaily(prisma, CANDIDATES.igViews, since)
      let igR = await trySumDaily(prisma, CANDIDATES.igReach, since)
      let igViewsTotal = igV.rows.length ? sumRows(igV.rows, igV.field) : 0
      let igReachTotal = igR.rows.length ? sumRows(igR.rows, igR.field) : 0
      if (!igViewsTotal) igViewsTotal = await sumAllTime(prisma, CANDIDATES.igViews)
      if (!igReachTotal) igReachTotal = await sumAllTime(prisma, CANDIDATES.igReach)
      const subscriptionsPct = igReachTotal>0 ? Math.min(100, (igViewsTotal/igReachTotal)*100) : 0

      // Total Spent (proxy من البارات) + CPI مُحسّن
      const totalSpent = [...fbBar.values, ...igBar.values, ...tkBar.values].reduce((a,v)=>a+Number(v||0),0)

      // تنصيبات الفترة (لو فيه جداول يومية)
      let instDaily = await trySumDaily(prisma, CANDIDATES.installsDaily, since)
      let installsCount = instDaily.rows.length ? sumRows(instDaily.rows, instDaily.field) : 0
      // احتياطي: فرق التراكمي ضمن الفترة
      if (!installsCount && inst.rows.length >= 2) {
        const first = Number(inst.rows[0]?._sum?.[inst.field] ?? 0)
        const last  = Number(inst.rows[inst.rows.length - 1]?._sum?.[inst.field] ?? 0)
        installsCount = Math.max(0, last - first)
      }
      const cpi = installsCount > 0 ? totalSpent / installsCount : 0

      // ===== Pies (صف 3) — ذكي للدول =====
      const [byCountry, byOS, byChannel] = await Promise.all([
        pieTopCountriesSmart(prisma, countryPlatform, countryLimit),
        pieOS(prisma),
        pieByChannel(prisma, since),
      ])

      res.json({
        ok:true,
        data:{
          kpis:{ totalSpent, cpi, installs: installsTotal, subscriptionsPct },
          bars:{ fb: fbBar, ig: igBar, tiktok: tkBar },
          pies:{ byCountry, byOS, byChannel },
        }
      })
    } catch (e) {
      console.error('overview error', e)
      res.status(500).json({ ok:false, error:'server_error' })
    }
  })
}
