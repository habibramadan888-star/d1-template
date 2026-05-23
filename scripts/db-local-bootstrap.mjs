import { rm } from "node:fs/promises";
import {
  assertSafeLocalPersistTo,
  resolveCleanD1PersistTo,
  runLocalDevSeed,
  runLocalMigrations
} from "./db-local-bootstrap-utils.mjs";

const persistTo = assertSafeLocalPersistTo(resolveCleanD1PersistTo());

await rm(persistTo, { recursive: true, force: true });
console.log(`PASS local D1 reset ${persistTo}`);

await runLocalMigrations({ persistTo });
runLocalDevSeed({ persistTo });

console.log(`PASS local D1 bootstrap ${persistTo}`);
