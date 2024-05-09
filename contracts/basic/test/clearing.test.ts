import { expect } from "chai";
import {
  SinonStubbedInstance,
  createStubInstance,
  createSandbox,
  assert,
} from "sinon";
import { ClientIdentity } from "fabric-shim";
import { OrderBookContext } from "../src/order-book";
import { matchingOrders } from "../src/clearing";
import { Order, Trade } from "../src/model";
import { afterEach, describe } from "node:test";

import { MockChaincodeStub } from "./utils";

describe("Test Clearing Orders", () => {
  let ctx: SinonStubbedInstance<OrderBookContext>;
  let chaincodeStub: SinonStubbedInstance<MockChaincodeStub>;
  let mockClientIdentity: SinonStubbedInstance<ClientIdentity>;

  beforeEach(() => {
    ctx = createStubInstance(OrderBookContext);

    mockClientIdentity = createStubInstance(ClientIdentity);
    mockClientIdentity.getMSPID.returns("Org1MSP");
    mockClientIdentity.getID.returns("Alice");
    ctx.clientIdentity = mockClientIdentity;
    chaincodeStub = createStubInstance(MockChaincodeStub);
    ctx.stub = chaincodeStub;
    chaincodeStub.getDateTimestamp.returns(
      new Date("2021-04-29T22:00:00.000Z"),
    );
    chaincodeStub.getTxID.returns("tx1");
    createSandbox();
  });

  afterEach(() => {
    chaincodeStub.states = {};
    chaincodeStub.getState.restore();
    chaincodeStub.putState.restore();
    chaincodeStub.createCompositeKey.restore();
  });

  describe("Testing Matching Algorithm", () => {
    it("matching the same ", async () => {
      const saleOrders: Order[] = [
        {
          Quantity: 10,
          Price: 5,
          Owner: "Alice",
          Balance: 0,
          Id: "1",
          Date: "2021-03-22",
          Origin: "meter",
        },
      ];
      const buyOrder: Order = {
        Quantity: 10,
        Price: 5,
        Owner: "Alice",
        Balance: 50,
        Id: "2",
        Date: "2021-03-22",
        Origin: "meter",
      };
      const buyOrders: Order[] = [buyOrder];
      const pairs = await matchingOrders(ctx, saleOrders, buyOrders);
      expect(pairs).to.eql([
        new Trade(
          "8cf0eaa1ff7f79be8f50fe05ff2ac2902a4f42a11dd14a084b946b189f9b948e",
          "Alice",
          "Alice",
          50,
          10,
          "2021-05-06T22:00:00.000Z",
          "meter",
        ),
      ]);
      const expectedBuyOrderBuffer = Buffer.from(
        JSON.stringify({
          Quantity: 0,
          Price: 5,
          Owner: "Alice",
          Balance: 0,
          Id: "2",
          Date: "2021-03-22",
          Origin: "meter",
        }),
      );
      const expectedSaleOrderBuffer = Buffer.from(
        JSON.stringify({
          Quantity: 0,
          Price: 5,
          Owner: "Alice",
          Balance: 0,
          Id: "1",
          Date: "2021-03-22",
          Origin: "meter",
        }),
      );
      assert.calledWith(
        chaincodeStub.setEvent,
        "ClearBuyOrder",
        expectedBuyOrderBuffer,
      );
      assert.calledWith(
        chaincodeStub.setEvent,
        "ClearSaleOrder",
        expectedSaleOrderBuffer,
      );
    });

    it("No matching orders ", async () => {
      const pairs = await matchingOrders(ctx, [], []);
      expect(pairs).to.eql([]);
    });
    it("matching the different quantities to sale", async () => {
      const saleOrders: Order[] = [
        {
          Quantity: 3,
          Price: 5,
          Owner: "Alice",
          Balance: 0,
          Id: "1",
          Date: "2021-03-22",
          Origin: "meter",
        },
        {
          Quantity: 7,
          Price: 5,
          Owner: "Alice",
          Balance: 0,
          Id: "2",
          Date: "2021-03-22",
          Origin: "meter",
        },
      ];
      const buyOrders: Order[] = [
        {
          Quantity: 10,
          Price: 5,
          Owner: "Alice",
          Balance: 50,
          Id: "3",
          Date: "2021-03-22",
          Origin: "meter",
        },
      ];

      const pairs = await matchingOrders(ctx, saleOrders, buyOrders);
      expect(pairs).to.eql([
        new Trade(
          "77c68f07d58833c4e89e86bb5858fb0a8c9855c70fe9c842226055649a57e65e",
          "Alice",
          "Alice",
          15,
          3,
          "2021-05-06T22:00:00.000Z",
          "meter",
        ),
        new Trade(
          "ffbbaf4e22d6bd76e7af0f7ad40026e182271e237993fd95a0cd73c4a2fd23eb",
          "Alice",
          "Alice",
          35,
          7,
          "2021-05-06T22:00:00.000Z",
          "meter",
        ),
      ]);
    });
    it("matching the different quantities to buy", async () => {
      const saleOrders: Order[] = [
        {
          Quantity: 17,
          Price: 5,
          Owner: "Alice",
          Balance: 0,
          Id: "1",
          Date: "2021-03-22",
          Origin: "meter",
        },
      ];
      const buyOrders: Order[] = [
        {
          Quantity: 10,
          Price: 5,
          Owner: "Alice",
          Balance: 50,
          Id: "2",
          Date: "2021-03-22",
          Origin: "meter",
        },
        {
          Quantity: 7,
          Price: 5,
          Owner: "Alice",
          Balance: 35,
          Id: "3",
          Date: "2021-03-22",
          Origin: "meter",
        },
      ];

      const pairs = await matchingOrders(ctx, saleOrders, buyOrders);
      expect(pairs).to.eql([
        new Trade(
          "8cf0eaa1ff7f79be8f50fe05ff2ac2902a4f42a11dd14a084b946b189f9b948e",
          "Alice",
          "Alice",
          50,
          10,
          "2021-05-06T22:00:00.000Z",
          "meter",
        ),
        new Trade(
          "77c68f07d58833c4e89e86bb5858fb0a8c9855c70fe9c842226055649a57e65e",
          "Alice",
          "Alice",
          35,
          7,
          "2021-05-06T22:00:00.000Z",
          "meter",
        ),
      ]);
    });

    it("matching the different quantities to buy and sale", async () => {
      const saleOrders: Order[] = [
        {
          Quantity: 17,
          Price: 0.05,
          Owner: "Alice",
          Balance: 0,
          Id: "1",
          Date: "2021-03-22",
          Origin: "meter",
        },
        {
          Quantity: 2,
          Price: 0.05,
          Owner: "Almu",
          Balance: 0,
          Id: "2",
          Date: "2021-03-22",
          Origin: "meter",
        },
      ];
      const buyOrders: Order[] = [
        {
          Quantity: 10,
          Price: 0.05,
          Owner: "Pepe",
          Balance: 0.5,
          Id: "3",
          Date: "2021-03-22",
          Origin: "meter",
        },
        {
          Quantity: 7,
          Price: 0.05,
          Owner: "Carlos",
          Balance: 0.35,
          Id: "4",
          Date: "2021-03-22",
          Origin: "meter",
        },
        {
          Quantity: 1,
          Price: 0.05,
          Owner: "Adrian",
          Balance: 0.05,
          Id: "5",
          Date: "2021-03-22",
          Origin: "meter",
        },
        {
          Quantity: 1,
          Price: 0.05,
          Owner: "Dean",
          Balance: 0.05,
          Id: "6",
          Date: "2021-03-22",
          Origin: "meter",
        },
      ];
      const pairs = await matchingOrders(ctx, saleOrders, buyOrders);
      expect(pairs).to.eql([
        new Trade(
          "77c68f07d58833c4e89e86bb5858fb0a8c9855c70fe9c842226055649a57e65e",
          "Alice",
          "Pepe",
          0.5,
          10,
          "2021-05-06T22:00:00.000Z",
          "meter",
        ),
        new Trade(
          "b315c3fc6a6158cdafbf6d151e754776f7bd4df34dba4a9ca54b725f555ce3b2",
          "Alice",
          "Carlos",
          0.35000000000000003,
          7,
          "2021-05-06T22:00:00.000Z",
          "meter",
        ),
        new Trade(
          "bc9fe4638573140b3227c8ca0e07414897b0395fa7546b22c2c37574a25b30ab",
          "Almu",
          "Adrian",
          0.05,
          1,
          "2021-05-06T22:00:00.000Z",
          "meter",
        ),
        new Trade(
          "f44a171975770ce4c37b34c78789bf6054eff625a946fc0f466c884a3b2feebd",
          "Almu",
          "Dean",
          0.05,
          1,
          "2021-05-06T22:00:00.000Z",
          "meter",
        ),
      ]);
    });
  });
});
