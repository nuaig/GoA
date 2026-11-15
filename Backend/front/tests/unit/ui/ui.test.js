// @vitest-environment jsdom
// Characterization tests for utils/UI/ui.js
// Markup below is copied (trimmed) from the real pages:
//   Dijkstra.html  -> #health-bar img.health-icon x5, .stars__rating img.star x3
//   heapsort.html  -> .stars__rating svg.star x3 (legacy SVG stars)
//   Kruskal.html   -> .Hint-Text li (svg wrong icon, svg correct icon, text), .kruskal-pseudo
//   Prim.html      -> .prim-pseudo
//   heapsort.html  -> .heapsort-algo-instructions (its pseudo-code panel)
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as THREE from "three";
import {
  decrementHealth,
  resetHealth,
  setStars,
  resetStars,
  updateHintIcons,
  toggleInstructions,
  closePseudocode,
  removeFromScene,
  updateLabelRotations,
} from "../../../utils/UI/ui.js";

const FULL_HEALTH_HTML_SRC = "./symbols/health-full-icon.svg";
const EMPTY_ICON = "./../../symbols/health-empty-icon.svg";
const FULL_ICON = "./../../symbols/health-full-icon.svg";
const STAR_FULL = "./../../symbols/star-big-full-icon.svg";
const STAR_EMPTY = "./../../symbols/star-big-empty-icon.svg";

const healthIcon = `<img class="health-icon" src="${FULL_HEALTH_HTML_SRC}" alt="Health Icon" width="20" height="20" />`;
const HEALTH_BAR_HTML = `
  <div class="health">
    <div class="health-label">Lives</div>
    <div id="health-bar">${healthIcon.repeat(5)}</div>
  </div>`;

const imgStar = `<img class="star" src="./symbols/star-big-full-icon.svg" alt="Full Star" width="90" height="90" />`;
const IMG_STARS_HTML = `<div class="stars__rating">${imgStar.repeat(3)}</div>`;

const svgStar = `
  <svg class="star" version="1.0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="#000000">
    <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
    <g id="SVGRepo_iconCarrier">
      <g>
        <path class="outline" fill="#F9EBB2394240" d="M0 0"></path>
        <path class="inner" fill="#F9EBB2" d="M1 1"></path>
      </g>
    </g>
  </svg>`;
const SVG_STARS_HTML = `<div class="stars__rating">${svgStar.repeat(3)}</div>`;

const HINT_LI_HTML = `
  <ul class="UI-Text Hint-Text hidden">
    <li id="hint">
      <svg class="wrong" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48px" height="48px">
        <path fill="#F44336" d="M21.5 4.5H26.501V43.5H21.5z" transform="rotate(45.001 24 24)" />
        <path fill="#F44336" d="M21.5 4.5H26.5V43.501H21.5z" transform="rotate(135.008 24 24)" />
      </svg>
      <svg class="correct" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48px" height="48px">
        <path fill="#43A047" d="M40.6 12.1L17 35.7 7.4 26.1 4.6 29 17 41.3 43.4 14.9z" />
      </svg>
      Select an edge with the minimum weight
    </li>
  </ul>`;

const PSEUDO = (cls) =>
  `<div class="topnav-instructions pseudo ${cls} hidden"><div class="button-close-pseudo"><p>X</p></div></div>`;

