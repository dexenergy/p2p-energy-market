Feature: Market should support Sale Orders.
    Background:
        Given I have deployed a Fabric network
        And I have created and joined all channels
        And I deploy node chaincode named basic at version 1.0.0 for all organizations on channel mychannel with endorsement policy AND("Org1MSP.member","Org2MSP.member")
        And I register and enroll a Meter user User3Meter in MSP Org1MSP
        And I create a gateway named genMeterGateway for HSM user User3Meter in MSP Org1MSP
        And I connect the gateway to peer0.org1.example.com
        And I use the mychannel network
        And I use the basic chaincode and EnergyGenerationContract contract        
        And I create a gateway named seller for user User3 in MSP Org1MSP
        And I connect the gateway to peer0.org1.example.com
        And I use the mychannel network
        And I use the basic chaincode and OrderBookContract contract   

    Scenario: User should Create Sale order. 
        When I use the gateway named genMeterGateway
        And I prepare to submit a Mint transaction 
        And I set the transaction arguments to ["x509::/C=US/ST=California/L=San Francisco/OU=client/CN=User3@org1.example.com::/C=US/ST=California/L=San Francisco/O=org1.example.com/CN=ca.org1.example.com", "400"]
        And I invoke the transaction
        And I save transaction Id as ConsumptionTx3
        When I use the gateway named seller
        And I submit a createSaleOrder transaction for token ConsumptionTx3, min price 3 and quantity 100
        Then the response should be an order with Owner: "x509::/C=US/ST=California/L=San Francisco/OU=client/CN=User3@org1.example.com::/C=US/ST=California/L=San Francisco/O=org1.example.com/CN=ca.org1.example.com" price: 3 and quantity: 100
    
    Scenario: User should get correct Balance of account after sale order.
        When I use the gateway named seller 
        And I use the basic chaincode and EnergyGenerationContract contract   
        And I prepare to submit a BalanceOf transaction 
        And I set the transaction arguments to []
        And I invoke the transaction
        And the response should have 1 elements
        And the response should include a Token with Owner "x509::/C=US/ST=California/L=San Francisco/OU=client/CN=User3@org1.example.com::/C=US/ST=California/L=San Francisco/O=org1.example.com/CN=ca.org1.example.com", Quantity 300 and Origin "x509::/C=US/ST=North Carolina/O=Hyperledger/OU=client/CN=User3Meter::/C=US/ST=California/L=San Francisco/O=org1.example.com/CN=ca.org1.example.com"