import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Components take events from their children as callback props (`onSelect`,
// `onMessage`, ...). A callback whose name does not match one the child declares is
// silently never called, so this checks every `onName={...}` handed to a local
// component against that component's `export let onName`.
const srcDir = path.join(path.dirname(fileURLToPath(import.meta.url)));

function svelteFiles(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return svelteFiles(full);
        return entry.name.endsWith(".svelte") ? [full] : [];
    });
}

// The attributes of every `<Component ...>` tag in a file (brace-aware, so an
// arrow function or object in a prop does not end the tag early).
function componentTags(source) {
    const tags = [];
    for (const match of source.matchAll(/<([A-Z][A-Za-z0-9]*)(?=[\s/>])/g)) {
        let i = match.index + match[0].length;
        let depth = 0;
        let quote = null;
        for (; i < source.length; i++) {
            const c = source[i];
            if (quote) {
                if (c === quote) quote = null;
            } else if (depth === 0 && (c === '"' || c === "'")) quote = c;
            else if (c === "{") depth++;
            else if (c === "}") depth--;
            else if (c === ">" && depth === 0) break;
        }
        tags.push({
            name: match[1],
            attrs: source.slice(match.index + match[0].length, i),
        });
    }
    return tags;
}

function importedComponent(source, name, fromFile) {
    const re = new RegExp(
        `import\\s+${name}\\s+from\\s+["']([^"']+\\.svelte)["']`
    );
    const found = source.match(re);
    if (!found) return null;
    const target = found[1];
    if (target.startsWith("#src/"))
        return path.join(srcDir, target.slice("#src/".length));
    if (target.startsWith("."))
        return path.resolve(path.dirname(fromFile), target);
    return null; // a package component
}

const declaredProps = (source) =>
    new Set(
        [...source.matchAll(/export\s+let\s+(\w+)/g)]
            .map((m) => m[1])
            .concat(
                // `export { local as name }`
                [
                    ...source.matchAll(/export\s*\{\s*\w+\s+as\s+(\w+)\s*\}/g),
                ].map((m) => m[1])
            )
    );

test("every callback prop passed to a component is one that component declares", () => {
    const problems = [];
    let checked = 0;
    for (const file of svelteFiles(srcDir)) {
        const source = fs.readFileSync(file, "utf8");
        for (const { name, attrs } of componentTags(source)) {
            const callbacks = [
                ...attrs.matchAll(/(?:^|\s)(on[A-Z]\w*)\s*=/g),
            ].map((m) => m[1]);
            if (!callbacks.length) continue;
            const target = importedComponent(source, name, file);
            if (!target || !fs.existsSync(target)) continue;
            const props = declaredProps(fs.readFileSync(target, "utf8"));
            for (const callback of callbacks) {
                checked++;
                if (!props.has(callback)) {
                    problems.push(
                        `${path.relative(srcDir, file)}: <${name} ${callback}=...> but ${path.relative(srcDir, target)} declares no such prop`
                    );
                }
            }
        }
    }
    assert.ok(
        checked > 10,
        `only ${checked} callback props were found; the scan is broken`
    );
    assert.deepEqual(problems, []);
});
