import {
  EMPLOYEE_EVENT_IDS,
  isEmployeeEventId,
} from "./event-contract";
import type {
  EmployeeEventContract,
  EmployeeEventId,
} from "./event-contract";

export type EmployeeEventRegistryContract =
  EmployeeEventContract<object, object>;

export interface EmployeeEventRegistry {
  readonly eventIds: readonly EmployeeEventId[];
  readonly contracts: readonly EmployeeEventRegistryContract[];
  get(value: unknown): EmployeeEventRegistryContract | undefined;
}

function registryError(message: string): Error {
  return new Error(message);
}

function hasContractShape(
  value: unknown,
): value is EmployeeEventRegistryContract {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Readonly<Record<string, unknown>>;
  return (
    typeof candidate.displayName === "string"
    && typeof candidate.createInitialDraft === "function"
    && typeof candidate.validateDraft === "function"
    && typeof candidate.buildSubmission === "function"
  );
}

export function createEmployeeEventRegistry(
  contracts: readonly EmployeeEventRegistryContract[],
): EmployeeEventRegistry {
  if (!Array.isArray(contracts) || contracts.length > EMPLOYEE_EVENT_IDS.length) {
    throw registryError("EMPLOYEE_EVENT_REGISTRY_INVALID_COLLECTION");
  }

  const contractsById = new Map<
    EmployeeEventId,
    EmployeeEventRegistryContract
  >();

  for (const value of contracts as readonly unknown[]) {
    if (!hasContractShape(value)) {
      throw registryError("EMPLOYEE_EVENT_REGISTRY_INVALID_CONTRACT");
    }
    if (!isEmployeeEventId(value.eventId)) {
      throw registryError("EMPLOYEE_EVENT_REGISTRY_UNKNOWN_EVENT_ID");
    }
    if (contractsById.has(value.eventId)) {
      throw registryError("EMPLOYEE_EVENT_REGISTRY_DUPLICATE_EVENT_ID");
    }
    contractsById.set(value.eventId, value);
  }

  if (contractsById.size !== EMPLOYEE_EVENT_IDS.length) {
    throw registryError("EMPLOYEE_EVENT_REGISTRY_MISSING_EVENT_ID");
  }

  const eventIds = Object.freeze([...EMPLOYEE_EVENT_IDS]);
  const orderedContracts = Object.freeze(
    eventIds.map((eventId) => {
      const contract = contractsById.get(eventId);
      if (contract === undefined) {
        throw registryError("EMPLOYEE_EVENT_REGISTRY_MISSING_EVENT_ID");
      }
      return contract;
    }),
  );

  const registry: EmployeeEventRegistry = {
    eventIds,
    contracts: orderedContracts,
    get(value: unknown): EmployeeEventRegistryContract | undefined {
      return isEmployeeEventId(value) ? contractsById.get(value) : undefined;
    },
  };

  return Object.freeze(registry);
}
