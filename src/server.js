// src/server.js
import 'dotenv/config'
import express from 'express'
import AdminJS, { ComponentLoader } from 'adminjs'
import AdminJSExpress from '@adminjs/express'
import * as AdminJSPrisma from '@adminjs/prisma'
import { PrismaClient } from '@prisma/client'
import path from 'path'
import { fileURLToPath } from 'url'
import { registerMarketingOverviewApi } from './adminjs/overview.api.js'

import { registerMarketingApi } from './adminjs/dashboard.api.js'
import { resources as marketingResources } from './adminjs/adminjs_marketing_resources.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// BigInt → JSON
const jsonReplacer = (key, value) => (typeof value === 'bigint' ? value.toString() : value)

// سجّل الأدابتر
AdminJS.registerAdapter(AdminJSPrisma)

// أنشئ التطبيق
const app = express()
app.set('json replacer', jsonReplacer)
app.use('/static', express.static(path.join(__dirname, '../public')))

// Prisma
const prisma = new PrismaClient()

// حمّل كومبوننت الداشبورد
const loader = new ComponentLoader()
const DashboardComponent = loader.add(
  'MarketingDashboard',
  path.resolve(__dirname, 'adminjs', 'marketing-dashboard.jsx')
)

const admin = new AdminJS({
  rootPath: '/admin',
  resources: marketingResources,
  dashboard: { component: DashboardComponent },
  componentLoader: loader,
  // نكسر الكاش كل تشغيل
  //version: { admin: true, app: `atfalna-${Date.now()}` },
  branding: {
    companyName: 'Atfalna Analytics',
    logo: '/static/logo-atfalna.png',
    withMadeWithLove: false,
  },
})

// سجلي الـ API قبل راوتر الأدمن
registerMarketingApi(app, prisma)

// راوتر الأدمن
const router = AdminJSExpress.buildRouter(admin)
app.use(admin.options.rootPath, router)
registerMarketingOverviewApi(app, prisma)

// Run
const PORT = Number(process.env.PORT || 3000)
const HOST = process.env.HOST || 'localhost'
app.listen(PORT, () => {
  console.log(`AdminJS running at http://${HOST}:${PORT}${admin.options.rootPath}`)
})
