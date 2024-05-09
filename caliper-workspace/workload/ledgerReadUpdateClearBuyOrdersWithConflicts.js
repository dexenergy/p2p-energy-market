'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');
const { unmarshal, workerSplit } = require('./utils/general');
const { getTodayDate } = require('./utils/general');

class ClearBuyOrdersWorkload extends WorkloadModuleBase {
    constructor() {
        super();
    }    
    async initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext) {
        await super.initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext);
        this.dayOfMonth = getTodayDate();
        let request = {
            contractId: this.roundArguments.contractId,
            contractFunction: 'OrderBookContract:getClientBuyOrders',
            invokerIdentity: this.roundArguments.invokerIdentity,
            contractArguments: [this.dayOfMonth],
            readOnly: true
        };
        let result = await this.sutAdapter.sendRequests(request);
        const allBuyOrders =  unmarshal(result.GetResult());
    
        this.buyOrders = workerSplit(allBuyOrders, totalWorkers)[this.workerIndex];

        if (!this.buyOrders) {
            throw new Error("User don't have generation tokens");
        }
        console.log("Loaded Buy Orders for date in worker: ", this.buyOrders.length, this.dayOfMonth, this.workerIndex);
    }
    
    async submitTransaction() {
        const buyOrder = this.buyOrders.pop();
        if (!buyOrder ) {
            throw new Error("User don't have buy orders");
        }
        
        const request = {
            contractId: this.roundArguments.contractId,
            contractFunction: 'OrderBookContract:clearBuyOrderConflicts',
            invokerIdentity: this.roundArguments.invokerIdentity,
            contractArguments: [this.dayOfMonth, buyOrder.Id],
            readOnly: false
        };
        await this.sutAdapter.sendRequests(request);
    }
}

function createWorkloadModule() {
    return new ClearBuyOrdersWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;
