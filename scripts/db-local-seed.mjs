import { resolveCleanD1PersistTo, runLocalDevSeed } from "./db-local-bootstrap-utils.mjs";

const result = runLocalDevSeed({ persistTo: resolveCleanD1PersistTo() });
console.log(`PASS local D1 seed at ${result.persistTo}`);