const srcs = (sel) => [...document.querySelectorAll(sel)].map((e) => e.getAttribute("src"));
// jsdom versions differ: some keep "#fab005", others return "rgb(250, 176, 5)".
const toRgb = (c) => {
  const m = /^#([0-9a-f]{6})$/i.exec(c);
  if (!m) return c;
  const n = parseInt(m[1], 16);
  return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`;
};
const fills = (sel) => [...document.querySelectorAll(sel)].map((e) => toRgb(e.style.fill));
const isHidden = (sel) => document.querySelector(sel).classList.contains("hidden");

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("decrementHealth", () => {
  beforeEach(() => {
    document.body.innerHTML = HEALTH_BAR_HTML;
  });

  it("health 4 (max): empties icon[4], returns 3", () => {
    expect(decrementHealth(4)).toBe(3);
    expect(srcs(".health-icon")).toEqual([
      FULL_HEALTH_HTML_SRC,
      FULL_HEALTH_HTML_SRC,
      FULL_HEALTH_HTML_SRC,
      FULL_HEALTH_HTML_SRC,
      EMPTY_ICON,
    ]);
    expect(fills(".health-icon")).toEqual(["", "", "", "", "white"]);
  });

  it.each([3, 2, 1])("health %i: empties icon[%i], returns health-1", (h) => {
    expect(decrementHealth(h)).toBe(h - 1);
    const s = srcs(".health-icon");
    expect(s[h]).toBe(EMPTY_ICON);
    s.forEach((src, i) => {
      if (i !== h) expect(src).toBe(FULL_HEALTH_HTML_SRC);
    });
  });

  it("health 0: empties icon[0], returns -1", () => {
    expect(decrementHealth(0)).toBe(-1);
    expect(srcs(".health-icon")[0]).toBe(EMPTY_ICON);
    expect(document.querySelectorAll(".health-icon")[0].style.fill).toBe("white");
  });

  it("health -1 (already dead): no-op, returns -1", () => {
    expect(decrementHealth(-1)).toBe(-1);
    expect(srcs(".health-icon")).toEqual(Array(5).fill(FULL_HEALTH_HTML_SRC));
  });

  it("health -5: no-op, returns -5", () => {
    expect(decrementHealth(-5)).toBe(-5);
  });

  it("health 5 (above max): no-op, returns 5", () => {
    expect(decrementHealth(5)).toBe(5);
    expect(srcs(".health-icon")).toEqual(Array(5).fill(FULL_HEALTH_HTML_SRC));
  });

  it("five successive calls from 4 walk the bar right-to-left and end at -1", () => {
    let h = 4;
    const seen = [];
    for (let i = 0; i < 6; i++) {
      h = decrementHealth(h);
      seen.push(h);
    }
    expect(seen).toEqual([3, 2, 1, 0, -1, -1]);
    expect(srcs(".health-icon")).toEqual(Array(5).fill(EMPTY_ICON));
  });

  it("is idempotent on the icon when called twice with the same health", () => {
    decrementHealth(2);
    expect(decrementHealth(2)).toBe(1);
    expect(srcs(".health-icon")[2]).toBe(EMPTY_ICON);
    expect(srcs(".health-icon")[1]).toBe(FULL_HEALTH_HTML_SRC);
  });

  it("non-integer health in range throws (no icon at a fractional index)", () => {
    expect(() => decrementHealth(2.5)).toThrow(TypeError);
  });

  it("throws when the page has fewer icons than the health index", () => {
    document.body.innerHTML = `<div id="health-bar">${healthIcon.repeat(2)}</div>`;
    expect(() => decrementHealth(4)).toThrow(TypeError);
    expect(decrementHealth(1)).toBe(0);
  });

  it("with no icons at all: in-range health throws, out-of-range is a no-op", () => {
    document.body.innerHTML = "";
    expect(() => decrementHealth(0)).toThrow(TypeError);
    expect(decrementHealth(-1)).toBe(-1);
  });
});

describe("resetHealth", () => {
  beforeEach(() => {
    document.body.innerHTML = HEALTH_BAR_HTML;
  });

  it("returns 4 and restores all five icons to full/red", () => {
    let h = 4;
    for (let i = 0; i < 5; i++) h = decrementHealth(h);
    expect(h).toBe(-1);

    expect(resetHealth()).toBe(4);
    expect(srcs(".health-icon")).toEqual(Array(5).fill(FULL_ICON));
    expect(fills(".health-icon")).toEqual(Array(5).fill("red"));
  });

  it("works from a pristine bar too", () => {
    expect(resetHealth()).toBe(4);
    expect(srcs(".health-icon")).toEqual(Array(5).fill(FULL_ICON));
  });

  it("only touches the first five icons", () => {
    document.body.innerHTML = `<div id="health-bar">${healthIcon.repeat(6)}</div>`;
    resetHealth();
    expect(srcs(".health-icon")).toEqual([...Array(5).fill(FULL_ICON), FULL_HEALTH_HTML_SRC]);
  });

  it("throws when fewer than five icons exist", () => {
    document.body.innerHTML = `<div id="health-bar">${healthIcon.repeat(4)}</div>`;
    expect(() => resetHealth()).toThrow(TypeError);
  });
});

describe("setStars", () => {
  describe("with <img class='star'> markup (Dijkstra.html)", () => {
    beforeEach(() => {
      document.body.innerHTML = IMG_STARS_HTML;
      resetStars();
    });

    it.each([
      // health, returned numStars (0-based index of last gold star), resulting srcs
      [4, 2, [STAR_FULL, STAR_FULL, STAR_FULL]],
      [3, 1, [STAR_FULL, STAR_FULL, STAR_EMPTY]],
      [2, 1, [STAR_FULL, STAR_FULL, STAR_EMPTY]],
      [1, 0, [STAR_FULL, STAR_EMPTY, STAR_EMPTY]],
      [0, 0, [STAR_FULL, STAR_EMPTY, STAR_EMPTY]],
      [-1, -1, [STAR_EMPTY, STAR_EMPTY, STAR_EMPTY]],
    ])("health %i -> returns %i", (health, expected, expectedSrcs) => {
      expect(setStars(health)).toBe(expected);
      expect(srcs("img.star")).toEqual(expectedSrcs);
    });

    it("health above max (5) returns -1 and fills no stars", () => {
      // NOTE: current behavior, possibly a bug: only exactly 4 earns 3 stars; any value > 4
      // falls through to the else branch (ui.js:57-65).
      expect(setStars(5)).toBe(-1);
      expect(srcs("img.star")).toEqual([STAR_EMPTY, STAR_EMPTY, STAR_EMPTY]);
    });

    it("fractional health between bands uses the range checks (3.5 -> 1, 1.5 -> 0, -0.5 -> -1)", () => {
      expect(setStars(3.5)).toBe(1);
      expect(setStars(1.5)).toBe(0);
      expect(setStars(-0.5)).toBe(-1);
    });

    it("NaN / undefined health returns -1", () => {
      expect(setStars(NaN)).toBe(-1);
      expect(setStars(undefined)).toBe(-1);
    });

    it("does not un-fill stars from a previous higher call (only fills)", () => {
      setStars(4);
      expect(setStars(0)).toBe(0);
      expect(srcs("img.star")).toEqual([STAR_FULL, STAR_FULL, STAR_FULL]);
    });
  });

  describe("with legacy <svg class='star'> markup (heapsort.html)", () => {
    beforeEach(() => {
      document.body.innerHTML = SVG_STARS_HTML;
    });

    it("colors the last <path> of each filled star gold, leaves the rest untouched", () => {
      expect(setStars(2)).toBe(1);
      expect(fills(".star path.inner")).toEqual(["rgb(250, 176, 5)", "rgb(250, 176, 5)", ""]);
      expect(fills(".star path.outline")).toEqual(["", "", ""]);
    });

    it("health 4 colors all three", () => {
      setStars(4);
      expect(fills(".star path.inner")).toEqual(Array(3).fill("rgb(250, 176, 5)"));
    });
  });

  it("with no star elements: still returns numStars and does not throw", () => {
    document.body.innerHTML = "";
    expect(setStars(4)).toBe(2);
  });
});

describe("resetStars", () => {
  it("sets all three <img> stars to the empty icon", () => {
    document.body.innerHTML = IMG_STARS_HTML;
    setStars(4);
    resetStars();
    expect(srcs("img.star")).toEqual([STAR_EMPTY, STAR_EMPTY, STAR_EMPTY]);
  });

  it("sets the last <path> of each SVG star to gray", () => {
    document.body.innerHTML = SVG_STARS_HTML;
    setStars(4);
    resetStars();
    expect(fills(".star path.inner")).toEqual(Array(3).fill("rgb(233, 236, 239)"));
  });

  it("only touches the first three stars", () => {
    document.body.innerHTML = `<div class="stars__rating">${imgStar.repeat(4)}</div>`;
    resetStars();
    expect(srcs("img.star")).toEqual([
      STAR_EMPTY,
      STAR_EMPTY,
      STAR_EMPTY,
      "./symbols/star-big-full-icon.svg",
    ]);
  });

  it("does not throw with no stars", () => {
    document.body.innerHTML = "";
    expect(() => resetStars()).not.toThrow();
  });
});

describe("updateHintIcons", () => {
  let li;
  beforeEach(() => {
    document.body.innerHTML = HINT_LI_HTML;
    li = document.getElementById("hint");
  });

  const wrong = () => li.querySelector("svg.wrong").classList.contains("hidden");
  const correct = () => li.querySelector("svg.correct").classList.contains("hidden");

  it("result 0 shows the wrong (first) icon and hides the correct (second) icon", () => {
    updateHintIcons(li, 0);
    expect(wrong()).toBe(false);
    expect(correct()).toBe(true);
  });

  it("result 1 shows the correct icon and hides the wrong icon", () => {
    updateHintIcons(li, 1);
    expect(wrong()).toBe(true);
    expect(correct()).toBe(false);
  });

  it("toggles back and forth", () => {
    updateHintIcons(li, 0);
    updateHintIcons(li, 1);
    expect([wrong(), correct()]).toEqual([true, false]);
    updateHintIcons(li, 0);
    expect([wrong(), correct()]).toEqual([false, true]);
  });

  it.each([false, "0", null, undefined, 2, -1])(
    "any non-strict-0 result (%s) is treated as correct",
    (result) => {
      updateHintIcons(li, result);
      expect(wrong()).toBe(true);
      expect(correct()).toBe(false);
    }
  );

  it("throws when the list item has no svg icons", () => {
    const empty = document.createElement("li");
    expect(() => updateHintIcons(empty, 0)).toThrow(TypeError);
  });
});

describe("toggleInstructions", () => {
  beforeEach(() => {
    document.body.innerHTML =
      PSEUDO("kruskal-pseudo") + PSEUDO("prim-pseudo") + PSEUDO("heapify-pseudo");
  });

  it("kruskal: toggles .kruskal-pseudo and forces .prim-pseudo hidden", () => {
    document.querySelector(".prim-pseudo").classList.remove("hidden");
    toggleInstructions("kruskal");
    expect(isHidden(".kruskal-pseudo")).toBe(false);
    expect(isHidden(".prim-pseudo")).toBe(true);
    toggleInstructions("kruskal");
    expect(isHidden(".kruskal-pseudo")).toBe(true);
  });

  it("prim: toggles .prim-pseudo and forces .kruskal-pseudo hidden", () => {
    document.querySelector(".kruskal-pseudo").classList.remove("hidden");
    toggleInstructions("prim");
    expect(isHidden(".prim-pseudo")).toBe(false);
    expect(isHidden(".kruskal-pseudo")).toBe(true);
  });

  it("heapsort: toggles .heapify-pseudo only", () => {
    toggleInstructions("heapsort");
    expect(isHidden(".heapify-pseudo")).toBe(false);
    expect(isHidden(".kruskal-pseudo")).toBe(true);
    expect(isHidden(".prim-pseudo")).toBe(true);
  });

  it("is case-sensitive and ignores unknown algorithms", () => {
    toggleInstructions("Kruskal");
    toggleInstructions("dijkstra");
    toggleInstructions(undefined);
    expect(isHidden(".kruskal-pseudo")).toBe(true);
    expect(isHidden(".prim-pseudo")).toBe(true);
    expect(isHidden(".heapify-pseudo")).toBe(true);
  });

  it("kruskal on a page with only .kruskal-pseudo (Kruskal.html) throws", () => {
    // NOTE: current behavior, possibly a bug: each real page has only its own pseudo panel,
    // but toggleInstructions("kruskal") unconditionally touches .prim-pseudo (ui.js:9)
    // and vice versa (ui.js:12). The toggle itself still happens before the throw.
    document.body.innerHTML = PSEUDO("kruskal-pseudo");
    expect(() => toggleInstructions("kruskal")).toThrow(TypeError);
    expect(isHidden(".kruskal-pseudo")).toBe(false);
  });

  it("heapsort on heapsort.html markup (no .heapify-pseudo) throws", () => {
    // NOTE: current behavior, possibly a bug: no page defines .heapify-pseudo
    // (heapsort.html uses .heapsort-algo-instructions) (ui.js:5,14).
    document.body.innerHTML = PSEUDO("heapsort-algo-instructions");
    expect(() => toggleInstructions("heapsort")).toThrow(TypeError);
  });
});

describe("closePseudocode", () => {
  it("adds .hidden to .kruskal-pseudo, .prim-pseudo and .heapsort-pseudo", () => {
    document.body.innerHTML =
      PSEUDO("kruskal-pseudo") + PSEUDO("prim-pseudo") + PSEUDO("heapsort-pseudo");
    document.querySelectorAll(".pseudo").forEach((el) => el.classList.remove("hidden"));
    closePseudocode();
    expect(isHidden(".kruskal-pseudo")).toBe(true);
    expect(isHidden(".prim-pseudo")).toBe(true);
    expect(isHidden(".heapsort-pseudo")).toBe(true);
  });

  it("is a no-op (does not throw) when none of the panels exist", () => {
    document.body.innerHTML = "";
    expect(() => closePseudocode()).not.toThrow();
  });

  it("is safe on a page with only one panel", () => {
    document.body.innerHTML = PSEUDO("prim-pseudo");
    document.querySelector(".prim-pseudo").classList.remove("hidden");
    closePseudocode();
    expect(isHidden(".prim-pseudo")).toBe(true);
  });

  it("does not close .heapify-pseudo (the class toggleInstructions opens)", () => {
    // NOTE: current behavior, possibly a bug: toggleInstructions uses .heapify-pseudo (ui.js:5)
    // while closePseudocode uses .heapsort-pseudo (ui.js:21).
    document.body.innerHTML = PSEUDO("heapify-pseudo");
    document.querySelector(".heapify-pseudo").classList.remove("hidden");
    closePseudocode();
    expect(isHidden(".heapify-pseudo")).toBe(false);
  });

  it("does not close heapsort.html's real panel (.heapsort-algo-instructions) or Dijkstra/A* panels", () => {
    // NOTE: current behavior, possibly a bug: heapsort.js calls closePseudocode() on reset,
    // but heapsort.html's panel is .heapsort-algo-instructions, so it is never closed (ui.js:21).
    document.body.innerHTML =
      PSEUDO("heapsort-algo-instructions") + PSEUDO("dijkstra-pseudo") + PSEUDO("Astar-pseudo");
    document.querySelectorAll(".pseudo").forEach((el) => el.classList.remove("hidden"));
    closePseudocode();
    expect(isHidden(".heapsort-algo-instructions")).toBe(false);
    expect(isHidden(".dijkstra-pseudo")).toBe(false);
    expect(isHidden(".Astar-pseudo")).toBe(false);
  });
});

describe("removeFromScene", () => {
  function makeMesh(material) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const mesh = new THREE.Mesh(geometry, material ?? new THREE.MeshBasicMaterial());
    vi.spyOn(geometry, "dispose");
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((m) => vi.spyOn(m, "dispose"));
    return mesh;
  }

  it("removes each object from the parent, disposes geometry and material, and empties the array in place", () => {
    const scene = new THREE.Scene();
    const a = makeMesh();
    const b = makeMesh();
    scene.add(a, b);
    const tracked = [a, b];

    const ret = removeFromScene(tracked, scene);

    expect(ret).toBeUndefined();
    expect(tracked).toHaveLength(0);
    expect(scene.children).toHaveLength(0);
    expect(a.parent).toBeNull();
    expect(b.parent).toBeNull();
    expect(a.geometry.dispose).toHaveBeenCalledTimes(1);
    expect(a.material.dispose).toHaveBeenCalledTimes(1);
    expect(b.geometry.dispose).toHaveBeenCalledTimes(1);
    expect(b.material.dispose).toHaveBeenCalledTimes(1);
  });

  it("disposes every material in a material array", () => {
    const scene = new THREE.Scene();
    const m1 = new THREE.MeshBasicMaterial();
    const m2 = new THREE.MeshLambertMaterial();
    const mesh = makeMesh([m1, m2]);
    scene.add(mesh);
    removeFromScene([mesh], scene);
    expect(m1.dispose).toHaveBeenCalledTimes(1);
    expect(m2.dispose).toHaveBeenCalledTimes(1);
  });

  it("handles objects without geometry or material (e.g. Group)", () => {
    const scene = new THREE.Scene();
    const g = new THREE.Group();
    scene.add(g);
    const arr = [g];
    expect(() => removeFromScene(arr, scene)).not.toThrow();
    expect(scene.children).toHaveLength(0);
    expect(arr).toHaveLength(0);
  });

  it("works with plain fakes: calls parent.remove for each object", () => {
    const parent = { remove: vi.fn() };
    const o1 = { geometry: { dispose: vi.fn() }, material: { dispose: vi.fn() } };
    const o2 = {};
    const arr = [o1, o2];
    removeFromScene(arr, parent);
    expect(parent.remove.mock.calls).toEqual([[o1], [o2]]);
    expect(o1.geometry.dispose).toHaveBeenCalled();
    expect(o1.material.dispose).toHaveBeenCalled();
    expect(arr).toEqual([]);
  });

  it("objects not in the parent are still disposed and the array is still cleared", () => {
    const scene = new THREE.Scene();
    const stray = makeMesh();
    const arr = [stray];
    removeFromScene(arr, scene);
    expect(stray.geometry.dispose).toHaveBeenCalledTimes(1);
    expect(arr).toHaveLength(0);
  });

  it("empty array: no-op", () => {
    const parent = { remove: vi.fn() };
    const arr = [];
    removeFromScene(arr, parent);
    expect(parent.remove).not.toHaveBeenCalled();
    expect(arr).toEqual([]);
  });

  it("passing parent.children as the list skips every other child (as heapsort.js does)", () => {
    // NOTE: current behavior, possibly a bug: heapsort.js:1308 calls
    // removeFromScene(instancedObjects.children, instancedObjects). parent.remove() splices
    // the same array forEach is iterating (ui.js:101-102), so every second child is skipped:
    // never disposed, still pointing at the parent, though `objects.length = 0` empties children.
    const group = new THREE.Group();
    const meshes = [makeMesh(), makeMesh(), makeMesh(), makeMesh()];
    group.add(...meshes);

    removeFromScene(group.children, group);

    expect(group.children).toHaveLength(0);
    expect(meshes.map((m) => m.geometry.dispose.mock.calls.length)).toEqual([1, 0, 1, 0]);
    expect(meshes.map((m) => m.parent === group)).toEqual([false, true, false, true]);
  });
});

describe("updateLabelRotations", () => {
  it("calls lookAt(camera.position) on every label", () => {
    const camera = { position: new THREE.Vector3(1, 2, 3) };
    const labels = [{ lookAt: vi.fn() }, { lookAt: vi.fn() }];
    updateLabelRotations(labels, camera);
    labels.forEach((l) => {
      expect(l.lookAt).toHaveBeenCalledTimes(1);
      expect(l.lookAt).toHaveBeenCalledWith(camera.position);
    });
  });

  it("with real three objects, orients each label's +Z axis toward the camera", () => {
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(5, 0, 0);
    const label = new THREE.Mesh();
    updateLabelRotations([label], camera);
    label.updateMatrixWorld(true);
    const dir = label.getWorldDirection(new THREE.Vector3());
    expect(dir.x).toBeCloseTo(1);
    expect(dir.y).toBeCloseTo(0);
    expect(dir.z).toBeCloseTo(0);
  });

  it("empty label list: no-op", () => {
    expect(() => updateLabelRotations([], { position: new THREE.Vector3() })).not.toThrow();
  });
});
