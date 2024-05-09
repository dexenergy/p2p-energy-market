import { Context, Contract, Returns, Transaction } from "fabric-contract-api";
import { MintedQuantity, UTXO } from "./model";
import { _utxoMintHelper, marshal, unmarshal } from "./utils";
import { iterateUTXO } from "./iterator-helpers";
import { sub } from "./utils";

export abstract class UTXOContract extends Contract {
  abstract get balanceType(): string;
  abstract get abacMinter(): string;

  @Transaction(false)
  @Returns("string")
  async getClientIdentity(ctx: Context): Promise<string> {
    return ctx.clientIdentity.getID();
  }

  private CheckMintPemissions(ctx: Context): void {
    if (!ctx.clientIdentity.assertAttributeValue(this.abacMinter, "true")) {
      throw new Error("This user is not allowed to mint");
    }
  }

  @Transaction(true)
  @Returns("UTXO")
  async Mint(ctx: Context, to: string, amount: number): Promise<UTXO> {
    this.CheckMintPemissions(ctx);
    return this._mint(ctx, to, amount);
  }
  async _mint(ctx: Context, to: string, amount: number): Promise<UTXO> {
    return await _utxoMintHelper(ctx, this.balanceType, to, amount);
  }

  @Transaction(false)
  @Returns("UTXO[]")
  async BalanceOf(ctx: Context): Promise<UTXO[]> {
    const owner = ctx.clientIdentity.getID();
    const iterator = await ctx.stub.getStateByPartialCompositeKey(
      this.balanceType,
      [owner],
    );
    const balance: UTXO[] = await iterateUTXO(iterator, ctx);
    return balance;
  }

  async _getUTXOById(ctx: Context, tx1: string): Promise<MintedQuantity> {
    const owner = ctx.clientIdentity.getID();
    const utxoKey = ctx.stub.createCompositeKey(this.balanceType, [owner, tx1]);
    const utxoBytes = await ctx.stub.getState(utxoKey);
    if (!utxoBytes || utxoBytes.length === 0) {
      throw new Error(`UTXO with ID ${tx1} does not exist for owner ${owner}`);
    }
    const mintedValue = MintedQuantity.newInstance(unmarshal(utxoBytes));
    return mintedValue;
  }

  async _spend(ctx: Context, utxoId: string, amount: number): Promise<UTXO[]> {
    const owner = ctx.clientIdentity.getID();
    const utxoKey = ctx.stub.createCompositeKey(this.balanceType, [
      owner,
      utxoId,
    ]);
    const utxoBytes = await ctx.stub.getState(utxoKey);
    if (!utxoBytes || utxoBytes.length === 0) {
      throw new Error(
        `UTXO with ID ${utxoId} does not exist for owner ${owner}`,
      );
    }
    const mintedValue = MintedQuantity.newInstance(unmarshal(utxoBytes));
    const utxo = mintedValue.Quantity;
    if (utxo < amount) {
      throw new Error(`UTXO with ID ${utxoId} does not have enough energy`);
    }

    await ctx.stub.deleteState(utxoKey);
    const newUtxo = sub(utxo, amount);

    if (newUtxo > 0) {
      const txId = ctx.stub.getTxID();
      const newUtxoId = ctx.stub.createCompositeKey(this.balanceType, [
        owner,
        txId,
      ]);
      await ctx.stub.putState(
        newUtxoId,
        marshal({ Minter: mintedValue.Minter, Quantity: newUtxo }),
      );
      return [
        UTXO.newInstance({
          Id: txId,
          Owner: owner,
          Quantity: newUtxo,
          Minter: mintedValue.Minter,
        }),
      ];
    }
    return [];
  }
}
