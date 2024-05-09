import { expect } from "chai";
import {
  SinonStubbedInstance,
  createStubInstance,
  assert,
  createSandbox,
} from "sinon";
import { ClientIdentity } from "fabric-shim";
import * as crypto from "crypto";

import { OrderBookContext, OrderBookContract } from "../src/order-book";
import { marshal } from "../src/utils";

import { afterEach, describe } from "node:test";
import { CreditContract } from "../src/credit";
import {
  EnergyConsumptionContract,
  EnergyGenerationContract,
} from "../src/energy";
import {
  MockIterator,
  MockChaincodeStub,
  createMockChaincodeStub,
} from "./utils";
import { TradesContract } from "../src/trades";

describe("Test Order Book smart contract ", () => {
  let ctx: SinonStubbedInstance<OrderBookContext>;
  let chaincodeStub: SinonStubbedInstance<MockChaincodeStub>;
  let mockClientIdentity: SinonStubbedInstance<ClientIdentity>;
  let contract: OrderBookContract;
  let credit: SinonStubbedInstance<CreditContract>;
  let energyConsumption: SinonStubbedInstance<EnergyConsumptionContract>;
  let energyGeneration: SinonStubbedInstance<EnergyGenerationContract>;
  let trades: SinonStubbedInstance<TradesContract>;

  beforeEach(() => {
    ctx = createStubInstance(OrderBookContext);
    credit = createStubInstance(CreditContract);
    energyConsumption = createStubInstance(EnergyConsumptionContract);
    energyGeneration = createStubInstance(EnergyGenerationContract);
    ctx.credit = credit;
    ctx.energyConsumption = energyConsumption;
    ctx.energyGeneration = energyGeneration;
    trades = createStubInstance(TradesContract);
    ctx.trades = trades;

    mockClientIdentity = createStubInstance(ClientIdentity);
    mockClientIdentity.getMSPID.returns("Org1MSP");
    mockClientIdentity.getID.returns("Alice");
    ctx.clientIdentity = mockClientIdentity;
    chaincodeStub = createMockChaincodeStub();
    ctx.stub = chaincodeStub;
    contract = new OrderBookContract();
    createSandbox();
  });

  afterEach(() => {
    chaincodeStub.states = {};
    chaincodeStub.getState.restore();
    chaincodeStub.putState.restore();
    chaincodeStub.createCompositeKey.restore();
  });

  describe("Call methods in contract", () => {
    it("Call create sale order in Order Book", async () => {
      energyGeneration._getUTXOById.resolves({
        Quantity: 100,
        Minter: "meter",
      });
      await contract.createSaleOrder(ctx, "tx3", 10, 10);
      assert.calledWith(energyGeneration._spend, ctx, "tx3", 10);
      assert.calledWith(chaincodeStub.createCompositeKey, "SaleOrder", [
        "29-4-2021",
        "Alice",
        "tx1",
      ]);
      assert.calledWith(
        chaincodeStub.putState,
        "SaleOrder_29-4-2021_Alice_tx1",
        marshal({
          Quantity: 10,
          Price: 10,
          Owner: "Alice",
          Balance: 100,
          Id: "tx1",
          Date: "29-4-2021",
          Origin: "meter",
        }),
      );
      assert.calledOnce(mockClientIdentity.getID);
    });

    it("Call create buy order in Order Book", async () => {
      const contract = new OrderBookContract();
      energyConsumption._getUTXOById.resolves({
        Quantity: 100,
        Minter: "meter",
      });
      await chaincodeStub.putState(
        "CreditBalance_Alice",
        marshal({ Quantity: 10, Minter: "payService" }),
      );
      await chaincodeStub.putState(
        "EnergyConsumptionBalance_Alice",
        marshal({ Quantity: 10, Minter: "meter" }),
      );

      await contract.createBuyOrder(ctx, "tx1", "tx2", 10, 10);
      assert.calledWith(energyConsumption._spend, ctx, "tx2", 10);
      assert.calledWith(credit._spend, ctx, "tx1", 100);
      assert.calledWith(
        chaincodeStub.putState,
        "BuyOrder_29-4-2021_Alice_tx1",
        marshal({
          Quantity: 10,
          Price: 10,
          Owner: "Alice",
          Balance: 100,
          Id: "tx1",
          Date: "29-4-2021",
          Origin: "meter",
        }),
      );

      assert.calledOnce(mockClientIdentity.getID);
    });

    it("Call get buy orders", async () => {
      chaincodeStub.getStateByPartialCompositeKey.resolves(
        new MockIterator([]),
      );
      contract.getAllBuyOrders(ctx, "12-03-2024");
      assert.calledWith(
        chaincodeStub.getStateByPartialCompositeKey,
        "BuyOrder",
        ["12-03-2024"],
      );
    });
    it("Call get sales orders", async () => {
      chaincodeStub.getStateByPartialCompositeKey.resolves(
        new MockIterator([]),
      );
      contract.getAllSaleOrders(ctx, "12-03-2024");
      assert.calledWith(
        chaincodeStub.getStateByPartialCompositeKey,
        "SaleOrder",
        ["12-03-2024"],
      );
    });
    it("Call get client sales orders", async () => {
      chaincodeStub.getStateByPartialCompositeKey.resolves(
        new MockIterator([]),
      );
      expect(await contract.getClientSaleOrders(ctx, "12-03-2024")).to.be.eql(
        [],
      );
      assert.calledWith(
        chaincodeStub.getStateByPartialCompositeKey,
        "SaleOrder",
        ["12-03-2024", "Alice"],
      );
    });
    it("Call get client buy orders", async () => {
      chaincodeStub.getStateByPartialCompositeKey.resolves(
        new MockIterator([]),
      );
      expect(await contract.getClientBuyOrders(ctx, "10-03-2024")).to.be.eql(
        [],
      );
      assert.calledWith(
        chaincodeStub.getStateByPartialCompositeKey,
        "BuyOrder",
        ["10-03-2024", "Alice"],
      );
    });
    it("Call clear Buy Order", async () => {
      const buyOrder = marshal({
        Quantity: 10,
        Price: 10,
        Owner: "Alice",
        Balance: 100,
        Id: "tx2",
        Date: "12-03-2024",
        Origin: "meter1",
      });
      const saleOrder = {
        Quantity: 10,
        Price: 10,
        Owner: "Bob",
        Balance: 100,
        Id: "tx3",
        Date: "12-03-2024",
        Origin: "meter",
      };
      const saleOrderMarshal = marshal(saleOrder);
      chaincodeStub.getState
        .withArgs("BuyOrder_12-03-2024_Alice_tx2")
        .resolves(buyOrder);
      chaincodeStub.getState
        .withArgs("SaleOrder_12-03-2024_Bob_tx3")
        .resolves(saleOrderMarshal);
      await contract.clearBuyOrder(ctx, "12-03-2024", "tx2", [saleOrder]);
      const hash = crypto.createHash("sha256");
      hash.update("tx3tx2tx1");
      const expectedTrade = {
        Id: hash.digest("hex"),
        creditBalance: 100,
        sellerAddress: "Bob",
        buyerAddress: "Alice",
        energyBalance: 10,
        deadline: "2021-05-06T22:00:00.000Z",
        Origin: "meter",
      };
      assert.calledWith(trades._createTradeBatch, ctx, [expectedTrade]);
    });
    it("Call clear Sale Order", async () => {
      const buyOrder = {
        Quantity: 10,
        Price: 10,
        Owner: "Bob",
        Balance: 100,
        Id: "tx2",
        Date: "12-03-2024",
        Origin: "meter1",
      };
      const buyOrderMarshal = marshal(buyOrder);
      const saleOrder = marshal({
        Quantity: 10,
        Price: 10,
        Owner: "Alice",
        Balance: 100,
        Id: "tx3",
        Date: "12-03-2024",
        Origin: "meter",
      });
      chaincodeStub.getState
        .withArgs("SaleOrder_12-03-2024_Alice_tx3")
        .resolves(saleOrder);
      chaincodeStub.getState
        .withArgs("BuyOrder_12-03-2024_Bob_tx2")
        .resolves(buyOrderMarshal);
      await contract.clearSaleOrder(ctx, "12-03-2024", "tx3", [buyOrder]);
      const hash = crypto.createHash("sha256");
      hash.update("tx3tx2tx1");
      const expectedTrade = {
        Id: hash.digest("hex"),
        creditBalance: 100,
        sellerAddress: "Alice",
        buyerAddress: "Bob",
        energyBalance: 10,
        deadline: "2021-05-06T22:00:00.000Z",
        Origin: "meter",
      };
      assert.calledWith(trades._createTradeBatch, ctx, [expectedTrade]);
    });
  });
});
