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

    Scenario: Buyer approves pending trade.
        When I use the gateway named buyer 
        And I use the basic chaincode and TradesContract contract 
        And I prepare to evaluate a getTrades transaction 
        And I set the transaction arguments to []
        And I invoke the transaction
        And I save transaction Id as BuyerTrade with index 0
        When I submit a approve trade for token BuyerTrade
        Then the response should be "true"

    Scenario: Seller approves pending trade.
        When I use the gateway named seller 
        And I use the basic chaincode and TradesContract contract 
        And I prepare to evaluate a getTrades transaction 
        And I set the transaction arguments to []
        And I invoke the transaction
        And I save transaction Id as SellerTrade with index 0
        When I submit a approve trade for token SellerTrade
        Then the response should be "true"
        
    Scenario: Seller claim credit of trade.
        When I use the gateway named seller 
        And I use the basic chaincode and TradesContract contract 
        And I prepare to evaluate a getTrades transaction 
        And I set the transaction arguments to []
        And I invoke the transaction
        And I save transaction Id as SellerTrade with index 0
        And I submit a claimCredit trade for token SellerTrade
        And I use the basic chaincode and CreditContract contract
        And I prepare to submit a BalanceOf transaction 
        And I set the transaction arguments to []
        And I invoke the transaction
        And the response should include a Token with Owner "x509::/C=US/ST=California/L=San Francisco/OU=client/CN=User1@org2.example.com::/C=US/ST=California/L=San Francisco/O=org2.example.com/CN=ca.org2.example.com" and same creditBalance as SellerTrade

    Scenario: buyer claim credit of trade.
        When I use the gateway named buyer 
        And I use the basic chaincode and TradesContract contract 
        And I prepare to evaluate a getTrades transaction 
        And I set the transaction arguments to []
        And I invoke the transaction
        And I save transaction Id as buyerTrade with index 0
        And I submit a claimEnergy trade for token buyerTrade
        And I use the basic chaincode and EnergyAttributeContract contract 
        And I prepare to submit a getClaimedEnergy transaction 
        And I set the transaction arguments to []
        And I invoke the transaction
        And the response should include a EAC with Owner "x509::/C=US/ST=California/L=San Francisco/OU=client/CN=User3@org1.example.com::/C=US/ST=California/L=San Francisco/O=org1.example.com/CN=ca.org1.example.com" and same energyBalance as buyerTrade        
        
