// Joins the truthy class names, the way sveltestrap's `classnames` did for the
// handful of cases these components need.
export const cx = (...names) => names.filter(Boolean).join(" ");
