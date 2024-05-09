/*
 * SPDX-License-Identifier: Apache-2.0
 */
import { CreditContract } from "./credit";
import { EnergyGenerationContract, EnergyConsumptionContract } from "./energy";
import { OrderBookContract } from "./order-book";
import { TradesContract } from "./trades";
import { EnergyAttributeContract } from "./energy-attributes";
export { CreditContract } from "./credit";
export { EnergyGenerationContract, EnergyConsumptionContract } from "./energy";
export { OrderBookContract as BasicContract } from "./order-book";
export { TradesContract } from "./trades";
export { EnergyAttributeContract } from "./energy-attributes";

export const contracts = [
  OrderBookContract,
  CreditContract,
  EnergyGenerationContract,
  EnergyConsumptionContract,
  TradesContract,
  EnergyAttributeContract,
];
