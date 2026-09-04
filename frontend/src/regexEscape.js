// Regex metacharacters in user-typed filter text (e.g. a trailing "\")
// must not reach `new RegExp` unescaped -- it throws on invalid patterns.
export const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
