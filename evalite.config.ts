import { defineConfig } from "evalite/config";
import { createSqliteStorage } from "evalite/sqlite-storage";

export default defineConfig({
  storage: () => createSqliteStorage("./evals/db/evalite.db"),
});