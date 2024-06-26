# Copyright contributors to the Hyperledgendary Full Stack Asset Transfer project
#
# SPDX-License-Identifier: Apache-2.0
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at:
#
# 	  http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

# Main justfile to run all the development scripts
# To install 'just' see https://github.com/casey/just#installation


###############################################################################
# COMMON TARGETS                                                              #
###############################################################################


# Ensure all properties are exported as shell env-vars
set export

# set the current directory, and the location of the test dats
CWDIR := justfile_directory()

_default:
  @just -f {{justfile()}} --list

# Run the check script to validate tool versions installed
check:
  ${CWDIR}/check.sh

install-fabric:
    curl -sSL https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh | bash -s -- binary --fabric-version 3.0.0-preview
###############################################################################
# MICROFAB / DEV TARGETS                                                      #
###############################################################################

# Shut down the microfab (uf) instance
microfab-down:
    #!/bin/bash

    if docker inspect microfab &>/dev/null; then
        echo "Removing existing microfab container:"
        docker kill microfab
    fi

# Start a micro fab instance and create configuration in _cfg/uf
microfab: microfab-down
    #!/bin/bash
    set -e -o pipefail

    export CFG=$CWDIR/_cfg/uf
    export MICROFAB_CONFIG='{
        "endorsing_organizations":[
            {
                "name": "org1"
            },
            {
                "name": "org2"
            }
        ],
        "channels":[
            {
                "name": "mychannel",
                "endorsing_organizations":[
                    "org1"
                ]
            }
        ],
        "capability_level":"V2_0"
    }'

    mkdir -p $CFG
    echo
    echo "Stating microfab...."

    docker run --name microfab -p 8080:8080 --add-host host.docker.internal:host-gateway --rm -d -e MICROFAB_CONFIG="${MICROFAB_CONFIG}"  ibmcom/ibp-microfab:0.0.16
    sleep 5

    curl -s http://console.127-0-0-1.nip.io:8080/ak/api/v1/components | weft microfab -w $CFG/_wallets -p $CFG/_gateways -m $CFG/_msp -f
    cat << EOF > $CFG/org1admin.env
    export CORE_PEER_LOCALMSPID=org1MSP
    export CORE_PEER_MSPCONFIGPATH=$CFG/_msp/org1/org1admin/msp
    export CORE_PEER_ADDRESS=org1peer-api.127-0-0-1.nip.io:8080
    export FABRIC_CFG_PATH=$CWDIR/config
    export CORE_PEER_CLIENT_CONNTIMEOUT=15s
    export CORE_PEER_DELIVERYCLIENT_CONNTIMEOUT=15s
    EOF

    cat << EOF > $CFG/org2admin.env
    export CORE_PEER_LOCALMSPID=org2MSP
    export CORE_PEER_MSPCONFIGPATH=$CFG/_msp/org2/org2admin/msp
    export CORE_PEER_ADDRESS=org2peer-api.127-0-0-1.nip.io:8080
    export FABRIC_CFG_PATH=$CWDIR/config
    export CORE_PEER_CLIENT_CONNTIMEOUT=15s
    export CORE_PEER_DELIVERYCLIENT_CONNTIMEOUT=15s
    EOF

    echo
    echo "To get an peer cli environment run:"
    echo
    echo 'source $WORKSHOP_PATH/_cfg/uf/org1admin.env'

# Creates a chaincode package and install/approve/commit
debugcc:
    #!/bin/bash
    set -e -o pipefail

    export CFG=$CWDIR/_cfg/uf

    pushd $CWDIR/contracts/basic

    # this is the ip address the peer will use to talk to the CHAINCODE_ID
    # remember this is relative from where the peer is running.
    export CHAINCODE_SERVER_ADDRESS=host.docker.internal:9999
    export CHAINCODE_ID=$(weft chaincode package caas --path . --label asset-transfer --address ${CHAINCODE_SERVER_ADDRESS} --archive asset-transfer.tgz --quiet)
    export CORE_PEER_LOCALMSPID=org1MSP
    export CORE_PEER_MSPCONFIGPATH=$CFG/_msp/org1/org1admin/msp
    export CORE_PEER_ADDRESS=org1peer-api.127-0-0-1.nip.io:8080
    export CORE_PEER_CLIENT_CONNTIMEOUT=15s
    export CORE_PEER_DELIVERYCLIENT_CONNTIMEOUT=15s

    echo "CHAINCODE_ID=${CHAINCODE_ID}"

    set -x && peer lifecycle chaincode install asset-transfer.tgz &&     { set +x; } 2>/dev/null
    echo
    set -x && peer lifecycle chaincode approveformyorg --channelID mychannel --name asset-transfer -v 0 --package-id $CHAINCODE_ID --sequence 1 --connTimeout 15s && { set +x; } 2>/dev/null
    echo
    set -x && peer lifecycle chaincode commit --channelID mychannel --name asset-transfer -v 0 --sequence 1  --connTimeout 15s && { set +x; } 2>/dev/null
    echo
    set -x && peer lifecycle chaincode querycommitted --channelID=mychannel && { set +x; } 2>/dev/null
    echo
    popd

    cat << CC_EOF >> $CFG/org1admin.env
    export CHAINCODE_SERVER_ADDRESS=0.0.0.0:9999
    export CHAINCODE_ID=${CHAINCODE_ID}
    CC_EOF

    echo "Added CHAINCODE_ID and CHAINCODE_SERVER_ADDRESS to org1admin.env"
    echo
    echo '   source $WORKSHOP_PATH/_cfg/uf/org1admin.env'
