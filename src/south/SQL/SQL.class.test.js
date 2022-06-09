const { Settings } = require('luxon')

const mysql = require('mysql2/promise')

const SQL = require('./SQL.class')
const config = require('../../../tests/integration-test/testConfig').default
const EncryptionService = require('../../services/EncryptionService.class')
// const { insertValue } = require('../../../local-development/database-seeder/seed-db')

// Mock fs
jest.mock('fs/promises', () => ({
  exists: jest.fn(() => new Promise((resolve) => {
    resolve(true)
  })),
  mkdir: jest.fn(() => new Promise((resolve) => {
    resolve(true)
  })),
  writeFile: jest.fn(() => new Promise((resolve) => {
    resolve(true)
  })),
  unlink: jest.fn(() => new Promise((resolve) => {
    resolve(true)
  })),
}))

jest.mock('pg', () => ({
  Client: jest.fn(),
  types: jest.fn(),
}))

jest.mock('papaparse', () => ({ unparse: jest.fn() }))

// Mock logger
jest.mock('../../engine/logger/Logger.class')

// Mock EncryptionService
EncryptionService.getInstance = () => ({ decryptText: (password) => password })

// Mock engine
const engine = jest.mock('../../engine/OIBusEngine.class')
engine.configService = { getConfig: () => ({ engineConfig: config.engine }) }
engine.addFile = jest.fn()
engine.getCacheFolder = () => config.engine.caching.cacheFolder
engine.eventEmitters = {}

const databaseSampleData = [
  { created_at: '2018-10-03T13:40:40' },
  { created_at: '2019-10-03T13:40:40' },
  { created_at: '2020-10-04T13:40:40' },
  { created_at: '2022-10-03T13:40:40' },
]

const host = '127.0.0.1'
const user = 'oibus' // lgtm [js/hardcoded-credentials]
const password = 'oibus123' // lgtm [js/hardcoded-credentials]
const database = 'oibus'
const confiog = {
  host,
  user,
  password,
  database,
  port: 5306,
  connectTimeout: 500,
}

let sqlSouth = null
const nowDateString = '2020-02-02T02:02:02.222Z'
const sqlConfig = config.south.dataSources[0]
Settings.now = () => new Date(nowDateString).valueOf()
const RealDate = Date
beforeEach(async () => {
  jest.resetAllMocks()
  jest.clearAllMocks()
  jest.useFakeTimers()
  jest.restoreAllMocks()
  global.Date = jest.fn(() => new RealDate(nowDateString))
  global.Date.UTC = jest.fn(() => new RealDate(nowDateString).toUTCString())
})
// jest.setTimeout(30000)

afterEach(() => {
  global.Date = RealDate
})

describe('SQL Integration test', () => {
  beforeAll(async () => {
    const connection = await mysql.createConnection(confiog)
    await connection.query('CREATE TABLE IF NOT EXISTS history (temperature double, created_at datetime)')
    const query = 'INSERT INTO history (temperature, created_at) VALUES (55, \'2020-02-02T02:02:02\')'
    await connection.query(query)
    await connection.end()
  })

  afterAll(async (done) => {
    // TODO clear database table
  })
  it('should create the table in the database', async () => {
    // TODO insert the mock values into database

    sqlSouth = new SQL(sqlConfig, engine)

    await sqlSouth.init()
    await sqlSouth.connect()
    sqlSouth.driver = 'mysql'
    const result = await sqlSouth.getDataFromMySQL(
      '2019-10-03T13:36:36',
      '2021-10-03T13:40:40',
    )

    expect(result).toEqual([{ temperature: 55, created_at: '2019-10-03T13:40:40' },
      { temperature: 55, created_at: '2020-10-04T13:40:40' }])

    expect(sqlSouth.connected).toEqual(true)
  })
})
