# OIBusOPCHDA
OIBusOPCHDA is an agent used by OIBus to interact with OPC Server. As a standalone agent, it can also be run through a
Command Line Interface.

Because OPC depends on COM/DCOM technology, the agent can be run on Windows only with COM/DCOM
settings enabled.

OIBusOPCHDA is built in C# with .NET Framework 4.8.

OPC Core components, from OPCFoundation are required to compile and use this library:
https://opcfoundation.org/developer-tools/samples-and-tools-classic/core-components/

Newtonsoft.Json and CommandLineParser libraries are also required to interact with TCP commands and CLI commands
respectively.

# HdaAgent (standalone)
The agent is an executable that needs the following DLLs to run :
- CommandLine.dll
- Newtonsoft.Json.dll
- OpcComRcw.dll
- OpcNetApi.Com.dll
- OpcNetApi.dll

Several actions are possible:
- catalog: list available tags and store them in a CSV file
- bulk: request history and store it in one file per tag

The following options are available for both commands:

````
-h --host                   Host name (or IP address).
-s --server                 HDA Server name (ex: Matrikon.OPC.Simulation.1)
-l --consoleLevel           Verbosity level for Console. Default debug
-x --fileLevel              Verbosity level for File. Default debug
````

## catalog

HdaAgent Catalog creates a csv file catalog.csv using the browse API.

The program displays information about the server (API ServerStatus), Aggregates (getAggregates)
and Attributes (getAttributes) as JSON string in the console.

The following options are available:
````
-i --includesAll        Includes all Items in the server (i.e. folders). Default: false
-f --file               Name of the output folder. Default: catalog.csv
````

### Basic usage
`.\HDAAgent.exe catalog -h localhost -s Matrikon.OPC.Simulation`

````
Name,Address
"ArrayOfReal8","Bucket Brigade.ArrayOfReal8"
"ArrayOfString","Bucket Brigade.ArrayOfString"
...
````
### Includes all and specific file
`.\HDAAgent.exe catalog -h localhost -s Matrikon.OPC.Simulation --includesAll --file myFile.csv`

````
Name,Address,isItem
"Root","",False
"Simulation Items,"Simulation Items",False
"Bucket Brigade","Bucket Brigade",False
"ArrayOfReal8","Bucket Brigade.ArrayOfReal8",True
"ArrayOfString","Bucket Brigade.ArrayOfString",True
...
````


## bulk
The following options are available:
````
-b --startTime          Start Time of the history"      
-e --endTime            End Time of the history"
-d --delay              Throttle: add a delay between requests to minimize load on HDA Servers (in ms)
-m --max                Maximum number of values returned in a request. Defaut 0 (no maximum)
-o --output             Name of the output folder. Default current folder
-c --catalog            Name of the catalog file listing the tags
-a --aggregate          Aggregate value. RAW=0, TOTAL=2, AVERAGE=3, MINIMUM=8, MAXIMUM=10, START=11, END=12. Default 0
-i --interval           Interval (in second) if an aggregate is requested
````
### Basic usage
Request raw values from _Matrikon.OPC.Simulation_ server located on _localhost_, for points listed in catalog.csv between
2022-01-01 00:00:00 and 2022-02-01 00:00:00.
````
.\HdaAgent.exe bulk -h localhost -s Matrikon.OPC.Simulation -c catalog.csv -b "2022-01-01 00:00:00" -e "2022-02-01 00:00:00" -a 0
````
### With aggregates
Request by group intervals of 60s (_-i 60_) the last value (_-a 12_) of each group for points listed in catalog.csv from
_Matrikon.OPC.Simulation_ server located on _localhost_, between  2022-01-01 00:00:00 and 2022-02-01 00:00:00.
````
.\HdaAgent.exe bulk -h localhost -s Matrikon.OPC.Simulation -c catalog.csv -b "2022-01-01 00:00:00" -e "2022-02-01 00:00:00" -a 12 -i 60
````


# HdaAgent (with OIBus)
OIBus communicates with the HdaAgent through a TCP communication. See the OIBus documentation for more information.
