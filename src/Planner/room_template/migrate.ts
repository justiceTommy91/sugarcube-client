import { migrateV0toV1 } from 'Planner/room_template/migrations/v0-v1'
import type { AnyTemplate, RoomTemplate } from 'Planner/room_template/room_template'

const migrateNoOp = (template: RoomTemplate): RoomTemplate => template

const allMigrations = [
  migrateV0toV1,
  migrateNoOp,
] as const

const getFirstMigrationIdx = (version: string): number => {
  let result = allMigrations.length - 1
  switch(version) {
    case '0.0':
      result = 0
      break
    default:
      break
  }
  return result
}

export const migrateTemplate = (template: AnyTemplate): RoomTemplate => {
  const version = 'version' in template ? template.version : '0.0'
  const firstMigration = getFirstMigrationIdx(version)
  const migrations = allMigrations.slice(firstMigration)
  const result: RoomTemplate = migrations.reduce((resultTemplate, migration) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    migration(resultTemplate as any), template) as RoomTemplate
  return result
}