/**
 * Get the active configuration.
 * @param {Object} ctx - The KOA context
 * @return {void}
 */
const getActiveConfiguration = (ctx) => {
  ctx.ok({ config: ctx.app.engine.configService.getActiveConfiguration() })
}

/**
 * Update Engine.
 * @param {Object} ctx - The KOA context
 * @return {void}
 */
const updateConfig = async (ctx) => {
  try {
    await ctx.app.engine.configService.updateConfig(ctx.request.body)
    ctx.ok()
  } catch (error) {
    ctx.throw(500, 'Unable to update Config')
  }
}

/**
 * Activate the configuration.
 * @param {Object} ctx - The KOA context
 * @return {void}
 */
const activateConfiguration = async (ctx) => {
  try {
    await ctx.app.engine.configService.activateConfiguration()
    // Ask the Master Cluster to reload OIBus Engine
    process.send({ type: 'reload-oibus-engine' })
    ctx.ok('Reloading...')
  } catch (error) {
    ctx.throw(500, 'Unable to activate configuration')
  }
}

export default {
  getActiveConfiguration,
  updateConfig,
  activateConfiguration,
}
