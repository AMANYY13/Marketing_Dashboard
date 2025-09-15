// src/adminjs/overview.api.js
import dayjs from 'dayjs'

/** مرشّحات مرنة لأكثر أسماء الحقول شيوعًا حسب سكيمتك */
const CANDIDATES = {
  // ===== البارات (موجودة عندك سابقًا) =====
  fbBars: [
    { model: 'facebook_insights',  date: 'Report__Start_date', field: 'Performance__Impressions' },
    { model: 'facebook_insights',  date: 'Report__Date',       field: 'Performance__Reach' },
  ],
  igBars: [
    { model: 'instagram_insights',  date: 'Report__Start_date', field: 'Engagement__Followers' },
    { model: 'instagram_insights',  date: 'Report__Start_date', field: 'Performance__Reach' },
    { model: 'instagram_followers', date: 'By_Day',             field: 'Followers' }, // احتياطي لو جدول followers فقط
  ],
  installs: [
    { model: 'installed_audience',  date: 'date', field: 'installed_audience__all_countries' },
  ],
  igViews: [
    { model:'instagram_insights',   date:'Report__Start_date', field:'Engagement__Views' },
  ],
  igReach: [
    { model:'instagram_insights',   date:'Report__Start_date', field:'Performance__Reach' },
  ],

  // ===== الصف الثالث: Pies =====
  // By Country
  countryFB: { model:'facebook_demographics',  country:'country', value:'percent' },
  countryIG: { model:'instagram_demographics', country:'country', value:'percent' },

  // By OS (جرّب device_acquisition لو فيه Android/iOS، وإلا بنعطي fallback)
  os: [
    { model:'device_acquisition', android:'android',                       ios:'ios' },
    { model:'device_acquisition', android:'device_acquisition__android',   ios:'device_acquisition__ios' },
  ],

  // By Channel (تجميعة من جداولك الشائعة)
  channels: [
    // Facebook views من جدول السوشيال (لو موجود)
    { key:'Facebook',  model:'atfalna_social_media',  date:'date',  field:'fb_views' },
    // Instagram views من ig_data (لو موجود)
    { key:'Instagram', model:'ig_data',               date:'date',  field:'ig_views' },
    // TikTok views من tiktok_insights (لو موجود)
    { key:'TikTok',    model:'tiktok_insights',       date:'By_Day', field:'Views' },
  ],
}

/* ========== أدوات مساعدة عامة ========== */
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
    } catch { /* جرّب التالي */ }
  }
  return { ok:false, rows:[], date:null, field:null, model:null }
}

const sumAllTime = async (prisma, candidates) => {
  const c = candidates[0]
  const m = prisma[c.model]
  if (!m?.aggregate) return 0
  try {
    const agg = await m.aggregate({ _sum: { [c.field]: true } })
    return Number(agg?._sum?.[c.field] ?? 0)
  } catch { return 0 }
}

const sumRows = (rows, key) => rows.reduce((a,r)=>a+Number(r?._sum?.[key] ?? 0),0)

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

// TikTok dummy
const dummyBars = (days) => {
  const start = dayjs().subtract(days,'day').startOf('day')
  const labels=[], values=[]
  for (let i=0;i<days;i++){
    labels.push(start.add(i,'day').format('DD'))
    values.push(Math.round(50 + (i*7 % 80) + (i%3===0?35:0)))
  }
  return { labels, values }
}

/* ========== Pies Helpers ========== */
async function pieTopCountries(prisma, platform='Facebook', limit=5) {
  const cfg = platform.toLowerCase().startsWith('f') ? CANDIDATES.countryFB : CANDIDATES.countryIG
  const m = prisma[cfg.model]
  if (!m?.groupBy) return { labels:[], values:[] }

  try {
    const rows = await m.groupBy({
      by: [cfg.country],
      _sum: { [cfg.value]: true },
      orderBy: { _sum: { [cfg.value]: 'desc' } },
      take: Number(limit) || 5,
    })
    return {
      labels: rows.map(r => r[cfg.country]),
      values: rows.map(r => Number(r?._sum?.[cfg.value] ?? 0)),
    }
  } catch {
    return { labels:[], values:[] }
  }
}

