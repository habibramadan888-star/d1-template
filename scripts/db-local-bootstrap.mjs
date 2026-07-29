import {
  assertSafeLocalPersistTo,
  resolveCleanD1PersistTo,
  runLocalDevSeed,
  runLocalMigrations
} from "./db-local-bootstrap-utils.mjs";
import { removeDirWithRetries } from "./local-worker-utils.mjs";

const persistTo = assertSafeLocalPersistTo(resolveCleanD1PersistTo());

const cleanup = await removeDirWithRetries(persistTo, { label: "Local D1 bootstrap directory" });
if (!cleanup.ok && !cleanup.movedTo) {
  throw new Error(`Local D1 bootstrap reset failed for ${persistTo}: ${cleanup.errorCode}`);
}
if (cleanup.movedTo) {
  console.warn(`WARNING moved locked local D1 directory to ${cleanup.movedTo}`);
}
console.log(`PASS local D1 reset ${persistTo}`);

await runLocalMigrations({ persistTo });
runLocalDevSeed({ persistTo });

console.log(`PASS local D1 bootstrap ${persistTo}`);
