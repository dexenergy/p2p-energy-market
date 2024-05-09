import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";
import {
  SinonStubbedInstance,
  createStubInstance,
  assert,
  createSandbox,
} from "sinon";
import { ClientIdentity } from "fabric-shim";
import { Context } from "fabric-contract-api";

import { afterEach, describe } from "node:test";
import { EnergyConsumptionContract } from "../src/energy";

import {
  MockIterator,
  MockChaincodeStub,
  createMockChaincodeStub,
} from "./utils";
import { marshal } from "../src/utils";
use(chaiAsPromised);

describe("Test Energy Consumption smart contracts", () => {
  let ctx: SinonStubbedInstance<Context>;
  let chaincodeStub: SinonStubbedInstance<MockChaincodeStub>;
  let mockClientIdentity: SinonStubbedInstance<ClientIdentity>;
  let contract: EnergyConsumptionContract;

  beforeEach(() => {
    ctx = createStubInstance(Context);
    mockClientIdentity = createStubInstance(ClientIdentity);
    mockClientIdentity.getMSPID.returns("Org1MSP");
    mockClientIdentity.getID.returns("Alice");

    ctx.clientIdentity = mockClientIdentity;
    chaincodeStub = createMockChaincodeStub();
    ctx.stub = chaincodeStub;
    contract = new EnergyConsumptionContract();
    createSandbox();
  });

  afterEach(() => {
    chaincodeStub.states = {};
    chaincodeStub.getState.restore();
    chaincodeStub.putState.restore();
    chaincodeStub.createCompositeKey.restore();
  });

  describe("Call methods in contract", () => {
    it("Correct type", async () => {
      expect(contract.balanceType).to.be.equal("EnergyConsumptionBalance");
    });
    it("meter mint token", async () => {
      mockClientIdentity.assertAttributeValue.returns(true);
      const result = await contract.Mint(ctx, "Bob", 12);
      assert.calledWith(
        chaincodeStub.putState,
        "EnergyConsumptionBalance_Bob_tx1",
        marshal({ Minter: "Alice", Quantity: 12 }),
      );
      expect(result).to.deep.equal({
        Quantity: 12,
        Owner: "Bob",
        Id: "tx1",
        Minter: "Alice",
      });
      const expectedEvent = { from: "0x0", to: "Bob", value: 12 };
      assert.calledWith(
        chaincodeStub.setEvent,
        "utxoMint-EnergyConsumptionBalance",
        marshal(expectedEvent),
      );
    });
    it("meter mint token", async () => {
      mockClientIdentity.assertAttributeValue.returns(false);
      expect(contract.Mint(ctx, "Bob", 1000)).to.eventually.rejectedWith(
        "This user is not allowed to mint",
      );
    });
    it("get Balance", async () => {
      chaincodeStub.getStateByPartialCompositeKey.resolves(
        new MockIterator([]),
      );
      expect(await contract.BalanceOf(ctx)).to.deep.equal([]);
      assert.calledWith(
        chaincodeStub.getStateByPartialCompositeKey,
        "EnergyConsumptionBalance",
        ["Alice"],
      );
    });
    it("call _spend method", async () => {
      chaincodeStub.putState(
        "EnergyConsumptionBalance_Alice_tx3",
        marshal({ Minter: "meter", Quantity: 10 }),
      );
      expect(await contract._spend(ctx, "tx3", 10)).to.deep.equal([]);
      assert.calledWith(
        chaincodeStub.createCompositeKey,
        "EnergyConsumptionBalance",
        ["Alice", "tx3"],
      );
    });
    it("_spend does not consume total token", async () => {
      chaincodeStub.putState(
        "EnergyConsumptionBalance_Alice_tx5",
        marshal({ Minter: "meter", Quantity: 10 }),
      );
      expect(await contract._spend(ctx, "tx5", 5)).to.deep.equal([
        { Quantity: 5, Owner: "Alice", Id: "tx1", Minter: "meter" },
      ]);
      assert.calledWith(
        chaincodeStub.createCompositeKey,
        "EnergyConsumptionBalance",
        ["Alice", "tx5"],
      );
      assert.calledWith(
        chaincodeStub.createCompositeKey,
        "EnergyConsumptionBalance",
        ["Alice", "tx1"],
      );
      assert.calledWith(
        chaincodeStub.putState,
        "EnergyConsumptionBalance_Alice_tx1",
        marshal({ Minter: "meter", Quantity: 5 }),
      );
    });
    it("Owner don't have tokens", async () => {
      expect(contract._spend(ctx, "tx8", 1000)).to.eventually.rejectedWith(
        "UTXO with ID tx8 does not exist for owner Alice",
      );
    });
    it("Owner tries to spend more", async () => {
      chaincodeStub.putState(
        "EnergyConsumptionBalance_Alice_tx9",
        marshal({ Minter: "meter", Quantity: 10 }),
      );
      expect(contract._spend(ctx, "tx9", 1000)).to.eventually.rejectedWith(
        "UTXO with ID tx9 does not have enough energy",
      );
    });
  });
});
