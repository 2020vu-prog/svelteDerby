import { getUserPreference } from "#src/eventDb.js";

export const CHART_VIEW_SELECTION_KEY = "pref:chartViewSelectionCounter";

const STANDARD_CHART_VIEWS = [
    { path: "/chartDetail" },
    { path: "/chartDetailCardList" },
];
const SVG_CHART_VIEW = { path: "/chartSvgPrototype" };

export function getChartViews(developerMode) {
    return developerMode
        ? [...STANDARD_CHART_VIEWS, SVG_CHART_VIEW]
        : STANDARD_CHART_VIEWS;
}

export function getSelectedChartView(developerMode) {
    const selectionCounter = getUserPreference(CHART_VIEW_SELECTION_KEY);
    const counter =
        Number.isSafeInteger(selectionCounter) && selectionCounter >= 0
            ? selectionCounter
            : 0;
    const views = getChartViews(developerMode);
    return views[counter % views.length];
}
