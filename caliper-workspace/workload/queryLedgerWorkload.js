'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');
const { unmarshal} = require('./utils/general');

class QueryLedgerWorkload extends WorkloadModuleBase {
    constructor() {
        super();
    }
    async initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext) {
        await super.initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext);
        let request = {
            contractId: this.roundArguments.contractId,
            contractFunction: this.roundArguments.contractFunction,
            invokerIdentity: this.roundArguments.invokerIdentity,
            contractArguments: [],
            readOnly: true
        };
        let result = await this.sutAdapter.sendRequests(request);
        const resultBytes = result.GetResult();
        console.log("The query returns bytes: ", resultBytes.length, this.workerIndex);
        const allTokens =  unmarshal(resultBytes);
        console.log("The query returns number of tokens: ", allTokens.length, this.workerIndex);
    
    }
    async submitTransaction() {
        let args = [];
        if (this.roundArguments.args) {
            args = this.roundArguments.args;
        }
        const request = {
            contractId: this.roundArguments.contractId,
            contractFunction: this.roundArguments.contractFunction,
            invokerIdentity: this.roundArguments.invokerIdentity,
            contractArguments: args,
            readOnly: true
        };

        await this.sutAdapter.sendRequests(request);
    }

}

function createWorkloadModule() {
    return new QueryLedgerWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;
