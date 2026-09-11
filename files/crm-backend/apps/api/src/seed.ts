import bcrypt from 'bcryptjs'
import { SuperAdmin } from './models/SuperAdmin'
import { config } from './config'
import { logger } from './lib/logger'

export async function seedSuperAdmin(): Promise<void> {
  const count = await SuperAdmin.countDocuments()
  if (count > 0) return

  const passwordHash = await bcrypt.hash(config.superAdmin.password, 12)
  await SuperAdmin.create({
    name:         'Super Admin',
    email:        config.superAdmin.email,
    passwordHash,
  })
  logger.info('Super admin seeded', { email: config.superAdmin.email })
}
