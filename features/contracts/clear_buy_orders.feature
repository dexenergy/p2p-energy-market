Feature: Market should support clearing buy Orders
    Background:
        Given I have deployed a Fabric network
        And I have created and joined all channels
        And I deploy node chaincode named basic at version 1.0.0 for all organizations on channel mychannel with endorsement policy AND("Org1MSP.member","Org2MSP.member")
        And I register and enroll a Payment user PaymentServ in MSP Org1MSP
        And I create a gateway named PayGateway for HSM user PaymentServ in MSP Org1MSP
        And I connect the gateway to peer0.org1.example.com
        And I use the mychannel network
        And I use the basic chaincode and CreditContract contract
        And I register and enroll a Meter user SmartMeter in MSP Org1MSP
        And I create a gateway named meterGateway for HSM user SmartMeter in MSP Org1MSP
        And I connect the gateway to peer0.org1.example.com
        And I use the mychannel network
        And I use the basic chaincode and EnergyConsumptionContract contract        
        And I create a gateway named buyer for user User3 in MSP Org1MSP
        And I connect the gateway to peer0.org1.example.com
        And I use the mychannel network
        And I use the basic chaincode and OrderBookContract contract
        And I create a gateway named seller for user User1 in MSP Org2MSP
        And I connect the gateway to peer0.org2.example.com
        And I use the mychannel network
        And I use the basic chaincode and OrderBookContract contract  

    Scenario: Users clears a buy Order with a matching sale Order. 
        When I use the gateway named PayGateway
        And I prepare to submit a Mint transaction 
        And I set the transaction arguments to ["x509::/C=US/ST=California/L=San Francisco/OU=client/CN=User3@org1.example.com::/C=US/ST=California/L=San Francisco/O=org1.example.com/CN=ca.org1.example.com", "1000"]
        And I invoke the transaction
        And I save transaction Id as CreditTx1
        When I use the gateway named meterGateway
        And I prepare to submit a Mint transaction 
        And I set the transaction arguments to ["x509::/C=US/ST=California/L=San Francisco/OU=client/CN=User3@org1.example.com::/C=US/ST=California/L=San Francisco/O=org1.example.com/CN=ca.org1.example.com", "400"]
        And I invoke the transaction
        And I save transaction Id as ConsumptionTx1
        When I use the gateway named meterGateway
        And I use the basic chaincode and EnergyGenerationContract contract        
        And I prepare to submit a Mint transaction 
        And I set the transaction arguments to ["x509::/C=US/ST=California/L=San Francisco/OU=client/CN=User1@org2.example.com::/C=US/ST=California/L=San Francisco/O=org2.example.com/CN=ca.org2.example.com", "400"]
        And I invoke the transaction
        And I save transaction Id as GenerationTx1
        When I use the gateway named buyer
        And I submit a createBuyOrder transaction for tokens CreditTx1 and ConsumptionTx1, max price 3 and quantity 100
        And I save transaction Id as buyOrderId
        When I use the gateway named seller
        And I submit a createSaleOrder transaction for token GenerationTx1, min price 2 and quantity 100
        And I save transaction Id as saleOrderId
        When I use the gateway named buyer 
        And I use the basic chaincode and OrderBookContract contract   
        And I submit a clearBuyOrder transaction for buyOrderId and saleOrderId
        And I invoke the transaction
        And the response should be "true"
        And User buyer invoke getClientBuyOrders for same Date as tx buyOrderId
        And the response should have 0 elements
        And User seller invoke getClientSaleOrders for same Date as tx saleOrderId
        And the response should have 0 elements
