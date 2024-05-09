import { expect } from "chai";
import {
  SinonStubbedInstance,
  createStubInstance,
  createSandbox,
  assert,
} from "sinon";
import { ClientIdentity } from "fabric-shim";
import { afterEach, describe } from "node:test";
import { TradesContract, TradesContext } from "../src/trades";
import {
  MockChaincodeStub,
  MockIterator,
  createMockChaincodeStub,
} from "./utils";
import { marshal } from "../src/utils";
import { Trade } from "../src/model";
import { CreditContract } from "../src/credit";
import { EnergyAttributeContract } from "../src/energy-attributes";

describe("Test Trades smart contract ", () => {
  let ctx: SinonStubbedInstance<TradesContext>;
  let chaincodeStub: SinonStubbedInstance<MockChaincodeStub>;
  let mockClientIdentity: SinonStubbedInstance<ClientIdentity>;
  let contract: TradesContract;
  let eacContract: SinonStubbedInstance<EnergyAttributeContract>;
  let credit: SinonStubbedInstance<CreditContract>;

  beforeEach(() => {
    ctx = createStubInstance(TradesContext);
    eacContract = createStubInstance(EnergyAttributeContract);
    credit = createStubInstance(CreditContract);
    ctx.eacContract = eacContract;
    ctx.credit = credit;
    mockClientIdentity = createStubInstance(ClientIdentity);
    mockClientIdentity.getMSPID.returns("Org1MSP");
    mockClientIdentity.getID.returns("Alice");
    ctx.clientIdentity = mockClientIdentity;
    chaincodeStub = createMockChaincodeStub();
    ctx.stub = chaincodeStub;
    contract = new TradesContract();
    createSandbox();
  });

  afterEach(() => {
    chaincodeStub.states = {};
    chaincodeStub.getState.restore();
    chaincodeStub.putState.restore();
    chaincodeStub.createCompositeKey.restore();
  });

  describe("Call methods in contract", () => {
    it("Call get Trades", async () => {
      chaincodeStub.getStateByPartialCompositeKey.resolves(
        new MockIterator([]),
      );
      const results = await contract.getTrades(ctx);
      expect(results).to.deep.equal([]);
    });
    it("Call get Claimed Energy", async () => {
      const eacContract = new EnergyAttributeContract();
      chaincodeStub.getStateByPartialCompositeKey.resolves(
        new MockIterator([]),
      );
      const results = await eacContract.getClaimedEnergy(ctx);
      expect(results).to.deep.equal([]);
    });
    it("Call claim Credit", async () => {
      await chaincodeStub.putState(
        "tradeAllowance_Bob_tx2",
        Buffer.from("true"),
      );
      await chaincodeStub.putState(
        "trades_tx2",
        marshal(
          Trade.newInstance({
            Id: "tx2",
            sellerAddress: "Alice",
            buyerAddress: "Bob",
            creditBalance: 10,
            energyBalance: 10,
            deadline: "2021-04-29T22:00:00.000Z",
            Origin: "meter",
          }),
        ),
      );
      await contract.claimCredit(ctx, "tx2");
      assert.calledWith(credit._mint, ctx, "Alice", 10);
    });
    it("Call claim Energy", async () => {
      await chaincodeStub.putState(
        "tradeAllowance_Bob_tx3",
        Buffer.from("true"),
      );
      await chaincodeStub.putState(
        "trades_tx3",
        marshal(
          Trade.newInstance({
            Id: "tx3",
            sellerAddress: "Bob",
            buyerAddress: "Alice",
            creditBalance: 10,
            energyBalance: 100,
            deadline: "2021-04-29T22:00:00.000Z",
            Origin: "meter",
          }),
        ),
      );
      await contract.claimEnergy(ctx, "tx3");
      assert.calledWith(eacContract._mint, ctx, "meter", "Alice", 100);
    });
  });
  it("Call approve buyer Trade", async () => {
    const trade = marshal(
      Trade.newInstance({
        Id: "tx4",
        sellerAddress: "Bob",
        buyerAddress: "Alice",
        creditBalance: 10,
        energyBalance: 100,
        deadline: "2021-04-29T22:00:00.000Z",
        Origin: "meter",
      }),
    );
    await chaincodeStub.putState("trades_tx4", trade);
    await contract.approve(ctx, "tx4");
    assert.calledWith(
      chaincodeStub.putState,
      "tradeAllowance_Alice_tx4",
      trade,
    );
  });
  it("Call approve seller Trade", async () => {
    const trade = marshal(
      Trade.newInstance({
        Id: "tx5",
        sellerAddress: "Alice",
        buyerAddress: "Bob",
        creditBalance: 10,
        energyBalance: 100,
        deadline: "2021-04-29T22:00:00.000Z",
        Origin: "meter",
      }),
    );
    await chaincodeStub.putState("trades_tx5", trade);
    await contract.approve(ctx, "tx5");
    assert.calledWith(
      chaincodeStub.putState,
      "tradeAllowance_Alice_tx5",
      trade,
    );
  });
});
