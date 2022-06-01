const fs = require('fs/promises')
const databaseService = require('../../services/database.service')

class MainCache {
  static STATUS = {
    SUCCESS: 0,
    LOGIC_ERROR: -1,
    COMMUNICATION_ERROR: -2,
  }

  static valuesErrorDatabase = null

  static filesErrorDatabase = null

  /**
   * Initialize and return the value error database singleton
   * @param {Logger} logger - The logger
   * @param {string} cacheFolder - The cache folder
   * @return {Promise<sqlite.Database>} - The value error database
   */
  static async getValuesErrorDatabaseInstance(logger, cacheFolder) {
    if (!MainCache.valuesErrorDatabase) {
      const valuesErrorDatabasePath = `${cacheFolder}/valueCache-error.db`
      logger.debug(`Initialize values error db: ${valuesErrorDatabasePath}`)
      MainCache.valuesErrorDatabase = await databaseService.createValueErrorsDatabase(valuesErrorDatabasePath)
      logger.debug(`Values error db count: ${await databaseService.getCount(MainCache.valuesErrorDatabase)}`)
    }

    return MainCache.valuesErrorDatabase
  }

  /**
   * Initialize and return the file error database singleton
   * @param {Logger} logger - The logger
   * @param {string} cacheFolder - The cache folder
   * @return {Promise<sqlite.Database>} - The file error database
   */
  static async getFilesErrorDatabaseInstance(logger, cacheFolder) {
    if (!MainCache.filesErrorDatabase) {
      const filesErrorDatabasePath = `${cacheFolder}/fileCache-error.db`
      logger.debug(`Initialize files error db: ${filesErrorDatabasePath}`)
      MainCache.filesErrorDatabase = await databaseService.createFilesDatabase(filesErrorDatabasePath)
      logger.debug(`Files error db count: ${await databaseService.getCount(MainCache.filesErrorDatabase)}`)
    }

    return MainCache.filesErrorDatabase
  }

  /**
   * Initialize and return the file database singleton
   * @param {Logger} logger - The logger
   * @param {string} cacheFolder - The cache folder
   * @return {Promise<sqlite.Database>} - The file database
   */
  static async getFilesDatabaseInstance(logger, cacheFolder) {
    if (!MainCache.filesDatabase) {
      const filesDatabasePath = `${cacheFolder}/fileCache.db`
      logger.debug(`Initialize files db: ${filesDatabasePath}`)
      MainCache.filesDatabase = await databaseService.createFilesDatabase(filesDatabasePath)
      logger.debug(`Files db count: ${await databaseService.getCount(MainCache.filesDatabase)}`)
    }

    return MainCache.filesDatabase
  }

  /**
   * Transfer the file into the cache folder.
   *
   * @param {Logger} logger - The logger
   * @param {string} filePath - The file path
   * @param {string} cachePath - The cache path
   * @param {boolean} preserveFiles - Whether to preserve the file
   * @returns {Promise<*>} - The result promise
   */
  static async transferFile(logger, filePath, cachePath, preserveFiles) {
    logger.debug(`transferFile(${filePath}) - preserveFiles:${preserveFiles}, cachePath:${cachePath}`)

    if (preserveFiles) {
      await fs.copyFile(filePath, cachePath)
    } else {
      try {
        await fs.rename(filePath, cachePath)
      } catch (renameError) {
        // In case of cross-device link error we copy+delete instead
        if (renameError.code !== 'EXDEV') {
          throw renameError
        }
        logger.debug('Cross-device link error during rename, copy+paste instead')
        await fs.copyFile(filePath, cachePath)
        try {
          await fs.unlink(filePath)
        } catch (unlinkError) {
          logger.error(unlinkError)
        }
      }
    }
  }
}

module.exports = MainCache
