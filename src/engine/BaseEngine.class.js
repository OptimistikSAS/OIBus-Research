const path = require('node:path')

const VERSION = require('../../package.json').version
// the generic class need to be imported to be used by extensions
global.NorthHandler = require('../north/NorthHandler.class')
global.SouthHandler = require('../south/SouthHandler.class')
// BaseEngine classes
const Logger = require('./logger/Logger.class')
const { createRequestService } = require('../services/request')
const StatusService = require('../services/status.service.class')

/**
 * Abstract class used to manage North and South connectors
 * @class BaseEngine
 */
class BaseEngine {
  /**
   * Constructor for BaseEngine
   * @constructor
   * @param {ConfigService} configService - The config service
   * @param {EncryptionService} encryptionService - The encryption service
   * @param {String} cacheFolder - The base cache folder used by the engine and its connectors
   * @return {void}
   */
  constructor(configService, encryptionService, cacheFolder) {
    this.version = VERSION
    this.cacheFolder = path.resolve(cacheFolder)

    this.installedNorthConnectors = apiList
    this.installedSouthConnectors = protocolList

    this.configService = configService
    this.encryptionService = encryptionService

    // Variable initialized in initEngineServices
    this.statusService = null
    this.logger = null
    this.requestService = null
    this.northSchemas = {}
    this.southSchemas = {}
    this.northModules = {}
    this.southModules = {}
  }

  /**
   * Method used to init async services (like logger when loki is used with Bearer token auth)
   * @param {Object} engineConfig - the config retrieved from the file
   * @param {String} loggerScope - the scope used in the logger (for example 'OIBusEngine')
   * @returns {Promise<void>} - The result promise
   */
  async initEngineServices(engineConfig, loggerScope) {
    this.statusService = new StatusService()
    // Configure the logger
    this.logger = new Logger(loggerScope)
    this.logger.setEncryptionService(this.encryptionService)
    await this.logger.changeParameters(engineConfig, {})
    // load north modules
    await Promise.all(engineConfig.northList.map(async (name) => {
      try {
        const extension = await import(`../north/${name}/${name}.class.js`)
        this.northModules[name] = extension.default
        this.northSchemas[name] = this.northModules[name].schema
        this.logger.debug(`North ${name} is added`)
      } catch (error) {
        this.logger.error(`North ${name} can't be loaded ${error}`)
      }
    }))
    // load south modules
    await Promise.all(engineConfig.southList.map(async (name) => {
      try {
        const extension = await import(`../south/${name}/${name}.class.js`)
        this.southModules[name] = extension.default
        this.southSchemas[name] = this.southModules[name].schema
        this.logger.debug(`South ${name} is added`)
      } catch (error) {
        this.logger.error(`South ${name} can't be loaded ${error}`)
      }
    }))

    // Buffer delay in ms: when a South connector generates a lot of values at the same time, it may be better to accumulate them
    // in a buffer before sending them to the engine
    // Max buffer: if the buffer reaches this length, it will be sent to the engine immediately
    // these parameters could be settings from OIBus UI
    this.bufferMax = engineConfig.caching.bufferMax
    this.bufferTimeoutInterval = engineConfig.caching.bufferTimeoutInterval

    // Buffer delay in ms: when a South connector generates a lot of values at the same time, it may be better to accumulate them
    // in a buffer before sending them to the engine
    // Max buffer: if the buffer reaches this length, it will be sent to the engine immediately
    // these parameters could be settings from OIBus UI
    this.bufferMax = engineConfig.caching.bufferMax
    this.bufferTimeoutInterval = engineConfig.caching.bufferTimeoutInterval

    // Request service
    this.requestService = createRequestService(this)
  }

  /**
   * Add new values from a South connector to the Engine.
   * The Engine will forward the values to the Cache.
   * @param {String} id - The South connector id
   * @param {Object[]} values - Array of values
   * @returns {Promise<void>} - The result promise
   */
  async addValues(id, values) {
    this.logger.warn(`addValues() should be surcharged. Called with South "${id}" and ${values.length} values.`)
  }

  /**
   * Add a new file from a South connector to the Engine.
   * The Engine will forward the file to the Cache.
   * @param {String} id - The South connector id
   * @param {String} filePath - The path to the file
   * @param {Boolean} preserveFiles - Whether to preserve the file at the original location
   * @returns {Promise<void>} - The result promise
   */
  async addFile(id, filePath, preserveFiles) {
    this.logger.warn(`addFile() should be surcharged. Called with South "${id}", file "${filePath}" and ${preserveFiles}.`)
  }

  /**
   * Creates a new instance for every North and South connectors and initialize them.
   * Creates CronJobs based on the ScanModes and starts them.
   * @param {Boolean} safeMode - Whether to start in safe mode
   * @returns {Promise<void>} - The result promise
   */
  async start(safeMode = false) {
    this.logger.warn(`start() should be surcharged. Called with safe mode ${safeMode}.`)
  }

  /**
   * Gracefully stop every timer, South and North connectors
   * @returns {Promise<void>} - The result promise
   */
  async stop() {
    this.logger.warn('stop() should be surcharged.')
  }

  /**
   * Return the South connector
   * @param {Object} southConfig - The South connector settings
   * @returns {SouthConnector|null} - The South connector
   */
  async reload(timeout) {
    this.logger.warn(`reload() should be surcharged ${timeout}`)
  }

  /**
   * Shutdown OIbus.
   * @param {number} timeout - The delay to wait before restart
   * @returns {void}
   */
  async shutdown(timeout) {
    this.logger.warn(`shutdown() should be surcharged ${timeout}`)
  }

  /**
    * Get OIBus version
    * @returns {string} - The OIBus version
    */
  getVersion() {
    return this.version
  }

  /**
   * Get cache folder
   * @return {string} - The cache folder
   */
  getCacheFolder() {
    this.logger.warn('getCacheFolder() should be surcharged')
  }

  /**
   * Create a new South instance
   *
   * @param {string} protocol - The protocol
   * @param {object} dataSource - The data source
   * @returns {ProtocolHandler|null} - The South
   */
  createSouth(protocol, dataSource) {
    const SouthHandler = protocolList[protocol]
    if (SouthHandler) {
      return new SouthHandler(dataSource, this)
    }
    return null
  }

  /**
   * Return the South class
   *
   * @param {string} api - The api
   * @param {object} application - The application
   * @returns {SouthHandler|null} - The South
   */
  createNorth(api, application) {
    const NorthHandler = this.northModules[api]
    if (NorthHandler) {
      return new NorthHandler(application, this)
    }
    return null
  }
}

module.exports = BaseEngine
