/**
 * Class Protocol : provides general attributes and methods for protocols.
 * Building a new South Protocol means to extend this class, and to surcharge
 * the following methods:
 * - **onScan**: will be called by the engine each time a scanMode is scheduled. it receive the "scanmode" name.
 * so the driver will be able to look at **this.dataSource** that contains all parameters for this
 * dataSource including the points to be queried, the informations to connect to the equipment, etc.... It's up to
 * the driver to decide if additional structure (such as scanGroups for OPCHDA) need to be initialized in the
 * constructor to simplify or optimize the onScan method.
 * - **listen**: A special scanMode can be created for a protocol (for example MQTT). In this configuration, the
 * driver will be able to "listen" for updated values.
 * - **connect**: to allow to establish proper connection to the equipment(optional)
 * - **disconnect**: to allow proper disconnection (optional)
 * In addition, it is possible to use a number of helper functions:
 * - **addValue**: is an **important** mmethod to be used in **onScan** or **Listen**. This will allow to push a value
 * - **addFile**: is the equivalent of addValue but for a file.
 * to the OIBus engine. More details on the Engine class.
 * - **decryptPassword**: to decrypt a password
 * - **logger**: to log an event with different levels (error,warning,info,debug)
 *
 * All other operations (cache, store&forward, communication to North applications) will be
 * handled by the OIBus engine and should not be taken care at the South level.
 *
 */
class ProtocolHandler {
  /**
   * Constructor for Protocol
   * @constructor
   * @param {*} dataSource - The data source
   * @param {Engine} engine - The engine
   * @return {void}
   */
  constructor(dataSource, engine) {
    this.dataSource = dataSource
    this.engine = engine
    this.logger = engine.logger
    this.decryptPassword = this.engine.decryptPassword
  }

  connect() {
    const { dataSourceId, protocol } = this.dataSource
    this.logger.info(`Data source ${dataSourceId} started with protocol ${protocol}`)
  }

  onScan(scanMode) {
    const { dataSourceId } = this.dataSource
    this.logger.error(`Data source ${dataSourceId} should surcharge onScan(${scanMode})`)
  }

  listen() {
    const { dataSourceId } = this.dataSource
    this.logger.error(`Data source ${dataSourceId} should surcharge listen()`)
  }

  disconnect() {
    const { dataSourceId } = this.dataSource
    this.logger.info(`Data source ${dataSourceId} disconnected`)
  }

  /**
   * Add a new Value to the Engine.
   * @param {object} value - The new value
   * @param {string} value.pointId - The ID of the point
   * @param {string} value.data - The value of the point
   * @param {number} value.timestamp - The timestamp
   * @param {boolean} urgent - Whether to disable grouping
   * @return {void}
   */
  addValue({ pointId, data, timestamp }, urgent) {
    this.engine.addValue(this.dataSource.dataSourceId, { pointId, data, timestamp }, urgent)
  }

  /**
   * Add a new File to the Engine.
   * @param {string} filePath - The path to the File
   * @return {void}
   */
  addFile(filePath) {
    this.engine.addFile(this.dataSource.dataSourceId, filePath, this.preserveFiles)
  }
}

module.exports = ProtocolHandler
