import {
  Info,
  Contract,
  Transaction,
  Returns,
  Context,
} from "fabric-contract-api";
import { EAC } from "./model";
import { iterateEAC } from "./iterator-helpers";
import { marshal } from "./utils";

const claimedEnergyPrefix = "ClaimedEnergy";

@Info({
  title: "Energy Attribute Certificates",
  description: "EAC smart contract",
})
export class EnergyAttributeContract extends Contract {
  @Transaction(false)
  @Returns("EAC[]")
  async getClaimedEnergy(ctx: Context): Promise<EAC[]> {
    const owner = ctx.clientIdentity.getID();
    const iterator = await ctx.stub.getStateByPartialCompositeKey(
      claimedEnergyPrefix,
      [owner],
    );
    const balance: EAC[] = await iterateEAC(iterator, ctx);
    return balance;
  }
  async _mint(
    ctx: Context,
    origin: string,
    to: string,
    amount: number,
  ): Promise<EAC> {
    if (amount <= 0) {
      throw new Error("mint amount must be a positive integer");
    }
    const txId = ctx.stub.getTxID();

    const tokenKey = ctx.stub.createCompositeKey(claimedEnergyPrefix, [
      to,
      txId,
    ]);

    await ctx.stub.putState(
      tokenKey,
      marshal({ Minter: origin, Quantity: amount }),
    );

    // Emit the Transfer event
    const transferEvent = { from: "0x0", to: to, value: amount };
    ctx.stub.setEvent("eacMint", Buffer.from(JSON.stringify(transferEvent)));
    console.log(`minter account ${to} balance updated with ${amount}`);
    return EAC.newInstance({
      Id: txId,
      Owner: to,
      Quantity: amount,
      Origin: origin,
    });
  }
}
