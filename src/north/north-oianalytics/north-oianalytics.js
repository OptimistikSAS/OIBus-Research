import NorthConnector from '../north-connector.js'
import { httpSend, addAuthenticationToHeaders } from '../../service/http-request-static-functions.js'

import manifest from './manifest.js'

/**
 * Class NorthOIAnalytics - Send files to a POST Multipart HTTP request and values as JSON payload
 * OIAnalytics endpoints are set in this connector
 */
export default class NorthOIAnalytics extends NorthConnector {
  static category = manifest.category

  /**
   * Constructor for NorthOIAnalytics
   * @constructor
   * @param {Object} configuration - The North connector configuration
   * @param {ProxyService} proxyService - The proxy service
   * @param {Object} logger - The Pino child logger to use
   * @return {void}
   */
  constructor(
    configuration,
    proxyService,
    logger,
  ) {
    super(
      configuration,
      proxyService,
      logger,
      manifest,
    )

    const {
      host,
      authentication,
      acceptUnauthorized,
      proxy,
    } = configuration.settings
    const queryParam = `?dataSourceId=${this.name}`
    this.valuesUrl = `${host}/api/oianalytics/oibus/time-values${queryParam}`
    this.fileUrl = `${host}/api/oianalytics/value-upload/file${queryParam}`
    this.authentication = authentication
    this.acceptUnauthorized = acceptUnauthorized
    this.proxyName = proxy
  }

  /**
   * Initialize services (logger, certificate, status data) at startup
   * @param {String} baseFolder - The base cache folder
   * @param {String} _oibusName - The OIBus name
   * @returns {Promise<void>} - The result promise
   */
  async start(baseFolder, _oibusName) {
    await super.start(baseFolder, _oibusName)
    this.proxyAgent = await this.proxyService.getProxy(this.proxyName, this.acceptUnauthorized)
  }

  /**
   * Handle values by sending them to OIAnalytics
   * @param {Object[]} values - The values to send
   * @returns {Promise<void>} - The result promise
   */
  async handleValues(values) {
    // Remove empty values
    const cleanedValues = values.filter((value) => value?.data?.value !== undefined
      && value?.data?.value !== null
      && value.timestamp !== null
      && value.pointId !== null)
      .map((value) => ({
        timestamp: value.timestamp,
        data: value.data,
        pointId: value.pointId,
      }))
    const data = JSON.stringify(cleanedValues)
    const headers = { 'Content-Type': 'application/json' }
    if (this.authentication) {
      addAuthenticationToHeaders(
        headers,
        this.authentication.type,
        this.authentication.key,
        await this.encryptionService.decryptText(this.authentication.secret),
      )
    }
    await httpSend(
      this.valuesUrl,
      'POST',
      headers,
      data,
      this.cacheSettings.timeout,
      this.proxyAgent,
      this.acceptUnauthorized,
    )
  }

  /**
   * Handle the file by sending it to OIAnalytics.
   * @param {String} filePath - The path of the file
   * @returns {Promise<void>} - The result promise
   */
  async handleFile(filePath) {
    const headers = {}
    if (this.authentication) {
      addAuthenticationToHeaders(
        headers,
        this.authentication.type,
        this.authentication.key,
        await this.encryptionService.decryptText(this.authentication.secret),
      )
    }
    await httpSend(
      this.fileUrl,
      'POST',
      headers,
      filePath,
      this.cacheSettings.timeout,
      this.proxyAgent,
      this.acceptUnauthorized,
    )
  }

  /**
   * Overriding parent method to detect if the connector should retry to send the values/files or discard them
   * @param {Object} error - The error thrown by the handleFile / handleValue method
   * @returns {Boolean} - If the values/files must be sent again or not
   */
  shouldRetry(error) {
    if (!error.responseError) {
      // Error from the library, because the endpoint is not reachable for example. In this case we must retry indefinitely
      this.logger.trace('Should retry because of connection error.')
      return true
    }
    // Otherwise, check the HTTP status code
    const retry = [400, 500].includes(error.statusCode)
    this.logger.trace(`Should retry ${retry} because of error status code: ${error.statusCode}.`)
    return retry
  }
}
