import { Context } from "fabric-contract-api";
import { Iterators } from "fabric-shim-api";
import { EAC, MintedQuantity, Order, UTXO } from "./model";
import { unmarshal } from "./utils";

export async function iterateEAC(
  iterator: Iterators.StateQueryIterator,
  ctx: Context,
): Promise<EAC[]> {
  let queryResponse = await iterator.next();
  const balance: EAC[] = [];
  while (!queryResponse.done) {
    const compositeKey = ctx.stub.splitCompositeKey(queryResponse.value.key);
    const mintedValue = MintedQuantity.newInstance(
      unmarshal(queryResponse.value.value),
    );
    balance.push(
      EAC.newInstance({
        Id: compositeKey.attributes[1],
        Owner: compositeKey.attributes[0],
        Quantity: mintedValue.Quantity,
        Origin: mintedValue.Minter,
      }),
    );
    queryResponse = await iterator.next();
  }
  return balance;
}
export async function iterateUTXO(
  iterator: Iterators.StateQueryIterator,
  ctx: Context,
) {
  let queryResponse = await iterator.next();
  const balance: UTXO[] = [];
  while (!queryResponse.done) {
    const compositeKey = ctx.stub.splitCompositeKey(queryResponse.value.key);
    const mintedValue: MintedQuantity = MintedQuantity.newInstance(
      unmarshal(queryResponse.value.value),
    );
    balance.push(
      UTXO.newInstance({
        Id: compositeKey.attributes[1],
        Owner: compositeKey.attributes[0],
        Quantity: mintedValue.Quantity,
        Minter: mintedValue.Minter,
      }),
    );
    queryResponse = await iterator.next();
  }
  return balance;
}
export async function iterareOrders(
  saleOrderIterator: Iterators.StateQueryIterator,
) {
  let res = await saleOrderIterator.next();
  const saleOrders: Order[] = [];
  while (!res.done) {
    const saleOrder = Order.newInstance(unmarshal(res.value.value));
    saleOrders.push(saleOrder);
    res = await saleOrderIterator.next();
  }
  return saleOrders;
}
