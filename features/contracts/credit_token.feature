Feature: User can put money into his account.
    Background:
        Given I have deployed a Fabric network
        And I have created and joined all channels
        And I deploy node chaincode named basic at version 1.0.0 for all organizations on channel mychannel with endorsement policy AND("Org1MSP.member","Org2MSP.member")
        And I register and enroll a Payment user PaymentServ in MSP Org1MSP
        And I create a gateway named PayGateway for HSM user PaymentServ in MSP Org1MSP
        And I connect the gateway to peer0.org1.example.com
        And I use the mychannel network
        And I use the basic chaincode and CreditContract contract
        And I create a gateway named clientGateway for user User1 in MSP Org1MSP
        And I connect the gateway to peer0.org1.example.com
        And I use the mychannel network
        And I use the basic chaincode and CreditContract contract

    Scenario: User should get correct clientID of gateway. 
        When I prepare to submit a getClientIdentity transaction 
        And I set the transaction arguments to []
        And I invoke the transaction
        And the response should be "x509::/C=US/ST=California/L=San Francisco/OU=client/CN=User1@org1.example.com::/C=US/ST=California/L=San Francisco/O=org1.example.com/CN=ca.org1.example.com"
    
    Scenario: User should get correct clientID of PayGateway. 
        When I use the gateway named PayGateway
        And I prepare to submit a getClientIdentity transaction 
        And I set the transaction arguments to []
        And I invoke the transaction
        And the response should be "x509::/C=US/ST=North Carolina/O=Hyperledger/OU=client/CN=PaymentServ::/C=US/ST=California/L=San Francisco/O=org1.example.com/CN=ca.org1.example.com"        

    Scenario: Payment Service should add Credits. 
        When I use the gateway named PayGateway
        And I prepare to submit a Mint transaction 
        And I set the transaction arguments to ["x509::/C=US/ST=California/L=San Francisco/OU=client/CN=User1@org1.example.com::/C=US/ST=California/L=San Francisco/O=org1.example.com/CN=ca.org1.example.com", "5"]
        And I invoke the transaction
        Then the response should be a Token with Owner "x509::/C=US/ST=California/L=San Francisco/OU=client/CN=User1@org1.example.com::/C=US/ST=California/L=San Francisco/O=org1.example.com/CN=ca.org1.example.com" and Quantity 5
    
    Scenario: User should get correct Balance of account.
        When I use the gateway named clientGateway 
        And I prepare to submit a BalanceOf transaction 
        And I set the transaction arguments to []
        And I invoke the transaction
        And the response should include a Token with Owner "x509::/C=US/ST=California/L=San Francisco/OU=client/CN=User1@org1.example.com::/C=US/ST=California/L=San Francisco/O=org1.example.com/CN=ca.org1.example.com" and Quantity 5
    
    Scenario: Normal User cannot mint credits        
        When I use the gateway named clientGateway
        And I prepare to submit a Mint transaction 
        And I set the transaction arguments to ["x509::/C=US/ST=California/L=San Francisco/OU=client/CN=User1@org1.example.com::/C=US/ST=California/L=San Francisco/O=org1.example.com/CN=ca.org1.example.com", "1000"]
        Then the transaction invocation should fail
        And the error status should be ABORTED
        And the error message should contain "10 ABORTED: failed to endorse transaction, see attached details for more info"