async function pieOS(prisma, since) {
  // جرّب تجميعة Android/iOS من device_acquisition (اسماء أعمدة محتملة)
  for (const cfg of CANDIDATES.os) {
    const m = prisma[cfg.model]
    if (!m?.aggregate) continue
    try {
      const [a, i] = await Promise.all([
        m.aggregate({ where:{ [cfg.android]: { not: null } }, _sum:{ [cfg.android]: true } }),
        m.aggregate({ where:{ [cfg.ios]:     { not: null } }, _sum:{ [cfg.ios]:     true } }),
      ])
      const android = Number(a?._sum?.[cfg.android] ?? 0)
      const ios     = Number(i?._sum?.[cfg.ios] ?? 0)
      if (android || ios) {
        return { labels:['Android','iOS'], values:[android, ios] }
      }
    } catch {/* جرّب التالي */}
  }
  // Fallback افتراضي
  return { labels:['Android','iOS'], values:[60, 40] }
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
    } catch { /* تجاهل الجدول/العمود غير الموجود */ }
  }
  if (!out.length) return { labels:['Facebook','Instagram','TikTok'], values:[1,1,1] }
  return { labels: out.map(x=>x.key), values: out.map(x=>x.value) }
}

/* ========== Route ========== */
export const registerMarketingOverviewApi = (app, prisma) => {
  app.get('/admin/api/marketing/overview', async (req, res) => {
    const days  = Number(req.query.days || 30)
    const since = dayjs().subtract(days,'day').startOf('day').toDate()

    const countryPlatform = String(req.query.countryPlatform || 'Facebook')
    const countryLimit    = Number(req.query.countryLimit || 5)

    // ===== bars (كما سبق) =====
    let fb = await trySumDaily(prisma, CANDIDATES.fbBars, since)
    if (!fb.rows.length) fb = await trySumDaily(prisma, CANDIDATES.fbBars, dayjs().subtract(365,'day').toDate())

    let ig = await trySumDaily(prisma, CANDIDATES.igBars, since)
    if (!ig.rows.length) ig = await trySumDaily(prisma, CANDIDATES.igBars, dayjs().subtract(365,'day').toDate())

    const fbBar = fb.rows.length ? toBars(fb.rows, fb.date, fb.field) : { labels:[], values:[] }
    const igBar = ig.rows.length ? toBars(ig.rows, ig.date, ig.field) : { labels:[], values:[] }
    const tkBar = dummyBars(days)

    // Installed Audience (لتكميل CPI لاحقًا)
    let inst = await trySumDaily(prisma, CANDIDATES.installs, since)
    let installsTotal = inst.rows.length ? sumRows(inst.rows, inst.field) : 0
    if (!installsTotal) installsTotal = await sumAllTime(prisma, CANDIDATES.installs)

    // Subscriptions = Views / Reach
    let igV = await trySumDaily(prisma, CANDIDATES.igViews, since)
    let igR = await trySumDaily(prisma, CANDIDATES.igReach, since)
    let igViewsTotal = igV.rows.length ? sumRows(igV.rows, igV.field) : 0
    let igReachTotal = igR.rows.length ? sumRows(igR.rows, igR.field) : 0
    if (!igViewsTotal) igViewsTotal = await sumAllTime(prisma, CANDIDATES.igViews)
    if (!igReachTotal) igReachTotal = await sumAllTime(prisma, CANDIDATES.igReach)
    const subscriptionsPct = igReachTotal>0 ? Math.min(100, (igViewsTotal/igReachTotal)*100) : 0

    // totalSpent proxy
    const totalSpent = [...fbBar.values, ...igBar.values, ...tkBar.values]
      .reduce((a,v)=>a+Number(v||0),0)
    const cpi = installsTotal>0 ? totalSpent/installsTotal : 0

    // ===== pies (الصف الثالث) =====
    const [byCountry, byOS, byChannel] = await Promise.all([
      pieTopCountries(prisma, countryPlatform, countryLimit),
      pieOS(prisma, since),
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
  })
}
