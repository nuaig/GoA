// Steps for the Heapsort tutorial (array [1, 5, 3, 4, 11]).
//
// Step types:
//   - type: "info"     -> read-only page; the player presses the Next button.
//   - expectedAction   -> [value] to place into the tree (build phase), or
//                         [a, b] the values to swap (max-heap and sort phases).
// Text is rendered as HTML inside a <pre>, so use <br> for line breaks.
export const tutorialSteps = [
  {
    type: "info",
    instruction: "Read the notes below, then press Next.",
    explanation:
      "• To read more about Heap Sort, including its pseudo-code, use the \"Click for help\" button in the lower right corner.<br>" +
      "• Our goal is to sort the array [1, 5, 3, 4, 11] from smallest to largest using Heap Sort.<br>" +
      "• Heap Sort has 3 phases:<br>" +
      "&nbsp;&nbsp;1. Build a binary heap: place the array elements into a complete binary tree, top to bottom, left to right.<br>" +
      "&nbsp;&nbsp;2. Turn it into a max heap: every parent must be greater than or equal to its children.<br>" +
      "&nbsp;&nbsp;3. Sort: repeatedly swap the root (the largest element) with the last element of the heap, remove it from the heap, and restore the max heap.<br>" +
      "• In the array, the element at index i has its left child at index 2i + 1 and its right child at index 2i + 2.<br>" +
      "• You move elements by clicking, holding and dragging them.",
    expectedAction: null,
    errorMessage: "Read the introduction, then press Next to begin.",
  },
  {
    instruction: "Step 1: Drag 1 (index 0) into the root of the tree.",
    explanation:
      "Elements are placed top to bottom, left to right. Index 0 is the root, so the first element, 1, goes at the top. Each node can have at most 2 children.",
    expectedAction: [1],
    errorMessage: "Place 1 at the root of the tree.",
  },
  {
    instruction: "Step 2: Drag 5 (index 1) to the left child of 1.",
    explanation:
      "The top level is full, so we move down one level and fill it from left to right. Index 1 is the left child of index 0 (2·0 + 1 = 1).",
    expectedAction: [5],
    errorMessage: "Place 5 as the left child of 1.",
  },
  {
    instruction: "Step 3: Drag 3 (index 2) to the right child of 1.",
    explanation:
      "We keep filling the second level from left to right. Index 2 is the right child of index 0 (2·0 + 2 = 2).",
    expectedAction: [3],
    errorMessage: "Place 3 as the right child of 1.",
  },
  {
    instruction: "Step 4: Drag 4 (index 3) to the left child of 5.",
    explanation:
      "The second level is full, so we move down again. Index 3 is the left child of index 1 (2·1 + 1 = 3).",
    expectedAction: [4],
    errorMessage: "Place 4 as the left child of 5.",
  },
  {
    instruction: "Step 5: Drag 11 (index 4) to the right child of 5.",
    explanation:
      "Index 4 is the right child of index 1 (2·1 + 2 = 4). All 5 elements are now in the tree: this is the binary heap [1, 5, 3, 4, 11].",
    expectedAction: [11],
    errorMessage: "Place 11 as the right child of 5.",
  },
  {
    instruction: "Step 6: Swap 5 and 11.",
    explanation:
      "Phase 2: build the max heap. We start at the last parent node, index ⌊5/2⌋ − 1 = 1 (value 5), and move backwards to index 0. Node 5 has children 4 (index 3) and 11 (index 4). 11 is larger than 5, so we swap 5 with its largest child, 11.<br><br>" +
      "Array: [1, 11, 3, 4, 5]",
    expectedAction: [5, 11],
    errorMessage: "",
  },
  {
    instruction: "Step 7: Swap 1 and 11.",
    explanation:
      "Index 1 (now 11) is larger than its children 4 and 5, so it is fine. We move back to index 0 (value 1). Its children are 11 (index 1) and 3 (index 2). The largest child, 11, is bigger than 1, so we swap them.<br><br>" +
      "Array: [11, 1, 3, 4, 5]",
    expectedAction: [1, 11],
    errorMessage: "",
  },
  {
    instruction: "Step 8: Swap 1 and 5.",
    explanation:
      "After a swap, we keep checking the value we moved down. 1 is now at index 1, with children 4 (index 3) and 5 (index 4). The largest child, 5, is bigger than 1, so we swap them.<br><br>" +
      "Array: [11, 5, 3, 4, 1]. Every parent is now larger than its children, so the max heap is complete.",
    expectedAction: [1, 5],
    errorMessage: "",
  },
  {
    instruction: "Step 9: Swap the root 11 with the last element 1.",
    explanation:
      "Phase 3: sort. The root of a max heap is the largest element. We swap it with the last element of the heap (index 4) and remove it from the heap, so 11 is now in its final sorted position.<br><br>" +
      "Array: [1, 5, 3, 4 | 11]",
    expectedAction: [11, 1],
    errorMessage: "",
  },
  {
    instruction: "Step 10: Swap 1 and 5.",
    explanation:
      "The new root 1 is smaller than its children 5 (index 1) and 3 (index 2). We swap it with the largest child, 5.<br><br>" +
      "Array: [5, 1, 3, 4 | 11]",
    expectedAction: [1, 5],
    errorMessage: "",
  },
  {
    instruction: "Step 11: Swap 1 and 4.",
    explanation:
      "1 is now at index 1, and its only child left in the heap is 4 (index 3). 4 is bigger, so we swap them.<br><br>" +
      "Array: [5, 4, 3, 1 | 11]. The max heap is restored.",
    expectedAction: [1, 4],
    errorMessage: "",
  },
  {
    instruction: "Step 12: Swap the root 5 with the last element 1.",
    explanation:
      "We remove the largest element again by swapping the root 5 with the last element of the heap (index 3).<br><br>" +
      "Array: [1, 4, 3 | 5, 11]",
    expectedAction: [5, 1],
    errorMessage: "",
  },
  {
    instruction: "Step 13: Swap 1 and 4.",
    explanation:
      "The new root 1 has children 4 (index 1) and 3 (index 2). We swap it with the largest child, 4.<br><br>" +
      "Array: [4, 1, 3 | 5, 11]",
    expectedAction: [1, 4],
    errorMessage: "",
  },
  {
    instruction: "Step 14: Swap the root 4 with the last element 3.",
    explanation:
      "1 at index 1 has no children left in the heap, so the max heap is restored. We swap the root 4 with the last element of the heap (index 2).<br><br>" +
      "Array: [3, 1 | 4, 5, 11]",
    expectedAction: [4, 3],
    errorMessage: "",
  },
  {
    instruction: "Step 15: Swap the root 3 with the last element 1.",
    explanation:
      "The root 3 is larger than its only child 1, so the heap is already a max heap. We swap the root 3 with the last element (index 1).<br><br>" +
      "Array: [1 | 3, 4, 5, 11]. Only one element is left in the heap, so the array is sorted: [1, 3, 4, 5, 11].",
    expectedAction: [3, 1],
    errorMessage: "",
  },
];
