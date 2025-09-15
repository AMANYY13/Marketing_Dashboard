// مبني على جداولك: instagram_insights / facebook_insights / tiktok_insights / installed_base
export const DASHBOARD_CFG = {
  daysDefault: 30,
  models: {
    ig: {
      model: 'instagram_insights',
      date:  'Report__Start_date',
      spent: null,                   // ما في spent حالياً
      views: 'Engagement__Views',
      reach: 'Performance__Reach',
    },
    fb: {
      model: 'facebook_insights',
      date:  'Report__Date',
      spent: null,
      views: 'Engagement__Page_views',
      reach: 'Performance__Reach',
    },
    tiktok: {
      model: 'tiktok_insights',
      date:  null,                   // ما في تاريخ يومي بالجدول
      spent: null,
      views: 'Impression',           // إن تغيّر الاسم عدّليه
    },
    // مصدر التنصيبات
    installs: {
      model: 'installed_base',       // لو بتفضلي total_no_of_installation غيّريه هنا
      date:  'date',
      field: 'installed_base__all_countries',
    },

    // Pie اختياري حسب الدولة
    byCountry: {
      model: 'instagram_demographics',
      label: 'Audience__Country',
      value: 'Engagement__Followers',
    },
    byOS: null,
    byChannel: null,
  },
}
