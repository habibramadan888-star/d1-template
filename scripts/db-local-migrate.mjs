import { resolveCleanD1PersistTo, runLocalMigrations } from "./db-local-bootstrap-utils.mjs";

const result = await runLocalMigrations({ persistTo: resolveCleanD1PersistTo() });
console.log(`PASS local D1 migrate ${result.files.length} file(s) at ${result.persistTo}`);
