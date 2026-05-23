import { rm } from "node:fs/promises";
import { assertSafeLocalPersistTo, resolveCleanD1PersistTo } from "./db-local-bootstrap-utils.mjs";

const persistTo = assertSafeLocalPersistTo(resolveCleanD1PersistTo());

await rm(persistTo, { recursive: true, force: true });
console.log(`PASS local D1 reset ${persistTo}`);
