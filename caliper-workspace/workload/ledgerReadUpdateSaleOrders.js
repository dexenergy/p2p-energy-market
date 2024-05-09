'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');
const { unmarshal, workerSplit } = require('./utils/general');

class CreateBuyOrdersWorkload extends WorkloadModuleBase {
    constructor() {
        super();
    }    
    async initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext) {
        await super.initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext);
        let request = {
            contractId: this.roundArguments.contractId,
            contractFunction: 'EnergyGenerationContract:BalanceOf',
            invokerIdentity: this.roundArguments.invokerIdentity,
            contractArguments: [],
            readOnly: true
        };
        let result = await this.sutAdapter.sendRequests(request);
        const allGenerationTokens =  unmarshal(result.GetResult());
    
        this.generationTokens = workerSplit(allGenerationTokens, totalWorkers)[this.workerIndex];

        if (!this.generationTokens) {
            throw new Error("User don't have generation tokens");
        }
        console.log("Loaded generation Tokens in worker: ", this.generationTokens.length, this.workerIndex);
    }
    
    async submitTransaction() {
        const generationToken = this.generationTokens.pop();
        if (!generationToken ) {
            throw new Error("User don't have generation tokens");
        }
        const request = {
            contractId: this.roundArguments.contractId,
            contractFunction: 'OrderBookContract:createSaleOrder',
            invokerIdentity: this.roundArguments.invokerIdentity,
            contractArguments: [generationToken.Id, generationToken.Quantity.toString(), this.roundArguments.price.toString()],
            readOnly: false
        };
        await this.sutAdapter.sendRequests(request);
    }
}

function createWorkloadModule() {
    return new CreateBuyOrdersWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;
