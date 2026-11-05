// Page helpers for Prim.html: the shared MST helpers from ./mstPage.js
// bound to Prim (dev-only hook `window.__roomTest`, bottom of src/js/prim.js).
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
  gameName: "Prim",
  path: "/Prim.html",
  initialCounts: [5, 7], // levelConfig[1]: 5 chests, 7 edges
  tutorialCounts: [5, 7], // createSpecificGraphPrimTutorial()
});
