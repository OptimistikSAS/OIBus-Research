import React from 'react'
import { notEmpty, isHost, inRange, minValue, hasLengthBetween, optional } from '../../services/validation.service'

const schema = { name: 'SQL' }
schema.form = {
  SQLSettings: {
    type: 'OIbTitle',
    label: 'SQL Settings',
    md: 12,
    children: (
      <>
        <p>
          SQL periodically connects to the specified SQL server at an interval specified by scan mode.
          It gets values from the database based on the &apos;query&apos; parameter, saves the result in a CSV file
          and sends to any North capable of handling files and configured to accept files from this South.
        </p>
        <p>
          Note for Oracle:
          Oracle Client libraries must be installed and configured separated.
          {' '}
          <a href="https://oracle.github.io/node-oracledb/INSTALL.html" target="_blank" rel="noopener noreferrer">More info</a>
        </p>
        <p>
          Note for all SQL connections with username:
          To avoid accidental data deletion/alteration the SQL user should have only readonly access to the database.
        </p>
      </>
    ),
  },
  driver: {
    type: 'OIbSelect',
    md: 2,
    options: ['mssql', 'mysql', 'postgresql', 'oracle', 'sqlite'],
    label: 'SQL Driver',
    defaultValue: 'mssql',
    help: <div>Driver SQL</div>,
  },
  databasePath: {
    type: 'OIbText',
    defaultValue: './test.db',
    valid: optional(),
    help: <div>The path of the SQLite database</div>,
  },
  host: {
    type: 'OIbText',
    defaultValue: 'localhost',
    valid: isHost(),
    help: <div>IP address of the SQL server</div>,
  },
  port: {
    type: 'OIbInteger',
    newRow: false,
    md: 2,
    valid: inRange(0, 65535),
    defaultValue: 1433,
    help: <div>Port number of the SQL server</div>,
  },
  database: {
    type: 'OIbText',
    defaultValue: 'db',
    md: 3,
    valid: notEmpty(),
    help: <div>Name of the SQL database (SID or Service Name for Oracle)</div>,
  },
  username: {
    type: 'OIbText',
    defaultValue: '',
    valid: notEmpty(),
    help: <div>(Preferably with only readonly access to the database)</div>,
    md: 3,
  },
  password: {
    newRow: false,
    type: 'OIbPassword',
    defaultValue: '',
    valid: hasLengthBetween(0, 256),
    md: 3,
  },
  domain: {
    newRow: false,
    type: 'OIbText',
    valid: optional(),
    defaultValue: '',
    help: <div>(optional used for ntlm authentication for mssql</div>,
    md: 3,
  },
  encryption: {
    type: 'OIbCheckBox',
    label: 'Encryption?',
    defaultValue: true,
    help: <div>Disable encryption for mssql if TLS 1.2 patch is not installed</div>,
    md: 2,
  },
  QuerySettings: {
    type: 'OIbTitle',
    label: 'Query Settings',
    md: 12,
    children: (
      <>
        <p>
          The query may have a specific format and contain a WHERE clause with the date constraint of the time column using @StartTime and @EndTime.
          If @StartTime and @EndTime are used, the query will be split according to the maxReadInterval parameter.
          For example, if @EndTime and @StartTime is a two hours interval, and maxReadInterval is 3600s, the query will be split in two parts.
          Two files will be created.
        </p>
        <p>
          To prevent blocking if the SQL server is not available or the query is faulty it is possible to configure
          separate connection timeout and request timeout.
          <br />
          Note for Oracle:
          Connection timeout can be specified in the &apos;sqlnet.ora&apos; file (E.g. in /opt/oracle/instantclient_19_5/network/admin/sqlnet.ora)
          like this: &apos;SQLNET.OUTBOUND_CONNECT_TIMEOUT=500 ms&apos;
        </p>
        <p>The query results are then converted into a csv (see below).</p>
      </>
    ),
  },
  query: {
    md: 8,
    type: 'OIbTextArea',
    contentType: 'sql',
    defaultValue: 'SELECT * FROM Table WHERE timestamp > @LastCompletedDate',
    valid: notEmpty(),
    help: <div>Available variables: @StartTime, @EndTime</div>,
  },
  connectionTimeout: {
    type: 'OIbInteger',
    label: 'Connection timeout (ms)',
    valid: minValue(0),
    defaultValue: 1000,
    md: 2,
  },
  requestTimeout: {
    type: 'OIbInteger',
    label: 'Request timeout (ms)',
    newRow: false,
    valid: minValue(0),
    defaultValue: 1000,
    md: 2,
  },
  maxReadInterval: {
    type: 'OIbInteger',
    label: 'Max read interval (s)',
    md: 2,
    valid: minValue(0),
    defaultValue: 0,
    help: <div>Put 0 to not split the query</div>,
  },
  readIntervalDelay: {
    type: 'OIbInteger',
    label: 'Read interval delay (ms)',
    newRow: false,
    md: 2,
    valid: minValue(0),
    defaultValue: 200,
    help: <div>Time to wait between the read interval iterations (ms)</div>,
  },
  FileSettings: {
    type: 'OIbTitle',
    label: 'File Settings',
    md: 12,
    children: (
      <>
        <p>
          The query results are converted into a csv. It is possible to specify the delimiter used in the CSV file, how to format
          the timestamp field and also the name of the file with a template.
          <p>The file name can be adapted with the following variables: </p>
          <ul>
            <li>
              <b>@CurrentDate:</b>
              {' '}
              The date the file is created. The date format is yyyy_MM_dd_HH_mm_ss_SSS
            </li>
            <li>
              <b>@ConnectorName:</b>
              {' '}
              The name of the south connector
            </li>
            <li>
              <b>@QueryPart:</b>
              {' '}
              When the query is split according the the MaxReadInterval field, we can use the @QueryPart parameter to name the file.
              If the query is not split, @QueryPart is replaced by 0
            </li>
          </ul>
        </p>
        <p>
          Since we have no information about the SQL server timezone it is possible to specify the time column and the timezone for it.
        </p>
        <p>
          All date fields are read as UTC time and converted to the specified timezone.
          Ex: With timezone &apos;Europe/Paris&apos; the date &apos;2019-01-01 00:00:00&apos;
          will be converted to &apos;Tue Jan 01 2019 00:00:00 GMT+0100&apos;
        </p>
      </>
    ),
  },
  filename: {
    type: 'OIbText',
    defaultValue: 'sql-@CurrentDate.csv',
    valid: notEmpty(),
    help: <div>The name of the CSV file. Available variables: @CurrentDate, @ConnectorName, @QueryPart</div>,
    md: 3,
  },
  compression: {
    type: 'OIbCheckBox',
    newRow: false,
    label: 'Compress File?',
    md: 2,
    defaultValue: false,
  },
  delimiter: {
    type: 'OIbText',
    defaultValue: ',',
    valid: notEmpty(),
    help: <div>Delimiter in the CSV file</div>,
    md: 1,
  },
  dateFormat: {
    newRow: false,
    type: 'OIbText',
    defaultValue: 'yyyy-MM-dd HH:mm:ss.SSS',
    valid: notEmpty(),
    md: 2,
  },
  timeColumn: {
    newRow: false,
    type: 'OIbText',
    md: 2,
    defaultValue: 'timestamp',
    valid: notEmpty(),
  },
  timezone: {
    type: 'OIbTimezone',
    newRow: false,
    md: 2,
  },
}

schema.withDriver = (driver) => {
  schema.form.domain.hidden = driver !== 'mssql'
  schema.form.databasePath.hidden = driver !== 'sqlite'
  schema.form.database.hidden = driver === 'sqlite'
  schema.form.host.hidden = driver === 'sqlite'
  schema.form.port.hidden = driver === 'sqlite'
  schema.form.username.hidden = driver === 'sqlite'
  schema.form.password.hidden = driver === 'sqlite'
  schema.form.requestTimeout.hidden = driver === 'sqlite'
  schema.form.connectionTimeout.hidden = driver === 'sqlite'
  return schema
}

schema.category = 'DatabaseOut'

export default schema