export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { startMaintenanceSchedule } = await import('./lib/maintenance')
  startMaintenanceSchedule()
}
