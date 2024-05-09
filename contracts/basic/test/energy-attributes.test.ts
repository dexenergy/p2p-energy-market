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
import {
  MockIterator,
  MockChaincodeStub,
  createMockChaincodeStub,
} from "./utils";
import { EnergyAttributeContract } from "../src/energy-attributes";
import { marshal } from "../src/utils";
use(chaiAsPromised);

describe("Test Energy Certificates smart contracts", () => {
  let ctx: SinonStubbedInstance<Context>;
  let chaincodeStub: SinonStubbedInstance<MockChaincodeStub>;
  let mockClientIdentity: SinonStubbedInstance<ClientIdentity>;
  let contract: EnergyAttributeContract;

  beforeEach(() => {
    ctx = createStubInstance(Context);
    mockClientIdentity = createStubInstance(ClientIdentity);
    mockClientIdentity.getMSPID.returns("Org1MSP");
    mockClientIdentity.getID.returns("Alice");

    ctx.clientIdentity = mockClientIdentity;
    chaincodeStub = createMockChaincodeStub();
    ctx.stub = chaincodeStub;
    contract = new EnergyAttributeContract();
    createSandbox();
  });

  afterEach(() => {
    chaincodeStub.states = {};
    chaincodeStub.getState.restore();
    chaincodeStub.putState.restore();
    chaincodeStub.createCompositeKey.restore();
  });

  describe("Call methods in contract", () => {
    it("meter mint token", async () => {
      const amount = 10;
      mockClientIdentity.assertAttributeValue.returns(true);
      const result = await contract._mint(ctx, "meter2", "Bob", amount);
      assert.calledWith(
        chaincodeStub.putState,
        "ClaimedEnergy_Bob_tx1",
        marshal({ Quantity: amount, Minter: "meter2" }),
      );
      expect(result).to.deep.equal({
        Quantity: amount,
        Owner: "Bob",
        Id: "tx1",
        Origin: "meter2",
      });
    });
    it("get Balance", async () => {
      chaincodeStub.getStateByPartialCompositeKey.resolves(
        new MockIterator([]),
      );
      expect(await contract.getClaimedEnergy(ctx)).to.deep.equal([]);
      assert.calledWith(
        chaincodeStub.getStateByPartialCompositeKey,
        "ClaimedEnergy",
        ["Alice"],
      );
    });
  });
});
