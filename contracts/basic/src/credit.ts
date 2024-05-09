import { Info } from "fabric-contract-api";
import { UTXOContract } from "./utxo";

@Info({ title: "Credit", description: "Credits Smart contract" })
export class CreditContract extends UTXOContract {
  private readonly _creditBalanceType = "CreditBalance";
  public get balanceType(): string {
    return this._creditBalanceType;
  }

  private readonly _abacMinter = "payment";
  public get abacMinter() {
    return this._abacMinter;
  }
}
