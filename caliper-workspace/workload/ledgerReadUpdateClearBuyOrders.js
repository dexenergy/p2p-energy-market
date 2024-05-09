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
        const myBuyOrders =  unmarshal(result.GetResult());
        let requestSales = {
            contractId: this.roundArguments.contractId,
            contractFunction: 'OrderBookContract:getAllSaleOrders',
            invokerIdentity: this.roundArguments.invokerIdentity,
            contractArguments: [this.dayOfMonth],
            readOnly: true
        };
        let saleResult = await this.sutAdapter.sendRequests(requestSales);
        const allSaleOrders =  unmarshal(saleResult.GetResult());
        
        this.buyOrders = workerSplit(myBuyOrders, totalWorkers)[this.workerIndex];
        this.saleOrders = workerSplit(allSaleOrders, totalWorkers)[this.workerIndex];

        if (!this.buyOrders) {
            throw new Error("User don't have generation tokens");
        }
        console.log("Loaded Buy Orders for date in worker: ", this.buyOrders.length, this.dayOfMonth, this.workerIndex);
    }
    
    async submitTransaction() {
        const buyOrder = this.buyOrders.pop();
        const saleOrder = this.saleOrders.pop();
        if (!buyOrder || !saleOrder) {
            throw new Error("User don't have orders");
        } else {
            const saleOrderDict = `[{"Id": "${saleOrder.Id}", "Price": ${saleOrder.Price}, "Quantity": ${saleOrder.Quantity}, "Owner": "${saleOrder.Owner}", "Date": "${saleOrder.Date}", "Balance": ${saleOrder.Balance}}]`;
            const request = {
                contractId: this.roundArguments.contractId,
                contractFunction: 'OrderBookContract:clearBuyOrder',
                invokerIdentity: this.roundArguments.invokerIdentity,
                contractArguments: [this.dayOfMonth, buyOrder.Id, saleOrderDict],
                readOnly: false
            };
            await this.sutAdapter.sendRequests(request);
        }
    }
}

function createWorkloadModule() {
    return new ClearBuyOrdersWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;
