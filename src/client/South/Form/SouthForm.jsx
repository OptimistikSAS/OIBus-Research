import React from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import { Form, Row, Col, Breadcrumb, BreadcrumbItem } from 'reactstrap'
import { OIbTitle, OIbCheckBox, OIbScanMode } from '../../components/OIbForm'
import OIbForm from '../../components/OIbForm/OIbForm.jsx'
import ProtocolSchemas from '../Protocols.jsx'

const SouthForm = ({ dataSource, dataSourceIndex, onChange }) => {
  const { protocol, dataSourceId } = dataSource
  // Create the sections for the protocol (for example dataSource.Modbus) for dataSource not yet initialized
  if (!dataSource[protocol]) dataSource[protocol] = {}
  if (!dataSource.points) {
    dataSource.points = []
  }
  // load the proper schema based on the protocol name.
  const schema = ProtocolSchemas[protocol]
  const prefix = `south.dataSources.${dataSourceIndex}`
  return (
    <Form>
      <Row>
        <Breadcrumb tag="h5">
          <BreadcrumbItem tag={Link} to="/" className="oi-breadcrumb">
            Home
          </BreadcrumbItem>
          <BreadcrumbItem tag={Link} to="/south" className="oi-breadcrumb">
            South
          </BreadcrumbItem>
          <BreadcrumbItem active tag="span">
            {dataSourceId}
          </BreadcrumbItem>
        </Breadcrumb>
      </Row>
      <OIbTitle label="General settings">
        <>
          <ul>
            <li>This form allows to configure protocol-specific parameters.</li>
            <li>You need to activate the protocol with the enabled checkbox.</li>
          </ul>
        </>
      </OIbTitle>
      <Row>
        <Col md={2}>
          <OIbCheckBox
            name={`${prefix}.enabled`}
            label="Enabled"
            defaultValue={false}
            value={dataSource.enabled}
            help={<div>Enable this application</div>}
            onChange={onChange}
            switchButton
          />
        </Col>
      </Row>
      {!schema.points && (
        <Row>
          <Col md={2}>
            <OIbScanMode name={`${prefix}.scanMode`} value={dataSource.scanMode} onChange={onChange} />
          </Col>
        </Row>
      )}
      <OIbForm onChange={onChange} schema={schema} name={`${prefix}.${protocol}`} values={dataSource[protocol]} />
    </Form>
  )
}

SouthForm.propTypes = {
  dataSource: PropTypes.object.isRequired,
  dataSourceIndex: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
}

export default SouthForm
