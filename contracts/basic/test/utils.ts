import { ChaincodeStub, SplitCompositekey } from "fabric-shim";
import { Iterators } from "fabric-shim-api";
import { SinonStubbedInstance, createStubInstance } from "sinon";

export class MockIterator implements Iterators.StateQueryIterator {
  array: Iterators.KV[];
  cur: number;
  constructor(data: Iterators.KV[]) {
    this.array = data;
    this.cur = 0;
  }
  next(): Promise<Iterators.NextResult<Iterators.KV>> {
    if (this.cur < this.array.length) {
      const value = this.array[this.cur];
      this.cur++;
      return Promise.resolve({
        value: value,
        done: false,
      });
    } else {
      return Promise.resolve({
        done: true,
        value: { value: new Uint8Array(0), key: "", namespace: "" },
      });
    }
  }
  close() {
    return Promise.resolve();
  }
}
export class MockChaincodeStub extends ChaincodeStub {
  states: MockState = {};
}

export type MockState = {
  [key: string]: Uint8Array;
};

export function createMockChaincodeStub(): SinonStubbedInstance<MockChaincodeStub> {
  const chaincodeStub = createStubInstance(MockChaincodeStub);
  chaincodeStub.getDateTimestamp.returns(new Date("2021-04-29T22:00:00.000Z"));
  chaincodeStub.getTxID.returns("tx1");
  chaincodeStub.getState.callsFake(async (key: string) => {
    let ret: Uint8Array = new Uint8Array(0);
    if (chaincodeStub.states) {
      ret = chaincodeStub.states[key];
    }
    return Promise.resolve(ret);
  });

  chaincodeStub.putState.callsFake((key: string, value: Uint8Array) => {
    if (!chaincodeStub.states) {
      chaincodeStub.states = {};
    }
    chaincodeStub.states[key] = value;
    return Promise.resolve();
  });

  chaincodeStub.createCompositeKey.callsFake(
    (objectType: string, attributes: string[]): string => {
      let concatenated_attr: string = `${objectType}`;
      for (const index in attributes) {
        concatenated_attr += `_${attributes[index]}`;
      }
      return concatenated_attr;
    },
  );
  chaincodeStub.splitCompositeKey.callsFake(
    (compositeKey: string): SplitCompositekey => {
      const splittedKeys = {
        objectType: "",
        attributes: compositeKey.split("_"),
      };
      return splittedKeys;
    },
  );
  return chaincodeStub;
}
