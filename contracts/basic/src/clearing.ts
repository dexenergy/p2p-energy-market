import * as crypto from "crypto";
import { saleOrderType, buyOrderType } from "./order-book";

import { Context } from "fabric-contract-api";
import { Order, Trade } from "./model";
import { nestedCopy, marshal, publishOrderEvent, sub, mult } from "./utils";

export async function matchingOrders(
  ctx: Context,
  saleOrders: Order[],
  buyOrders: Order[],
): Promise<Trade[]> {
  const result: Trade[] = [];
  saleOrders = nestedCopy(saleOrders.sort((a, b) => a.Price - b.Price));
  buyOrders = nestedCopy(
    buyOrders.sort((a, b) => b.Price - a.Price).map((x) => x),
  );
  let i: number = 0;
  let j: number = 0;
  if (saleOrders.length == 0 || buyOrders.length == 0) {
    return result;
  }
  const deadline = ctx.stub.getDateTimestamp();
  deadline.setDate(deadline.getDate() + 7);
  while (saleOrders[i].Price <= buyOrders[j].Price) {
    const transcationQuantity = Math.min(
      saleOrders[i].Quantity,
      buyOrders[j].Quantity,
    );
    const txId = ctx.stub.getTxID();
    const transactionPrice = saleOrders[i].Price;
    const hash = crypto.createHash("sha256");
    hash.update(saleOrders[i].Id + buyOrders[j].Id + txId);
    result.push(
      Trade.newInstance({
        Id: hash.digest("hex"),
        sellerAddress: saleOrders[i].Owner,
        buyerAddress: buyOrders[j].Owner,
        creditBalance: transactionPrice * transcationQuantity,
        energyBalance: transcationQuantity,
        deadline: deadline.toISOString(),
        Origin: saleOrders[i].Origin,
      }),
    );

    saleOrders[i].Quantity = saleOrders[i].Quantity - transcationQuantity;
    const saleOrderKey = ctx.stub.createCompositeKey(saleOrderType, [
      saleOrders[i].Date,
      saleOrders[i].Owner,
      saleOrders[i].Id,
    ]);

    if (saleOrders[i].Quantity == 0) {
      await ctx.stub.deleteState(saleOrderKey);
      publishOrderEvent(ctx, "ClearSaleOrder", saleOrders[i]);
      i++;
    } else {
      await ctx.stub.putState(saleOrderKey, marshal(saleOrders[i]));
    }
    buyOrders[j].Balance = sub(
      buyOrders[j].Balance,
      mult(transcationQuantity, transactionPrice),
    );
    buyOrders[j].Quantity = sub(buyOrders[j].Quantity, transcationQuantity);
    const buyOrderKey = ctx.stub.createCompositeKey(buyOrderType, [
      buyOrders[j].Date,
      buyOrders[j].Owner,
      buyOrders[j].Id,
    ]);
    if (buyOrders[j].Quantity == 0) {
      await ctx.stub.deleteState(buyOrderKey);

      publishOrderEvent(ctx, "ClearBuyOrder", buyOrders[j]);
      j++;
    } else {
      await ctx.stub.putState(buyOrderKey, marshal(buyOrders[j]));
    }
    if (i >= saleOrders.length || j >= buyOrders.length) {
      break;
    }
  }
  return result;
}
