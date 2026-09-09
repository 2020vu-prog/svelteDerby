import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import sveltePreprocess from "svelte-preprocess";

// Component-level tests for .svelte files. Kept separate from the frontend/src/**/*.test.mjs
// suite (`npm test`, plain `node --test`) because node's runner can't compile Svelte
// components. Test files here use the *.spec.js suffix specifically so `node --test`'s
// default file discovery (*.test.js/.mjs/.cjs) never picks them up.
export default defineConfig({
    plugins: [
        svelte({
            preprocess: sveltePreprocess({
                typescript: true,
            }),
        }),
    ],
    // Vitest resolves modules under Node/SSR conditions by default, which can
    // hand a component's compiled output a *different* svelte/internal module
    // instance than the one other imports (svelte-spa-router, sveltestrap,
    // @testing-library/svelte) resolve to. That split-brain state is silent
    // -- no error -- it just means onMount/lifecycle hooks never fire, because
    // `current_component` lives in the instance the component didn't get.
    // Forcing the "browser" condition, same as the real webpack/browser build,
    // keeps every import on one shared instance.
    resolve: {
        conditions: ["browser"],
    },
    test: {
        environment: "jsdom",
        include: ["src/**/*.spec.js"],
        setupFiles: ["./vitest.setup.mjs"],
        globals: true,
    },
});
