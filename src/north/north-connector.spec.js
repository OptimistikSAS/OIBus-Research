import NorthConnector from './north-connector.js'

// Mock fs
jest.mock('node:fs/promises')

// Mock services
jest.mock('../service/database.service')
jest.mock('../service/status.service')
jest.mock('../service/certificate.service')
jest.mock('../service/encryption.service', () => ({ getInstance: () => ({ decryptText: (password) => password }) }))
jest.mock('../service/utils')
jest.mock('../service/cache/value-cache.service')
jest.mock('../service/cache/file-cache.service')
jest.mock('../service/cache/archive.service')

// Mock logger
const logger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn(),
}

const nowDateString = '2020-02-02T02:02:02.222Z'
let configuration = null
let north = null
const manifest = {
  name: 'north',
  category: 'Debug',
  modes: {
    files: false,
    points: true,
  },
}

describe('NorthConnector', () => {
  beforeEach(async () => {
    jest.resetAllMocks()
    jest.useFakeTimers().setSystemTime(new Date(nowDateString))

    configuration = {
      id: 'id',
      name: 'north',
      type: 'test',
      settings: {},
      caching: {
        sendInterval: 1000,
        retryInterval: 5000,
        groupCount: 10000,
        maxSendCount: 10000,
        retryCount: 2,
        archive: {
          enabled: true,
          retentionDuration: 720,
        },
      },
    }
    north = new NorthConnector(configuration, {}, logger, manifest)
    await north.start('baseFolder', 'oibusName')
  })

  afterEach(() => {
    jest.clearAllTimers()
  })

  it('should be properly initialized', async () => {
    expect(north.connected).toBeFalsy()
    expect(north.manifest.modes.points).toBeTruthy()
    expect(north.manifest.modes.files).toBeFalsy()
    expect(north.statusService.updateStatusDataStream).toHaveBeenCalledWith({ 'Number of values sent since OIBus has started': 0 })

    await north.connect()
    expect(north.connected).toBeTruthy()

    expect(north.logger.info).toHaveBeenCalledWith('North connector "north" of type test started.')

    await north.connect('additional info')
    expect(north.logger.info).toHaveBeenCalledWith('North connector "north" of type test started with additional info.')
  })

  it('should properly disconnect', async () => {
    await north.connect()
    expect(north.connected).toBeTruthy()

    await north.disconnect()
    expect(north.connected).toBeFalsy()
    expect(north.logger.info).toHaveBeenCalledWith('North connector "north" (id) disconnected.')
  })

  it('should properly stop', async () => {
    north.disconnect = jest.fn()
    north.numberOfSentValues = 1
    north.numberOfSentFiles = 1
    await north.stop()
    expect(north.logger.info).toHaveBeenCalledWith('Stopping North "north" (id).')
    expect(north.disconnect).toHaveBeenCalledTimes(1)
    expect(north.fileCache.stop).toHaveBeenCalledTimes(1)
    expect(north.valueCache.stop).toHaveBeenCalledTimes(1)
    expect(north.archiveService.stop).toHaveBeenCalledTimes(1)

    expect(north.numberOfSentFiles).toEqual(0)
    expect(north.numberOfSentValues).toEqual(0)
  })

  it('should properly cache values', () => {
    north.cacheValues([{}])
    expect(north.valueCache.cacheValues).toHaveBeenCalledWith([{}])
  })

  it('should properly cache file', () => {
    north.cacheFile('myFilePath', new Date().getTime())
    expect(north.fileCache.cacheFile).toHaveBeenCalledWith('myFilePath')
  })

  it('should properly check if a north is subscribed to a south', () => {
    expect(north.isSubscribed('southId')).toBeTruthy()
    north.subscribedTo = []
    expect(north.isSubscribed('southId')).toBeTruthy()
    north.subscribedTo = ['anotherSouth']
    expect(north.isSubscribed('southId')).toBeFalsy()
    north.subscribedTo = ['anotherSouth', 'southId']
    expect(north.isSubscribed('southId')).toBeTruthy()
  })

  it('should check if North caches are empty', async () => {
    north.valueCache.isEmpty.mockReturnValue(true)
    north.fileCache.isEmpty.mockReturnValue(Promise.resolve(true))
    expect(await north.isCacheEmpty()).toBeTruthy()

    north.valueCache.isEmpty.mockReturnValue(true)
    north.fileCache.isEmpty.mockReturnValue(Promise.resolve(false))
    expect(await north.isCacheEmpty()).toBeFalsy()

    north.valueCache.isEmpty.mockReturnValue(false)
    north.fileCache.isEmpty.mockReturnValue(Promise.resolve(true))
    expect(await north.isCacheEmpty()).toBeFalsy()

    north.valueCache.isEmpty.mockReturnValue(false)
    north.fileCache.isEmpty.mockReturnValue(Promise.resolve(false))
    expect(await north.isCacheEmpty()).toBeFalsy()
  })

  it('should handle values through the wrapper function', async () => {
    const values = [{ pointId: 'myPointId', data: 'myData' }]
    north.handleValues = jest.fn()
    north.numberOfSentValues = 1
    await north.handleValuesWrapper(values)
    expect(north.handleValues).toHaveBeenCalledWith(values)
    expect(north.numberOfSentValues).toEqual(2)
    expect(north.statusService.updateStatusDataStream).toHaveBeenCalledWith({
      'Last handled values at': new Date().toISOString(),
      'Number of values sent since OIBus has started': 2,
      'Last added point id (value)': 'myPointId ("myData")',
    })
  })

  it('should handle file through the wrapper function', async () => {
    const filePath = 'myFilePath'
    north.handleFile = jest.fn()
    north.numberOfSentFiles = 1
    await north.handleFilesWrapper(filePath)
    expect(north.handleFile).toHaveBeenCalledWith(filePath)
    expect(north.numberOfSentFiles).toEqual(2)
    expect(north.statusService.updateStatusDataStream).toHaveBeenCalledWith({
      'Last upload at': new Date().toISOString(),
      'Number of files sent since OIBus has started': 2,
      'Last uploaded file': filePath,
    })
  })

  it('should not retry', () => {
    const retry = north.shouldRetry()
    expect(north.logger.trace).toHaveBeenCalledWith('Default retry test always return false.')
    expect(retry).toEqual(false)
  })

  it('should get error files', async () => {
    const fromDate = '2022-11-11T11:11:11.111'
    const toDate = '2022-11-12T11:11:11.111'
    const nameFilter = 'ile'
    const pageNumber = 1
    const files = ['file1.name', 'file2.name', 'file3.name']
    north.fileCache.getErrorFiles.mockReturnValue(Promise.resolve(files))

    const result = await north.getErrorFiles(fromDate, toDate, nameFilter, pageNumber)
    expect(north.fileCache.getErrorFiles).toBeCalledWith(fromDate, toDate, nameFilter, pageNumber)
    expect(result).toEqual(files)
  })

  it('should remove error files', async () => {
    const files = ['file1.name', 'file2.name', 'file3.name']

    await north.removeErrorFiles(files)
    expect(north.fileCache.removeErrorFiles).toBeCalledWith(files)
  })

  it('should retry error files', async () => {
    const files = ['file1.name', 'file2.name', 'file3.name']

    await north.retryErrorFiles(files)
    expect(north.fileCache.retryErrorFiles).toBeCalledWith(files)
  })

  it('should remove all error files', async () => {
    await north.removeAllErrorFiles()
    expect(north.fileCache.removeAllErrorFiles).toBeCalled()
  })

  it('should retry all error files', async () => {
    await north.retryAllErrorFiles()
    expect(north.fileCache.retryAllErrorFiles).toBeCalled()
  })
})
