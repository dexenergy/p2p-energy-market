import { Info } from "fabric-contract-api";

import { UTXOContract } from "./utxo";

@Info({
  title: "EnergyGeneration",
  description: "Energy Generation Smart contract",
})
export class EnergyGenerationContract extends UTXOContract {
  readonly _creditBalanceType = "EnergyGenerationBalance";
  readonly _abacMinter = "meter";
  public get balanceType(): string {
    return this._creditBalanceType;
  }
  public get abacMinter() {
    return this._abacMinter;
  }
}

@Info({
  title: "EnergyConsumption",
  description: "Energy Consumption Smart contract",
})
export class EnergyConsumptionContract extends UTXOContract {
  readonly _creditBalanceType = "EnergyConsumptionBalance";
  readonly _abacMinter = "meter";
  public get balanceType(): string {
    return this._creditBalanceType;
  }

  public get abacMinter() {
    return this._abacMinter;
  }
}
