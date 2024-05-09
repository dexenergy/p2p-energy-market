'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');

const { getPublicKey } = require('./utils/general');


class UpdateWorkload extends WorkloadModuleBase {

    constructor() {
        super();
    }

    async initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext) {
        await super.initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext);
        this.invokerPublicKey = await getPublicKey(this.roundArguments.contractId, this.roundArguments.invokerIdentity, this.sutAdapter);
    }

    async submitTransaction() {
        const request = {
            contractId: this.roundArguments.contractId,
            contractFunction: this.roundArguments.contractFunction,
            invokerIdentity: this.roundArguments.invokerIdentity,
            contractArguments: [this.invokerPublicKey, this.roundArguments.consumption.toString()],
            readOnly: false
        };
        await this.sutAdapter.sendRequests(request);
    }

}

function createWorkloadModule() {
    return new UpdateWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;
