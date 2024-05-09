cd ../features/fixtures/
sh generate.sh
docker-compose -f docker-compose/docker-compose-tls.yaml -p node up -d --build --force-recreate
echo "Sleeping 60 seconds to wait for the network to start"

sleep 60
echo "Create all channels"

echo "Orderer 1 join channel"
docker exec org1_cli osnadmin channel join --channelID mychannel --config-block /etc/hyperledger/configtx/mychannel.block -o orderer1.example.com:7053 --ca-file /etc/hyperledger/configtx/crypto-config/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem --client-cert /etc/hyperledger/configtx/crypto-config/ordererOrganizations/example.com/orderers/orderer1.example.com/tls/server.crt --client-key /etc/hyperledger/configtx/crypto-config/ordererOrganizations/example.com/orderers/orderer1.example.com/tls/server.key

echo "Orderer 2 join channel"
docker exec org1_cli osnadmin channel join --channelID mychannel --config-block /etc/hyperledger/configtx/mychannel.block -o orderer2.example.com:8053 --ca-file /etc/hyperledger/configtx/crypto-config/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem --client-cert /etc/hyperledger/configtx/crypto-config/ordererOrganizations/example.com/orderers/orderer2.example.com/tls/server.crt --client-key /etc/hyperledger/configtx/crypto-config/ordererOrganizations/example.com/orderers/orderer2.example.com/tls/server.key

echo "Orderer 3 join channel"
docker exec org1_cli osnadmin channel join --channelID mychannel --config-block /etc/hyperledger/configtx/mychannel.block -o orderer3.example.com:9053 --ca-file /etc/hyperledger/configtx/crypto-config/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem --client-cert /etc/hyperledger/configtx/crypto-config/ordererOrganizations/example.com/orderers/orderer3.example.com/tls/server.crt --client-key /etc/hyperledger/configtx/crypto-config/ordererOrganizations/example.com/orderers/orderer3.example.com/tls/server.key

echo "Org1 peers join channel"
docker exec -e CORE_PEER_ADDRESS=peer0.org1.example.com:7051 org1_cli peer channel join -b /etc/hyperledger/configtx/mychannel.block

echo "Org2 peers join channel"
docker exec -e CORE_PEER_ADDRESS=peer0.org2.example.com:8051 org2_cli peer channel join -b /etc/hyperledger/configtx/mychannel.block

echo "Org3 peers join channel"
docker exec -e CORE_PEER_ADDRESS=peer0.org3.example.com:11051 org3_cli peer channel join -b /etc/hyperledger/configtx/mychannel.block

echo "Create package" 
docker exec org1_cli peer lifecycle chaincode package basic.tar.gz --path /opt/gopath/src/github.com/chaincode/basic --lang node --label basic_1.0
docker exec org2_cli peer lifecycle chaincode package basic.tar.gz --path /opt/gopath/src/github.com/chaincode/basic --lang node --label basic_1.0
docker exec org3_cli peer lifecycle chaincode package basic.tar.gz --path /opt/gopath/src/github.com/chaincode/basic --lang node --label basic_1.0

echo "installchaincode"
docker exec -e CORE_PEER_ADDRESS=peer0.org1.example.com:7051 org1_cli peer lifecycle chaincode install basic.tar.gz
docker exec -e CORE_PEER_ADDRESS=peer0.org2.example.com:8051 org2_cli peer lifecycle chaincode install basic.tar.gz
docker exec -e CORE_PEER_ADDRESS=peer0.org3.example.com:11051 org3_cli peer lifecycle chaincode install basic.tar.gz
# you can inferer the chaincode ID from the output of the previous command
CHAINCODE_ID=basic_1.0:153d4f3de57f17c586b3478a35ddd16615ccc3453ce5be29f2201f2629cf614d

docker exec org1_cli peer lifecycle chaincode approveformyorg --channelID mychannel --name basic --version 1.0 --package-id $CHAINCODE_ID --sequence 1 --waitForEvent --signature-policy "OutOf(3, 'Org1MSP.member', 'Org2MSP.member', 'Org3MSP.member')" --tls --cafile /etc/hyperledger/configtx/crypto-config/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem

docker exec org2_cli peer lifecycle chaincode approveformyorg --channelID mychannel --name basic --version 1.0 --package-id $CHAINCODE_ID --sequence 1 --waitForEvent --signature-policy "OutOf(3, 'Org1MSP.member', 'Org2MSP.member', 'Org3MSP.member')" --tls --cafile /etc/hyperledger/configtx/crypto-config/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem

docker exec org3_cli peer lifecycle chaincode approveformyorg --channelID mychannel --name basic --version 1.0 --package-id $CHAINCODE_ID --sequence 1 --waitForEvent --signature-policy "OutOf(3, 'Org1MSP.member', 'Org2MSP.member', 'Org3MSP.member')" --tls --cafile /etc/hyperledger/configtx/crypto-config/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem

echo "Commit chaincode"

docker exec org1_cli peer lifecycle chaincode commit --channelID mychannel --name basic --version 1.0 --signature-policy "OutOf(3, 'Org1MSP.member', 'Org2MSP.member', 'Org3MSP.member')" --sequence 1 --waitForEvent --peerAddresses peer0.org1.example.com:7051 --peerAddresses peer0.org2.example.com:8051 --peerAddresses peer0.org3.example.com:11051 --tlsRootCertFiles /etc/hyperledger/configtx/crypto-config/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --tlsRootCertFiles /etc/hyperledger/configtx/crypto-config/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt --tlsRootCertFiles /etc/hyperledger/configtx/crypto-config/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/ca.crt  --tls true --cafile /etc/hyperledger/configtx/crypto-config/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem