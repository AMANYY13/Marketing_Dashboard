import dayjs from 'dayjs'
import { DASHBOARD_CFG } from './marketing.config.js'
// helpers
const sumDaily = async (prisma, cfg, field, since) => {
  if (!cfg?.model || !cfg?.date || !field) return []
  const m = prisma[cfg.model]
  if (!m?.groupBy) return []
  try {
    return await m.groupBy({
      by: [cfg.date],
      where: { [cfg.date]: { gte: since } },
      _sum: { [field]: true },
      orderBy: { [cfg.date]: 'asc' },
    })
  } catch { return [] }
}
const sumAll = (rows, key) => rows.reduce((a, r) => a + Number(r?._sum?.[key] ?? 0), 0)
const lastOf = (rows, k) => rows?.length ? Number(rows[rows.length-1]?._sum?.[k] ?? 0) : 0
const firstOf = (rows, k) => rows?.length ? Number(rows[0]?._sum?.[k] ?? 0) : 0
const pctTrend = (first, last) => (first > 0 ? ((last - first) / first) * 100 : 0)

// Pie: by country (followers)
const groupByLabel = async (prisma, cfg) => {
  if (!cfg?.model || !cfg?.label || !cfg?.value) return []
  const m = prisma[cfg.model]
  if (!m?.groupBy) return []
  try {
    return await m.groupBy({
      by: [cfg.label],
      _sum: { [cfg.value]: true },
      orderBy: { _sum: { [cfg.value]: 'desc' } },
      take: 10,
    })
  } catch { return [] }
}

// IG Audience (age_gender): women+men
const getIgAudienceAge = async (prisma) => {
  const m = prisma['instagram_ageandgender']
  if (!m?.groupBy) return []
  try {
    const rows = await m.groupBy({
      by: ['age_gender'],
      _sum: { women: true, men: true },
    })
    return rows
      .map(r => ({
        age: r.age_gender,
        value: Number(r?._sum?.women ?? 0) + Number(r?._sum?.men ?? 0),
      }))
      .sort((a,b)=>{
        const order = ['13-17','18-24','25-34','35-44','45-54','55-64','65+']
        return order.indexOf(a.age) - order.indexOf(b.age)
      })
  } catch { return [] }
}

export const registerMarketingApi = (app, prisma) => {
  app.get('/admin/api/marketing/dashboard', async (req, res) => {
    const days  = Number(req.query.days || DASHBOARD_CFG.daysDefault)
    const since = dayjs().subtract(days, 'day').startOf('day').toDate()
    const { ig, fb, tiktok, installs, byCountry } = DASHBOARD_CFG.models

    // daily series
    const [
      igViewsDaily, fbViewsDaily, tkViewsDaily,
      igReachDaily, fbReachDaily,
      igEngDaily,   fbEngDaily,
      installsDaily
    ] = await Promise.all([
      sumDaily(prisma, ig, ig?.views, since),
      sumDaily(prisma, fb, fb?.views, since),
      sumDaily(prisma, tiktok, tiktok?.views, since),
      sumDaily(prisma, ig, ig?.reach, since),
      sumDaily(prisma, fb, fb?.reach, since),
      sumDaily(prisma, ig, ig?.engagements, since),
      sumDaily(prisma, fb, fb?.engagements, since),
      sumDaily(prisma, installs, installs?.field, since),
    ])

    // KPIs (آخر قيمة + نسبة التغيّر)
    const kpis = {
      igReachNow: lastOf(igReachDaily, ig?.reach),
      igReachTrend: pctTrend(firstOf(igReachDaily, ig?.reach), lastOf(igReachDaily, ig?.reach)),
      igViewsNow: lastOf(igViewsDaily, ig?.views),
      igViewsTrend: pctTrend(firstOf(igViewsDaily, ig?.views), lastOf(igViewsDaily, ig?.views)),
      fbReachNow: lastOf(fbReachDaily, fb?.reach),
      fbReachTrend: pctTrend(firstOf(fbReachDaily, fb?.reach), lastOf(fbReachDaily, fb?.reach)),
    }

    // Engagement Rate = engagements / reach
    const mkRate = (rowsE, rowsR, keyE, keyR) => {
      const map = new Map()
      for (const r of rowsR) map.set(String(r[fb?.date || ig?.date]), Number(r?._sum?.[keyR] ?? 0))
      return rowsE.map((e)=> {
        const dkey = String(e[fb?.date || ig?.date])
        const r = map.get(dkey) || 0
        const eVal = Number(e?._sum?.[keyE] ?? 0)
        return [dkey, r>0 ? (eVal/r)*100 : 0]
      })
    }
    const igEngRateDaily = mkRate(igEngDaily, igReachDaily, ig?.engagements, ig?.reach)
    const fbEngRateDaily = mkRate(fbEngDaily, fbReachDaily, fb?.engagements, fb?.reach)

    const engagement = {
      igRateDaily: igEngRateDaily,
      fbRateDaily: fbEngRateDaily,
      igRateNow: igEngRateDaily.length ? igEngRateDaily[igEngRateDaily.length-1][1] : 0,
      fbRateNow: fbEngRateDaily.length ? fbEngRateDaily[fbEngRateDaily.length-1][1] : 0,
    }

    // Targets (قيميهم من ENV لو بدّك)
    const IG_TARGET = Number(process.env.TARGET_IG_REACH || 0)
    const FB_TARGET = Number(process.env.TARGET_FB_REACH || 0)
    const targets = {
      igReachTarget: IG_TARGET,
      igReachProgressPct: IG_TARGET ? Math.min(100, (kpis.igReachNow/IG_TARGET)*100) : null,
      fbReachTarget: FB_TARGET,
      fbReachProgressPct: FB_TARGET ? Math.min(100, (kpis.fbReachNow/FB_TARGET)*100) : null,
    }

    // إجماليات لأرقام إضافية لو تحتاجي
    const totals = {
      installs: sumAll(installsDaily, installs?.field),
    }

    const [pieCountry, igAge] = await Promise.all([
      groupByLabel(prisma, byCountry),
      getIgAudienceAge(prisma),
    ])

    res.json({
      ok: true,
      data: {
        kpis,
        series: {
          igReach: igReachDaily,
          igViews: igViewsDaily,
          fbReach: fbReachDaily,
          fbViews: fbViewsDaily,
          tkViews: tkViewsDaily,
          installsDaily,
        },
        engagement,
        targets,
        pies: { byCountry: pieCountry },
        audience: { igAge },
        cfg: {
          ig:     { date: ig?.date, views: ig?.views, reach: ig?.reach, engagements: ig?.engagements },
          fb:     { date: fb?.date, views: fb?.views, reach: fb?.reach, engagements: fb?.engagements },
          tiktok: { date: tiktok?.date, views: tiktok?.views },
          installs: { date: installs?.date, field: installs?.field },
        },
      },
    })
  })
}
