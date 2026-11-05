// Page helpers for Kruskal.html: the shared MST helpers from ./mstPage.js
// bound to Kruskal (dev-only hook `window.__roomTest`, bottom of src/js/kruskal.js).
import { createMstPage } from "./mstPage.js";

export { sameEdge, POLL, snapshot, edgeKey, edgeSet, hintIcon } from "./mstPage.js";

export const {
  hook,
  hooks,
  stepIndex,
  waitUntilClickable,
  findEdgePoint,
  clickRearrange,
  clickAnyEdge,
  openRoom,
  startTutorial,
  startRegularLevel1,
  clickEdge,
  restartLevel,
  expectTutorialCompleteModal,
} = createMstPage({
  gameName: "Kruskal",
  path: "/Kruskal.html",
  initialCounts: [5, 8], // levelConfig[1]: 5 chests, 8 edges
  tutorialCounts: [4, 5], // createSpecificGraphKruskalTutorial()
});
