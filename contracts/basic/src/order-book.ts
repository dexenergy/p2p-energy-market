/*
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Context,
  Contract,
  Info,
  Param,
  Returns,
  Transaction,
} from "fabric-contract-api";
import { Order } from "./model";
import { EnergyConsumptionContract, EnergyGenerationContract } from "./energy";
import { CreditContract } from "./credit";
import { TradesContract } from "./trades";
import { marshal, mult, unmarshal } from "./utils";
import { matchingOrders } from "./clearing";
import { iterareOrders } from "./iterator-helpers";

export const saleOrderType = "SaleOrder";
export const buyOrderType = "BuyOrder";

export class OrderBookContext extends Context {
  public credit: CreditContract;
  public energyConsumption: EnergyConsumptionContract;
  public energyGeneration: EnergyGenerationContract;
  public trades: TradesContract;

  constructor() {
    super();
    this.credit = new CreditContract();
    this.energyConsumption = new EnergyConsumptionContract();
    this.energyGeneration = new EnergyGenerationContract();
    this.trades = new TradesContract();
  }
}
@Info({ title: "Order Book", description: "Order Book smart contract" })
export class OrderBookContract extends Contract {
  createContext(): Context {
    return new OrderBookContext();
  }

  @Transaction(true)
  @Returns("Order")
  async createBuyOrder(
    ctx: OrderBookContext,
    creditUtxoId: string,
    consumptionUtxoId: string,
    quantity: number,
    price: number,
  ): Promise<Order> {
    const energyUtxo = await ctx.energyConsumption._getUTXOById(
      ctx,
      consumptionUtxoId,
    );
    await ctx.energyConsumption._spend(ctx, consumptionUtxoId, quantity);
    await ctx.credit._spend(ctx, creditUtxoId, mult(quantity, price));

    const owner = ctx.clientIdentity.getID();
    const txId = ctx.stub.getTxID();
    const txdate = ctx.stub.getDateTimestamp();
    const dayOfMonth = `${txdate.getDate()}-${
      txdate.getMonth() + 1
    }-${txdate.getFullYear()}`;

    const buyOrderKey = ctx.stub.createCompositeKey(buyOrderType, [
      dayOfMonth,
      owner,
      txId,
    ]);

    const order = Order.newInstance({
      Quantity: quantity,
      Price: price,
      Owner: owner,
      Balance: mult(quantity, price),
      Id: txId,
      Date: dayOfMonth,
      Origin: energyUtxo.Minter,
    });

    await ctx.stub.putState(buyOrderKey, marshal(order));
    return order;
  }

  @Transaction(true)
  @Param("date", "string")
  @Param("saleOrderId", "string")
  @Param("buyOrderIds", "Order[]")
  @Returns("boolean")
  async clearSaleOrder(
    ctx: OrderBookContext,
    date: string,
    saleOrderId: string,
    buyOrderIds: Order[],
  ): Promise<boolean> {
    const owner = ctx.clientIdentity.getID();
    const saleOrderKey = ctx.stub.createCompositeKey(saleOrderType, [
      date,
      owner,
      saleOrderId,
    ]);

    const saleOrder = await ctx.stub.getState(saleOrderKey);
    if (saleOrder === undefined) {
      throw new Error(
        `Sale order with id ${saleOrderId} not found for owner ${owner}`,
      );
    }
    console.log("This is the sale order: ", saleOrder);
    const saleOrderObject = Order.newInstance(unmarshal(saleOrder));
    const buyOrders = await getBuyOrderByIds(ctx, date, buyOrderIds);
    const trades = await matchingOrders(ctx, [saleOrderObject], buyOrders);
    await ctx.trades._createTradeBatch(ctx, trades);
    return trades.length > 0;
  }

  @Transaction(true)
  @Param("date", "string")
  @Param("buyOrderId", "string")
  @Param("saleOrderIds", "Order[]")
  @Returns("boolean")
  async clearBuyOrder(
    ctx: OrderBookContext,
    date: string,
    buyOrderId: string,
    saleOrderIds: Order[],
  ): Promise<boolean> {
    const owner = ctx.clientIdentity.getID();
    const buyOrderKey = ctx.stub.createCompositeKey(buyOrderType, [
      date,
      owner,
      buyOrderId,
    ]);
    const buyOrder = await ctx.stub.getState(buyOrderKey);
    if (buyOrder === undefined) {
      throw new Error(
        `Buy order with id ${buyOrderId} not found for owner ${owner}`,
      );
    }
    console.log(saleOrderIds);
    console.log(buyOrder);
    const buyOrderObject = Order.newInstance(unmarshal(buyOrder));
    const saleOrders = await getSaleOrderByIds(ctx, date, saleOrderIds);
    const trades = await matchingOrders(ctx, saleOrders, [buyOrderObject]);
    await ctx.trades._createTradeBatch(ctx, trades);
    return trades.length > 0;
  }

  @Transaction(false)
  @Returns("Order[]")
  async getClientBuyOrders(
    ctx: OrderBookContext,
    date: string,
  ): Promise<Order[]> {
    const owner = ctx.clientIdentity.getID();
    const buyOrderIterator = await ctx.stub.getStateByPartialCompositeKey(
      buyOrderType,
      [date, owner],
    );
    const buyOrders: Order[] = await iterareOrders(buyOrderIterator);
    return buyOrders;
  }

  @Transaction(false)
  @Returns("Order[]")
  async getClientSaleOrders(
    ctx: OrderBookContext,
    date: string,
  ): Promise<Order[]> {
    const owner = ctx.clientIdentity.getID();
    const saleOrderIterator = await ctx.stub.getStateByPartialCompositeKey(
      saleOrderType,
      [date, owner],
    );
    const saleOrders: Order[] = await iterareOrders(saleOrderIterator);
    return saleOrders;
  }

  @Transaction(false)
  @Returns("Order[]")
  async getAllSaleOrders(
    ctx: OrderBookContext,
    date: string,
  ): Promise<Order[]> {
    const saleOrders = await getSaleOrders(ctx, date);
    return saleOrders;
  }

  @Transaction(false)
  @Returns("Order[]")
  async getAllBuyOrders(ctx: OrderBookContext, date: string): Promise<Order[]> {
    const saleOrders = await getBuyOrders(ctx, date);
    return saleOrders;
  }

  @Transaction(true)
  @Returns("Order")
  async createSaleOrder(
    ctx: OrderBookContext,
    generationUtxoId: string,
    quantity: number,
    price: number,
  ): Promise<Order> {
    const energyUtxo = await ctx.energyGeneration._getUTXOById(
      ctx,
      generationUtxoId,
    );
    await ctx.energyGeneration._spend(ctx, generationUtxoId, quantity);
    const owner = ctx.clientIdentity.getID();
    const txId = ctx.stub.getTxID();
    const date = ctx.stub.getDateTimestamp();
    const dayOfMonth = `${date.getDate()}-${
      date.getMonth() + 1
    }-${date.getFullYear()}`;

    const saleOrderKey = ctx.stub.createCompositeKey(saleOrderType, [
      dayOfMonth,
      owner,
      txId,
    ]);
    const order = Order.newInstance({
      Quantity: quantity,
      Price: price,
      Owner: owner,
      Balance: mult(quantity, price),
      Id: txId,
      Date: dayOfMonth,
      Origin: energyUtxo.Minter,
    });
    await ctx.stub.putState(saleOrderKey, marshal(order));
    return order;
  }
}

async function getSaleOrders(ctx: Context, date: string): Promise<Order[]> {
  const saleOrderIterator = await ctx.stub.getStateByPartialCompositeKey(
    saleOrderType,
    [date],
  );
  const saleOrders: Order[] = await iterareOrders(saleOrderIterator);
  return saleOrders;
}

async function getBuyOrders(ctx: Context, date: string): Promise<Order[]> {
  const buyOrderIterator = await ctx.stub.getStateByPartialCompositeKey(
    buyOrderType,
    [date],
  );

  const buyOrders: Order[] = await iterareOrders(buyOrderIterator);

  return buyOrders;
}

async function getBuyOrderByIds(
  ctx: Context,
  date: string,
  orderIds: Order[],
): Promise<Order[]> {
  const orders = [];
  for (const orderId of orderIds) {
    const buyOrderKey = await ctx.stub.createCompositeKey(buyOrderType, [
      date,
      orderId.Owner,
      orderId.Id,
    ]);
    const orderBytes = await ctx.stub.getState(buyOrderKey);
    const buyOrder = Order.newInstance(unmarshal(orderBytes));
    orders.push(buyOrder);
  }
  return orders;
}

async function getSaleOrderByIds(
  ctx: Context,
  date: string,
  orderIds: Order[],
): Promise<Order[]> {
  const orders = [];
  for (const orderId of orderIds) {
    const saleOrderKey = await ctx.stub.createCompositeKey(saleOrderType, [
      date,
      orderId.Owner,
      orderId.Id,
    ]);
    const orderBytes = await ctx.stub.getState(saleOrderKey);
    const buyOrder = Order.newInstance(unmarshal(orderBytes));
    orders.push(buyOrder);
  }
  return orders;
}
