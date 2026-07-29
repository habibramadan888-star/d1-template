import {
  createEmployeeEventRegistry,
} from "../core/event-registry";
import type {
  EmployeeEventRegistry,
  EmployeeEventRegistryContract,
} from "../core/event-registry";
import {
  createEmployeeRentEventContract,
} from "./rent";
import {
  createEmployeeArrearsPaymentEventContract,
} from "./arrears-payment";
import {
  createEmployeeDepositInEventContract,
} from "./deposit-in";
import {
  createEmployeeDepositOutEventContract,
} from "./deposit-out";
import {
  createEmployeeCheckoutEventContract,
} from "./checkout";
import {
  createEmployeeExpenseEventContract,
} from "./expense";
import {
  createEmployeeBedTransferEventContract,
} from "./bed-transfer";

export function createEmployeeSevenEventContracts():
readonly EmployeeEventRegistryContract[] {
  return Object.freeze([
    createEmployeeRentEventContract(),
    createEmployeeArrearsPaymentEventContract(),
    createEmployeeDepositInEventContract(),
    createEmployeeDepositOutEventContract(),
    createEmployeeCheckoutEventContract(),
    createEmployeeExpenseEventContract(),
    createEmployeeBedTransferEventContract(),
  ]);
}

export function createEmployeeSevenEventRegistry(): EmployeeEventRegistry {
  return createEmployeeEventRegistry(createEmployeeSevenEventContracts());
}
