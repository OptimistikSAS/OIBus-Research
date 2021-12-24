{/*HELP-MENU*/}
import React from 'react'

// POINTERS : Search for 'HELP-MENU'

{/* STEPS :
1# set up Help-menu (THIS FILE)

2# Set variable to define client state
    client_state = 0            ==>     OIBus in default (running) state
            --> ALL client functionalities active, OIBus running as it is intended to

            client_state = 1 -> ....    ==>     different steps in first-UX-circuit
            --> most functionalities / buttons locked
                --> if [[ "$client_state" == 0]]; then
                        // is active
                    fi
*/}


{/* Work In Progress */}
const Help = () => {
  const handle_LaunchHelp = async () => {
    try {
      // .
    } catch (error) {
      console.error(error)
      setAlert({ text: error.message, type: 'danger' })
    }
  }
  return (
    <>
    <OIbTitle label="Help Overview">
        <div>
          <p>You can launch from this page a help-client, which will guide you through OIBus and all its functionalities.</p>
          <p>Be aware that you can leave anytime by pressing the 'Leave'-button on the lower-right side of the screen.</p>
        </div>
      </OIbTitle>
      <Button className="inline-button" color="primary" onClick={() => handle_LaunchHelp()}>
        Launch 'First Experience'
      </Button>
    </>
  )
}