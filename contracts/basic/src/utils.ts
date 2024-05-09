import { Context } from "fabric-contract-api";
import stringify from "json-stringify-deterministic";
import sortKeysRecursive from "sort-keys-recursive";
import { MintedQuantity, Order, UTXO } from "./model";

export function marshal(o: object): Buffer {
  return Buffer.from(toJSON(o));
}
export function toJSON(o: object): string {
  // Insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
  return stringify(sortKeysRecursive(o));
}
export function unmarshal(bytes: Uint8Array | string): object {
  const json = typeof bytes === "string" ? bytes : utf8Decoder.decode(bytes);
  console.log("This is the json Object: ", json);
  const parsed: unknown = JSON.parse(json);
  if (parsed === null || typeof parsed !== "object") {
    throw new Error(`Invalid JSON type (${typeof parsed}): ${json}`);
  }
  return parsed;
}
export function nestedCopy(array: object[]) {
  return JSON.parse(JSON.stringify(array));
}
export const utf8Decoder = new TextDecoder();
export async function _utxoMintHelper(
  ctx: Context,
  balanceType: string,
  to: string,
  amount: number,
): Promise<UTXO> {
  if (amount <= 0) {
    throw new Error("mint amount must be a positive integer");
  }
  const txId = ctx.stub.getTxID();
  const minter = ctx.clientIdentity.getID();
  const tokenKey = ctx.stub.createCompositeKey(balanceType, [to, txId]);
  const mintedQuantity: MintedQuantity = {
    Minter: minter,
    Quantity: amount,
  };

  await ctx.stub.putState(tokenKey, marshal(mintedQuantity));

  // Emit the Transfer event
  const transferEvent = { from: "0x0", to: to, value: amount };
  ctx.stub.setEvent(
    "utxoMint-" + balanceType,
    Buffer.from(JSON.stringify(transferEvent)),
  );
  console.log(`minter account ${to} balance updated with ${amount}`);
  return UTXO.newInstance({
    Id: txId,
    Owner: to,
    Quantity: amount,
    Minter: minter,
  });
}

export async function publishOrderEvent(
  ctx: Context,
  eventName: string,
  order: Order,
): Promise<void> {
  const eventBuffer = Buffer.from(JSON.stringify(order));
  ctx.stub.setEvent(eventName, eventBuffer);
}
export function sub(a: number, b: number): number {
  const c = a - b;
  if (a !== c + b || b !== a - c) {
    throw new Error(`Math: subtraction overflow occurred ${a} - ${b}`);
  }
  return c;
}

export function mult(a: number, b: number): number {
  return Math.floor(a * b);
}
