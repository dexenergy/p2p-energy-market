import { expect } from "chai";
import { SinonStubbedInstance, createStubInstance, createSandbox } from "sinon";
import {
  iterateEAC,
  iterateUTXO,
  iterareOrders,
} from "../src/iterator-helpers";

import { beforeEach, afterEach, describe, it } from "node:test";

import {
  MockIterator,
  MockChaincodeStub,
  createMockChaincodeStub,
} from "./utils";
import { Context } from "fabric-contract-api";
import { marshal } from "../src/utils";

describe("Test iterate Helpers ", () => {
  let ctx: SinonStubbedInstance<Context>;
  let chaincodeStub: SinonStubbedInstance<MockChaincodeStub>;

  beforeEach(() => {
    ctx = createStubInstance(Context);

    chaincodeStub = createMockChaincodeStub();
    ctx.stub = chaincodeStub;
    createSandbox();
  });

  afterEach(() => {
    chaincodeStub.getState.restore();
    chaincodeStub.putState.restore();
    chaincodeStub.createCompositeKey.restore();
  });

  describe("Call EAC iteraror ", () => {
    it("iterate over empty list", async () => {
      const iterator = new MockIterator([]);
      const results = await iterateEAC(iterator, ctx);
      expect(results).to.be.eql([]);
    });
    it("iterate over list", async () => {
      const iterator = new MockIterator([
        {
          key: "Alice_101",
          value: marshal({ Minter: "meter4", Quantity: 12 }),
          namespace: "balance",
        },
      ]);
      const results = await iterateEAC(iterator, ctx);
      expect(results).to.be.eql([
        { Owner: "Alice", Quantity: 12, Id: "101", Origin: "meter4" },
      ]);
    });
  });
  describe("Call UTXO iteraror ", () => {
    it("iterate over empty list", async () => {
      const iterator = new MockIterator([]);
      const results = await iterateUTXO(iterator, ctx);
      expect(results).to.be.eql([]);
    });
    it("iterate over list", async () => {
      const mintedQuantity = { Quantity: 12, Minter: "Bob" };
      const iterator = new MockIterator([
        {
          key: "Alice_101",
          value: marshal(mintedQuantity),
          namespace: "balance",
        },
      ]);
      const results = await iterateUTXO(iterator, ctx);
      expect(results).to.be.eql([
        { Owner: "Alice", Quantity: 12, Id: "101", Minter: "Bob" },
      ]);
    });
  });
  describe("Call Order iteraror ", () => {
    it("iterate over empty list", async () => {
      const iterator = new MockIterator([]);
      const results = await iterareOrders(iterator);
      expect(results).to.be.eql([]);
    });
    it("iterate over list", async () => {
      const order = {
        Quantity: 1,
        Price: 1,
        Owner: "Alice",
        Balance: 1,
        Id: "102",
        Date: "",
        Origin: "",
      };
      const iterator = new MockIterator([
        { key: "Alice_101", value: marshal(order), namespace: "balance" },
      ]);
      const results = await iterareOrders(iterator);
      expect(results).to.be.eql([order]);
    });
  });
});
