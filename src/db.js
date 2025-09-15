import { PrismaClient } from '@prisma/client'

// Instance 
export const prisma = globalThis.__prisma ?? new PrismaClient()
if (!globalThis.__prisma) globalThis.__prisma = prisma
