import { Object as DataType, Property } from "fabric-contract-api";

@DataType()
export class MintedQuantity {
  @Property("Quantity", "number")
  Quantity = 0;
  @Property("Minter", "string")
  Minter = "";
  static newInstance(state: Partial<MintedQuantity> = {}): MintedQuantity {
    return {
      Quantity: state.Quantity ?? 0,
      Minter: state.Minter ?? "",
    };
  }
}

@DataType()
export class UTXO {
  @Property("Quantity", "number")
  Quantity = 0;

  @Property("Owner", "string")
  Owner = "";

  @Property("Minter", "string")
  Minter = "";

  @Property("Id", "string")
  Id = "";

  constructor() {
    // Nothing to do
  }

  static newInstance(state: Partial<UTXO> = {}): UTXO {
    return {
      Quantity: state.Quantity ?? 0,
      Owner: state.Owner ?? "",
      Id: state.Id ?? "",
      Minter: state.Minter ?? "",
    };
  }
}

@DataType()
export class Order {
  @Property("Quantity", "number")
  Quantity = 0;

  @Property("Origin", "string")
  Origin = "";

  @Property("Price", "number")
  Price = 0;

  @Property("Balance", "number")
  Balance = 0;

  @Property("Bidder", "string")
  Owner = "";

  @Property("Id", "string")
  Id = "";

  @Property("Date", "string")
  Date = "";

  constructor() {
    // Nothing to do
  }

  static newInstance(state: Partial<Order> = {}): Order {
    return {
      Quantity: state.Quantity ?? 0,
      Price: state.Price ?? 0,
      Owner: state.Owner ?? "",
      Balance: state.Balance ?? 0,
      Id: state.Id ?? "",
      Date: state.Date ?? "",
      Origin: state.Origin ?? "",
    };
  }
}

@DataType()
export class Trade {
  @Property("Id", "string")
  Id: string;
  @Property("sellerAddress", "string")
  sellerAddress: string;
  @Property("buyerAddress", "string")
  buyerAddress: string;
  @Property("creditBalance", "number")
  creditBalance: number;
  @Property("energyBalance", "number")
  energyBalance: number;
  @Property("deadline", "string")
  deadline: string;
  @Property("Origin", "string")
  Origin = "";

  constructor(
    Id: string,
    saleOrder: string,
    buyOrder: string,
    Price: number,
    Quantity: number,
    deadline: string,
    origin: string,
  ) {
    this.Id = Id;
    this.sellerAddress = saleOrder;
    this.buyerAddress = buyOrder;
    this.creditBalance = Price;
    this.energyBalance = Quantity;
    this.deadline = deadline;
    this.Origin = origin;
  }

  static newInstance(state: Partial<Trade> = {}): Trade {
    return {
      Id: state.Id ?? "",
      creditBalance: state.creditBalance ?? 0,
      sellerAddress: state.sellerAddress ?? "",
      buyerAddress: state.buyerAddress ?? "",
      energyBalance: state.energyBalance ?? 0,
      deadline: state.deadline ?? "",
      Origin: state.Origin ?? "",
    };
  }
}
@DataType()
export class EAC {
  @Property("Quantity", "number")
  Quantity = 0;

  @Property("Owner", "string")
  Owner = "";

  @Property("Origin", "string")
  Origin = "";

  @Property("Id", "string")
  Id = "";

  constructor() {
    // Nothing to do
  }

  static newInstance(state: Partial<EAC> = {}): EAC {
    return {
      Quantity: state.Quantity ?? 0,
      Owner: state.Owner ?? "",
      Id: state.Id ?? "",
      Origin: state.Origin ?? "",
    };
  }
}
