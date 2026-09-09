// jsdom has no IndexedDB implementation, but src/eventDb.js constructs Dexie
// instances at module load time (`new Dexie("eventDb")`), and many components
// pull that in transitively via stores.js/storedb.js. Polyfill it globally so
// importing those modules under test behaves the way it does in a real browser.
import "fake-indexeddb/auto";

import "@testing-library/jest-dom/vitest";
