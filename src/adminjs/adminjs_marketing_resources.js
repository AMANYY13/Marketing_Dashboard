import { prisma } from '../db.js'

//Marketing Data 
const marketingModels = [
  'facebook_insights',
  'facebook_demographics',
  'instagram_insights',
  'instagram_followers',
  'instagram_demographics',
  'instagram_ageandgender',
  'tiktok_insights',
  'google_play_ratings',
  'average_rating',
]

// App Data 
const appModels = [
  'installed_base',
  'installed_audience',
  'daily_active_users',
  'monthly_active_users',
  'first_opens',
  'total_no_of_installation',
  'audience_growth_rate',
  'user_loss_rate',
  'device_acquisition',
]

const projectModels = []

// Build a lookup of DMMF models by exact model name (Prisma v6 compatible)
// Prefer Prisma v6 runtime data model if available
const runtimeModels = prisma?._runtimeDataModel?.models ?? null
let modelByName = {}
if (runtimeModels) {
  modelByName = Object.fromEntries(
    Object.entries(runtimeModels).map(([name, m]) => [name, { name, ...m }])
  )
} else {
  // Fallback to older DMMF shapes if present
  const baseDmmf = prisma?._baseDmmf
  const modelMap = baseDmmf?.modelMap ?? Object.fromEntries((baseDmmf?.datamodel?.models ?? []).map((m) => [m.name, m]))
  modelByName = modelMap || {}
}

const navGroup = (name, icon) => (modelName) => ({
  resource: { model: modelByName[modelName], client: prisma },
  options: { navigation: { name, icon } },
})

const onlyExisting = (arr) => arr.filter((m) => {
  const ok = Boolean(modelByName[m])
  if (!ok) console.error('[AdminJS] Missing Prisma model in DMMF for:', m)
  return ok
})

export const resources = [
  ...onlyExisting(marketingModels).map(navGroup('1. Marketing Data', 'BarChart')),
  ...onlyExisting(appModels).map(navGroup('2. App Data', 'Cpu')),
  ...onlyExisting(projectModels).map(navGroup('3. Project Data', 'Folder')),
]
