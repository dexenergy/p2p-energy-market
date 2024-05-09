Feature: Market should support buy Orders.
    Background:
        Given I have deployed a Fabric network
        And I have created and joined all channels
        And I deploy node chaincode named basic at version 1.0.0 for all organizations on channel mychannel with endorsement policy AND("Org1MSP.member","Org2MSP.member")
        And I register and enroll a Payment user PaymentServ in MSP Org1MSP
        And I create a gateway named PayGateway for HSM user PaymentServ in MSP Org1MSP
        And I connect the gateway to peer0.org1.example.com
        And I use the mychannel network
        And I use the basic chaincode and CreditContract contract
        And I register and enroll a Meter user User1Meter in MSP Org1MSP
        And I create a gateway named consMeterGateway for HSM user User1Meter in MSP Org1MSP
        And I connect the gateway to peer0.org1.example.com
        And I use the mychannel network
        And I use the basic chaincode and EnergyConsumptionContract contract        
        And I create a gateway named buyer for user User2 in MSP Org1MSP
        And I connect the gateway to peer0.org1.example.com
        And I use the mychannel network
        And I use the basic chaincode and OrderBookContract contract   

    Scenario: User should Create Buy order. 
        When I use the gateway named PayGateway
        And I prepare to submit a Mint transaction 
        And I set the transaction arguments to ["x509::/C=US/ST=California/L=San Francisco/OU=client/CN=User2@org1.example.com::/C=US/ST=California/L=San Francisco/O=org1.example.com/CN=ca.org1.example.com", "1000"]
        And I invoke the transaction
        And I save transaction Id as CreditTx1
        When I use the gateway named consMeterGateway
        And I prepare to submit a Mint transaction 
        And I set the transaction arguments to ["x509::/C=US/ST=California/L=San Francisco/OU=client/CN=User2@org1.example.com::/C=US/ST=California/L=San Francisco/O=org1.example.com/CN=ca.org1.example.com", "400"]
        And I invoke the transaction
        And I save transaction Id as ConsumptionTx1
        When I use the gateway named buyer
        And I submit a createBuyOrder transaction for tokens CreditTx1 and ConsumptionTx1, max price 3 and quantity 100
        And I save transaction Id as buyOrderId
        Then the response should be an order with Owner: "x509::/C=US/ST=California/L=San Francisco/OU=client/CN=User2@org1.example.com::/C=US/ST=California/L=San Francisco/O=org1.example.com/CN=ca.org1.example.com" price: 3 and quantity: 100
        
    Scenario: User should get correct Balance of account after buy order.
        When I use the gateway named buyer 
        And I use the basic chaincode and EnergyConsumptionContract contract   
        And I prepare to submit a BalanceOf transaction 
        And I set the transaction arguments to []
        And I invoke the transaction
        Then the response should have 1 elements
        And the response should include a Token with Owner "x509::/C=US/ST=California/L=San Francisco/OU=client/CN=User2@org1.example.com::/C=US/ST=California/L=San Francisco/O=org1.example.com/CN=ca.org1.example.com" and Quantity 300 

    Scenario: User should get his list of buy order.
        When I use the gateway named buyer 
        And I use the basic chaincode and OrderBookContract contract   
        And User buyer invoke getClientBuyOrders for today
        Then the response should have 1 elements
        And the response should include a buy order with Owner: "x509::/C=US/ST=California/L=San Francisco/OU=client/CN=User2@org1.example.com::/C=US/ST=California/L=San Francisco/O=org1.example.com/CN=ca.org1.example.com" price: 3 and quantity: 100
