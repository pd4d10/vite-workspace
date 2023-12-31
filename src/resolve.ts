import fs from "node:fs";
import path from "node:path";
import { type Plugin, ConfigEnv } from "vite";
import _debug from "debug";
import { collectMeta } from "./utils.js";
import { findUp } from "find-up";

const debug = _debug("vite-workspace:resolve"); // TODO: tsconfig

export function resolve(): Plugin {
  let env: ConfigEnv;
  let meta: Awaited<ReturnType<typeof collectMeta>>;

  return {
    name: "vite-workspace:resolve",
    config(c, e) {
      env = e;
    },
    resolveId: {
      order: "pre",
      async handler(source, importer) {
        // collect workspace libraries
        if (!meta) meta = await collectMeta(env);

        const name = meta.keys.find(
          (k) => source === k || source.startsWith(k + "/")
        );
        if (!name) return;

        // `lodash/get` -> get
        const subpath = source.slice(name.length + 1);

        const dir = await findUp(path.join("node_modules", name), {
          type: "directory",
          cwd: importer,
        });
        if (!dir) return;

        const realDir = await fs.promises.realpath(dir);
        const selected = meta.mapper[realDir];
        if (!selected) return;

        const entry = selected.entries[subpath];
        if (!entry) return;

        debug(`${source} -> ${entry}`);
        return entry;
      },
    },
  };
}
