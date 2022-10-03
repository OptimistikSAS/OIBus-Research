/**
 * Retrieves a nested property from an object
 * @param {Object} obj - Object which contains the nested property
 * @param {String} nestedProp - Property to search inside the object, must be of format "property.nestedProperty"
 * @param {Boolean} delProp - whether to delete the property once find or not
 * @return {*} value of the property
 */
const findProperty = (obj, nestedProp, delProp) => {
  const propArray = nestedProp.split('.')
  const currentProp = propArray.splice(0, 1)[0]
  if (propArray.length !== 0) {
    return findProperty(obj[currentProp], propArray.join('.'), delProp)
  }
  const res = obj[currentProp]
  if (delProp) delete obj[currentProp] // Delete useless property
  return res
}

/**
 * Groups objects based on a mutual property
 * @param {Object[]} array - Array of objects to group
 * @param {String} key - Name of the property on which base the groups
 * @return {Object} Grouped objects
 */
const groupBy = (array, key) => array.reduce((acc, obj) => {
  const myNewObj = { ...obj }
  const group = findProperty(myNewObj, key, true)
  if (!acc[group]) acc[group] = []
  acc[group].push({ ...myNewObj })
  return acc
}, {})

const findAddressesGroup = (object, address) => Object.keys(object)
  .find((group) => {
    const rangeAddresses = group.split('-')
    const start = parseInt(rangeAddresses[0], 10)
    const end = parseInt(rangeAddresses[1], 10)
    return address >= start && address <= end
  })

/**
 * Groups the data sources by addresses to optimize requests
 * @param {Object[]} array - Array of objects to group
 * @param {String} key - Key or nested key address to find it inside the objects
 * @param {Number} maxGroupSize - Maximum number of addresses by group
 * @return {Object} Grouped object by addresses
 */
const groupAddresses = (array, key, maxGroupSize) => {
  const sortedArray = array.sort((a, b) => {
    const strAddressA = findProperty(a, key, false) // String address A
    const strAddressB = findProperty(b, key, false) // String address B
    return parseInt(strAddressA, 10) - parseInt(strAddressB, 10)
  })

  return sortedArray.reduce((acc, obj) => {
    const strAddress = findProperty(obj, key, false)
    const addressValue = parseInt(strAddress, 10)
    const nearestLimit = Math.round(addressValue / 16) * 16 // Nearest address group limit
    const groupStart = addressValue <= nearestLimit ? nearestLimit - 16 : nearestLimit // First address of the group
    const end = Math.round((nearestLimit + maxGroupSize) / 16) * 16 // Last address

    const groupName = findAddressesGroup(acc, addressValue) || `${groupStart}-${end}`
    if (!acc[groupName]) acc[groupName] = []
    acc[groupName].push(obj)
    return acc
  }, {})
}

const modbusTypes = {
  coil: 'boolean',
  discreteInput: 'number',
  inputRegister: 'number',
  holdingRegister: 'number',
}

/**
 * Gets the configuration file
 * @param {Object[]} points - The list of points to request with ModBus
 * @param {'Modbus' | 'JBus'} addressOffset - The address offset to be applied during requests for each point
 * @param {Object} logger - The logger to display errors
 * @return {Object} The scan modes
 */
const getOptimizedScanModes = (points, addressOffset, logger) => {
  const scanModes = groupBy(points, 'scanMode')
  Object.keys(scanModes)
    .forEach((scanMode) => {
      // add modbusType and register address to each point
      scanModes[scanMode] = scanModes[scanMode].map((myPoint) => {
        const { modbusType } = myPoint
        const offset = addressOffset === 'Modbus' ? 0 : -1
        const address = (myPoint.address.match(/^0x[0-9a-f]+$/i) ? parseInt(myPoint.address, 16) : myPoint.address) + offset
        const type = modbusTypes[myPoint.modbusType]
        if (type === undefined || type === null) {
          logger.error(`The modbus type ${modbusType} was not recognized.`)
        }
        return {
          ...myPoint,
          modbusType,
          address,
          type,
        }
      })
      scanModes[scanMode] = groupBy(scanModes[scanMode], 'modbusType')
      Object.keys(scanModes[scanMode])
        .forEach((type) => {
          scanModes[scanMode][type] = groupAddresses(scanModes[scanMode][type], 'address', 16)
        })
    })
  return scanModes
}

/**
 * Read point value according to its data type (UInt16, UInt32, etc.)
 * @param {Object} response Response of the modbus request
 * @param {Object} point The point to read
 * @param {Number} position Position of the point in the response
 * @param {Object} options - Options to parse the value
 * @return {Number} Value stored at the specified address
 */
const readRegisterValue = (response, point, position, { endianness, swapWordsInDWords, swapBytesInWords }) => {
  if (response.body.constructor.name === 'ReadCoilsResponseBody' || response.body.constructor.name === 'ReadDiscreteInputsResponseBody') {
    return response.body.valuesAsArray[position]
  }
  const modbusEndianness = endianness === 'Big Endian' ? 'BE' : 'LE'
  const funcName = `read${point.dataType}${modbusEndianness}`

  let responseBuffer = response.body.valuesAsBuffer
  // transform 01 02 03 04 into 03 04 01 02
  if (swapWordsInDWords && !['Int16', 'UInt16'].includes(point.dataType)) {
    responseBuffer = responseBuffer.swap32().swap16()
  }

  // transform 01 02 03 04 into 02 01 04 03
  if (swapBytesInWords) {
    responseBuffer = responseBuffer.swap16()
  }
  // Here, the position must be multiplied by 2 because the jsmodbus library is set to read addresses values on
  // 16 bits (2 bytes) but in the valuesAsBuffer field each cell of the array contains 8 bits (1 byte)
  return responseBuffer[funcName](position * 2)
}

module.exports = { getOptimizedScanModes, readRegisterValue }
