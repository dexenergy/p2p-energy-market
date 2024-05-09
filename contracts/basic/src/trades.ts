import { Context, Contract, Transaction, Returns } from "fabric-contract-api";
import { unmarshal } from "./utils";
import { marshal } from "./utils";
import { Trade } from "./model";
import { CreditContract } from "./credit";
import { EnergyAttributeContract } from "./energy-attributes";

const allowancePrefix = "tradeAllowance";
const tradesPrefix = "trades";
const pendingTradesPrefix = "pendingTrades";
export class TradesContext extends Context {
  public credit: CreditContract;
  public eacContract: EnergyAttributeContract;

  constructor() {
    super();
    this.credit = new CreditContract();
    this.eacContract = new EnergyAttributeContract();
  }
}
export class TradesContract extends Contract {
  createContext(): Context {
    return new TradesContext();
  }
  @Transaction(false)
  @Returns("Trade[]")
  async getTrades(ctx: TradesContext): Promise<Trade[]> {
    const owner = ctx.clientIdentity.getID();
    const iterator = await ctx.stub.getStateByPartialCompositeKey(
      pendingTradesPrefix,
      [owner],
    );
    let res = await iterator.next();

    const trades: Trade[] = [];

    while (!res.done) {
      const trade = Trade.newInstance(unmarshal(res.value.value));
      trades.push(trade);
      res = await iterator.next();
    }
    return trades;
  }

  @Transaction(true)
  @Returns("boolean")
  async claimCredit(ctx: TradesContext, txId: string): Promise<boolean> {
    const owner = ctx.clientIdentity.getID();
    const tradeKey = ctx.stub.createCompositeKey(tradesPrefix, [txId]);
    const trade = await ctx.stub.getState(tradeKey);
    if (!trade) {
      throw new Error("Trade not found");
    }
    const tradeObject = Trade.newInstance(unmarshal(trade));
    if (tradeObject.sellerAddress !== owner) {
      throw new Error("Credit can only be claimed by seller");
    }
    const approvalKey = ctx.stub.createCompositeKey(allowancePrefix, [
      tradeObject.buyerAddress,
      txId,
    ]);

    const approval = await ctx.stub.getState(approvalKey);
    if (!approval) {
      throw new Error("Trade not approved by Energy Buyer");
    }

    await ctx.credit._mint(
      ctx,
      tradeObject.sellerAddress,
      tradeObject.creditBalance,
    );
    tradeObject.creditBalance = 0;
    await ctx.stub.putState(tradeKey, marshal(tradeObject));
    if (tradeObject.energyBalance === 0 && tradeObject.creditBalance === 0) {
      await ctx.stub.deleteState(tradeKey);
    }
    return true;
  }

  @Transaction(true)
  @Returns("boolean")
  async claimEnergy(ctx: TradesContext, txId: string): Promise<boolean> {
    const owner = ctx.clientIdentity.getID();
    const tradeKey = ctx.stub.createCompositeKey(tradesPrefix, [txId]);
    const trade = await ctx.stub.getState(tradeKey);
    if (!trade) {
      throw new Error("Trade not found");
    }

    const tradeObject = Trade.newInstance(unmarshal(trade));
    if (tradeObject.buyerAddress !== owner) {
      throw new Error("Energy can only be claimed by buyer");
    }
    const approvalKey = ctx.stub.createCompositeKey(allowancePrefix, [
      tradeObject.sellerAddress,
      txId,
    ]);
    const approval = await ctx.stub.getState(approvalKey);
    if (!approval) {
      throw new Error("Trade not approved by Energy Seller");
    }
    await ctx.eacContract._mint(
      ctx,
      tradeObject.Origin,
      tradeObject.buyerAddress,
      tradeObject.energyBalance,
    );
    tradeObject.energyBalance = 0;
    await ctx.stub.putState(tradeKey, marshal(tradeObject));
    if (tradeObject.energyBalance === 0 && tradeObject.creditBalance === 0) {
      await ctx.stub.deleteState(tradeKey);
    }
    return true;
  }

  @Transaction(true)
  @Returns("boolean")
  async approve(ctx: TradesContext, txId: string): Promise<boolean> {
    const owner = ctx.clientIdentity.getID();
    const tradeKey = ctx.stub.createCompositeKey(tradesPrefix, [txId]);
    const trade = await ctx.stub.getState(tradeKey);
    if (!trade) {
      throw new Error("Trade not found");
    }
    const tradeObject = Trade.newInstance(unmarshal(trade));

    if (
      tradeObject.sellerAddress !== owner &&
      tradeObject.buyerAddress !== owner
    ) {
      throw new Error("Trade can only be approved by seller or buyer");
    }

    const approvalKey = ctx.stub.createCompositeKey(allowancePrefix, [
      owner,
      txId,
    ]);
    await ctx.stub.putState(approvalKey, marshal(tradeObject));
    return true;
  }
  async _createTrade(ctx: Context, trade: Trade) {
    console.log("Creating trade", trade);
    await storeTrade(ctx, trade);
    await storePendingTrade(ctx, trade.buyerAddress, trade);
    await storePendingTrade(ctx, trade.sellerAddress, trade);
    ctx.stub.setEvent("TradeCreated", Buffer.from(JSON.stringify(trade)));
  }
  async _createTradeBatch(ctx: Context, trades: Trade[]) {
    for (let i = 0; trades.length > i; i++) {
      await this._createTrade(ctx, trades[i]);
    }
  }
}

async function storeTrade(ctx: Context, trade: Trade) {
  const tradeKey = ctx.stub.createCompositeKey(tradesPrefix, [trade.Id]);
  await ctx.stub.putState(tradeKey, marshal(trade));
}

async function storePendingTrade(ctx: Context, owner: string, trade: Trade) {
  const tradeKey = ctx.stub.createCompositeKey(pendingTradesPrefix, [
    owner,
    trade.Id,
  ]);
  await ctx.stub.putState(tradeKey, marshal(trade));
}
