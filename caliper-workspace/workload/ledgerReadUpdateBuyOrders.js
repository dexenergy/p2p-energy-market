'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');
const { unmarshal, workerSplit, getRandomInt } = require('./utils/general');

class CreateBuyOrdersWorkload extends WorkloadModuleBase {
    constructor() {
        super();
    }    
    async initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext) {
        await super.initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext);
        let request = {
            contractId: this.roundArguments.contractId,
            contractFunction: 'EnergyConsumptionContract:BalanceOf',
            invokerIdentity: this.roundArguments.invokerIdentity,
            contractArguments: [],
            readOnly: true
        };
        let result = await this.sutAdapter.sendRequests(request);
        const allConsumptionTokens =  unmarshal(result.GetResult());
        
        request = {
            contractId: this.roundArguments.contractId,
            contractFunction: 'CreditContract:BalanceOf',
            invokerIdentity: this.roundArguments.invokerIdentity,
            contractArguments: [],
            readOnly: true
        };
        let creditResult = await this.sutAdapter.sendRequests(request);
        const allCreditTokens =  unmarshal(creditResult.GetResult());
        this.consumptionTokens = workerSplit(allConsumptionTokens, totalWorkers)[this.workerIndex];
        this.creditTokens = workerSplit(allCreditTokens, totalWorkers)[this.workerIndex];

        if (!this.consumptionTokens || !this.creditTokens) {
            throw new Error("User don't have credits or consumption tokens");
        }
        console.log("Loaded credit Tokens: ", this.creditTokens.length, this.workerIndex);
        console.log("Loaded consumption Tokens: ", this.consumptionTokens.length, );
    }
    
    async submitTransaction() {
        const consumptionToken = this.consumptionTokens.pop();
        const creditToken = this.creditTokens.pop();
        if (!consumptionToken || !creditToken) {
            throw new Error("User don't have credits or consumption tokens");
        }

        const request = {
            contractId: this.roundArguments.contractId,
            contractFunction: 'OrderBookContract:createBuyOrder',
            invokerIdentity: this.roundArguments.invokerIdentity,
            contractArguments: [creditToken.Id, consumptionToken.Id, consumptionToken.Quantity.toString(), this.roundArguments.price.toString()],
            readOnly: false
        };
        await this.sutAdapter.sendRequests(request);
    }
}

function createWorkloadModule() {
    return new CreateBuyOrdersWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;
