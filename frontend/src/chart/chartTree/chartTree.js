const KEY_PREFIX = "data/brackets/";

const byName = (left, right) =>
    left.name.localeCompare(right.name, undefined, {
        numeric: true,
        sensitivity: "base",
    });

// Turns an S3 listing ({ Key: "data/brackets/AASBD/Double/08double.png" }, ...)
// into nested nodes for the chart picker. Only chart images (.png) are kept.
// Folder: { id: "AASBD/Double", name: "Double", children: [...] }
// Chart:  { id: "AASBD/Double/08double.png", name: "08double.png" }
// Folders sort before charts, and names sort in natural order (6 before 12).
export function buildChartTree(contents = []) {
    const root = { children: [] };

    for (const item of contents) {
        const key = String(item?.Key ?? "").replace(KEY_PREFIX, "");
        if (!/\.png$/i.test(key)) continue;

        const parts = key.split("/").filter(Boolean);
        let parent = root;
        parts.forEach((name, index) => {
            const id = parts.slice(0, index + 1).join("/");
            const isChart = index === parts.length - 1;
            let node = parent.children.find((child) => child.id === id);
            if (!node) {
                node = isChart ? { id, name } : { id, name, children: [] };
                parent.children.push(node);
            }
            parent = node;
        });
    }

    const sort = (nodes) => {
        nodes.sort(
            (left, right) =>
                Boolean(right.children) - Boolean(left.children) ||
                byName(left, right)
        );
        for (const node of nodes) if (node.children) sort(node.children);
        return nodes;
    };
    return sort(root.children);
}

// True when the chart with this id is somewhere under `node`.
export function containsChart(node, id) {
    if (!id || !node.children) return false;
    return node.children.some(
        (child) => child.id === id || containsChart(child, id)
    );
}
