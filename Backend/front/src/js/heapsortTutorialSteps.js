// Steps for the Heapsort tutorial (array [1, 5, 3, 4, 11]).
//
// Step types:
//   - type: "info"     -> read-only page; the player presses the Next button.
//   - result (optional) -> shown under the instruction once the player has made
//                         the move; the page then waits for the Next button.
//   - expectedAction   -> [value] to place into the tree (build phase), or
//                         [a, b] the values to swap (max-heap and sort phases).
// Text is rendered as HTML inside a <pre>, so use <br> for line breaks.
export const tutorialSteps = [
  {
    type: "info",
    instruction: "Read the notes below, then press Next. Don't move anything in the tree yet: this is a quick overview of what you will do in the next pages.",
    explanation:
      "This page is just a preview of what you will do in the next pages. Nothing to drag here.<br><br>" +
      "• Goal: sort [1, 5, 3, 4, 11] from smallest to largest.<br>" +
      "• Part 1: Put the numbers into the tree, top to bottom, left to right.<br>" +
      "• Part 2: Make every number bigger than the ones under it. This step is called heapify. In this part, you would work bottom-up.<br>" +
      "• Part 3: Move the top (biggest) number to the lowest rightmost node in the tree. Then heapify the tree, as we did in Part 2. Repeat.<br>" +
      "Spot tips:" +
      "<div style=\"margin-left:18px\">" +
      "<div style=\"padding-left:12px;text-indent:-12px\">- Each node has at most two children (the nodes under it). If a node has index i, the index of its left child = 2i + 1 and the index of its right child = 2i + 2. The node at index i is called the parent of the nodes under it.</div>" +
      "<div style=\"padding-left:12px;text-indent:-12px\">- The index of a node in the tree is also the same as the index of this number in the original array.</div>" +
      "<div style=\"padding-left:12px;text-indent:-12px\">- A node that has no children is called a leaf node.</div>" +
      "<div style=\"padding-left:12px;text-indent:-12px\">- The node at index 0 is called the root of the tree.</div>" +
      "</div>" +
      "• Next, we will start solving the example. At any point in your solution, if you need any additional help, click on the lower right button, \"Click for help\", to get additional directions.",
    expectedAction: null,
    errorMessage: "Press Next to begin.",
  },
  {
    instruction: "Step 1: Drag 1 (index 0) into the root of the tree (top of the tree).",
    explanation:
      "Put the array values into the tree from top to bottom, left to right. The first number goes at the root (top of the tree).",
    expectedAction: [1],
    errorMessage: "Drag 1 to the top of the tree.",
  },
  {
    instruction: "Step 2: Drag 5 (index 1) to the left child of 1.",
    explanation:
      "Keep filling top to bottom, left to right. The top row is full, so the next number goes under 1, on the left.<br>" +
      "We use the Heap Sort formula for the left child: 2i + 1.<br>" +
      "• 2 = each node has at most 2 children<br>" +
      "• i = 0 (the index of the number above, which is 1)<br>" +
      "• + 1 = take the left child<br>" +
      "So 2·0 + 1 = 1. That is why 5 goes at index 1.",
    expectedAction: [5],
    errorMessage: "Drag 5 under 1, on the left.",
  },
  {
    instruction: "Step 3: Drag 3 (index 2) to the right child of 1.",
    explanation:
      "Keep filling top to bottom, left to right. The left spot under 1 is taken, so the next number goes on the right.<br>" +
      "Right-child formula: 2i + 2.<br>" +
      "• 2 = each node has at most 2 children<br>" +
      "• i = 0 (index of 1 above)<br>" +
      "• + 2 = take the right child<br>" +
      "So 2·0 + 2 = 2. That is why 3 goes at index 2.",
    expectedAction: [3],
    errorMessage: "Drag 3 under 1, on the right.",
  },
  {
    instruction: "Step 4: Drag 4 (index 3) to the left child of 5.",
    explanation:
      "Keep filling top to bottom, left to right. The row under 1 is full, so go down one row and start on the left: put 4 under 5, on the left.<br>" +
      "Left-child formula again: 2i + 1, with i = 1 (index of 5).<br>" +
      "2·1 + 1 = 3. That is why 4 goes at index 3.",
    expectedAction: [4],
    errorMessage: "Drag 4 under 5, on the left.",
  },
  {
    instruction: "Step 5: Drag 11 (index 4) to the right child of 5.",
    explanation:
      "Keep filling top to bottom, left to right. The left spot under 5 is taken, so put 11 under 5, on the right.<br>" +
      "Right-child formula: 2i + 2, with i = 1 (index of 5).<br>" +
      "2·1 + 2 = 4. That is why 11 goes at index 4. All numbers are in the tree.",
    expectedAction: [11],
    errorMessage: "Drag 11 under 5, on the right.",
  },
  {
    instruction: "Step 6: Swap 5 and 11.",
    explanation:
      "The tree is now called a heap because it was filled top to bottom, left to right.<br>" +
      "Part 2 starts. The rule: every number must be bigger than (or equal to) the numbers under it.<br>" +
      "We go bottom-up: i counts down from the last spot, one at a time: i = 4 → 3 → 2 → 1 → 0.<br>" +
      "• Look at indices 4, 3, 2: the numbers there are 11, 4 and 3. They have no children nodes (they are leaves), so we skip them.<br>" +
      "• Look at index 1: the number there is 5. It is the highest index with at least one child, so we start here. (Shortcut: the highest indexed parent is at ⌊number of nodes / 2⌋ − 1 = ⌊5/2⌋ − 1 = 1.)<br>" +
      "• If a parent is smaller than at least one of its children, it is swapped with its largest child. The children of 5 are 4 and 11, 5 < 11, so we need to swap 5 and 11.",
    result:
      "After the swap, the array becomes:<br>" +
      "Array: [1, 11, 3, 4, 5]",
    expectedAction: [5, 11],
    errorMessage: "Swap 5 with 11.",
  },
  {
    instruction: "Step 7: Swap 1 and 11.",
    explanation:
      "Keep counting i down: i = 4 → 3 → 2 → 1 → 0.<br>" +
      "• We skipped indices 4, 3, 2 because these are leaves.<br>" +
      "• We already handled the node at index 1. It now holds 11, which is larger than its children.<br>" +
      "• The next node to consider, since we are going from the largest index to the lowest index, is the node at index 0. The number there is 1. Its children are 11 and 3. 11 is the largest child, so we need to swap 11 and 1.",
    result:
      "After the swap, the array becomes:<br>" +
      "Array: [11, 1, 3, 4, 5]",
    expectedAction: [1, 11],
    errorMessage: "Swap 1 with 11.",
  },
  {
    instruction: "Step 8: Swap 1 and 5.",
    explanation:
      "• Since we swapped 1 and 11, we need to make sure 1 is in the proper place in the tree, i.e. the node with value 1 should be larger than its children.<br>" +
      "• As we compare 1 with its children, 4 and 5 are larger than 1. Therefore, we need to swap 1 with the largest child, so we need to swap 1 and 5.<br><br>" +
      "So every time we swap 2 nodes, the node that goes into the lower level should be compared with its children, swapping it, if needed, with the largest child until it goes to an index where its value is larger than its children.",
    result:
      "After the swap, the array becomes:<br>" +
      "Array: [11, 5, 3, 4, 1]<br><br>" +
      "Every node is now larger than its children. Part 2 is done. The tree is now called a Maxheap.",
    expectedAction: [1, 5],
    errorMessage: "Swap 1 with 5.",
  },
  {
    instruction: "Step 9: Swap the root 11 (top of the tree) with the last element 1.",
    explanation:
      "Part 3 — sorting. Unlike Part 2 (bottom-up from the last parent), sorting always starts at the TOP.<br>" +
      "The top number (the root of the tree) is the largest value of the array. This largest value should be at the largest index in a sorted array. So swap the root with the LAST number still being sorted (i.e. the lowest rightmost node).<br>" +
      "Next we will fix FROM THE TOP DOWN: look at the left and right children of the new root, swap with the LARGEST child if that child is bigger than the parent, and keep going down from the new spot until the number is ≥ its children.",
    result:
      "After the swap, the array becomes:<br>" +
      "Array: [1, 5, 3, 4 | 11]<br><br>" +
      "Numbers to the right of | are already sorted and stay put.",
    expectedAction: [11, 1],
    errorMessage: "Swap 11 with 1.",
  },
  {
    instruction: "Step 10: Swap 1 and 5.",
    explanation:
      "Fix FROM THE TOP DOWN. 1 is on top. Look at its left and right children: 5 and 3. 5 is the LARGEST child and bigger than 1, so swap them.",
    result:
      "After the swap, the array becomes:<br>" +
      "Array: [5, 1, 3, 4 | 11]",
    expectedAction: [1, 5],
    errorMessage: "Swap 1 with 5.",
  },
  {
    instruction: "Step 11: Swap 1 and 4.",
    explanation:
      "Keep going down from the new spot. The only child still under 1 (and still being sorted) is 4. 4 is bigger than 1, so swap them. Note that 11 belongs now to the sorted part of the array, so we shouldn't compare it or swap it with any value.",
    result:
      "After the swap, the array becomes:<br>" +
      "Array: [5, 4, 3, 1 | 11]. 1 has no more larger children — the top-down fix is done.",
    expectedAction: [1, 4],
    errorMessage: "Swap 1 with 4.",
  },
  {
    instruction: "Step 12: Swap the root 5 (top of the tree) with the last element 1.",
    explanation:
      "Back to the TOP. Swap the top number with the LAST number still being sorted (i.e. the last number in the unsorted part of the array).",
    result:
      "After the swap, the array becomes:<br>" +
      "Array: [1, 4, 3 | 5, 11]<br><br>" +
      "5 and 11 are now part of the sorted array, and should not be compared or swapped with any number.",
    expectedAction: [5, 1],
    errorMessage: "Swap 5 with 1.",
  },
  {
    instruction: "Step 13: Swap 1 and 4.",
    explanation:
      "Fix FROM THE TOP DOWN again. Under 1 are left and right children 4 and 3. 4 is the LARGEST child and bigger than 1, so swap them.",
    result:
      "After the swap, the array becomes:<br>" +
      "Array: [4, 1, 3 | 5, 11]",
    expectedAction: [1, 4],
    errorMessage: "Swap 1 with 4.",
  },
  {
    instruction: "Step 14: Swap the root 4 (top of the tree) with the number 3, which is at the highest index of the unsorted array.",
    explanation:
      "1 has nothing under it left to sort, so stop going down. Back to the TOP: swap the top number with the LAST number still being sorted (i.e. the last number in the unsorted part of the array).",
    result:
      "After the swap, the array becomes:<br>" +
      "Array: [3, 1 | 4, 5, 11]",
    expectedAction: [4, 3],
    errorMessage: "Swap 4 with 3.",
  },
  {
    instruction: "Step 15: Swap the root 3 (top of the tree) with the last element 1.",
    explanation:
      "Fix FROM THE TOP DOWN: 3 is already ≥ 1 under it, so no swap needed. Swap the top number with the LAST number still being sorted (i.e. the last number in the unsorted part of the array).",
    result:
      "After the swap, the array becomes:<br>" +
      "Array: [1 | 3, 4, 5, 11]<br><br>" +
      "Only one number is left to sort, so we are done. The array is now sorted: [1, 3, 4, 5, 11].",
    expectedAction: [3, 1],
    errorMessage: "Swap 3 with 1.",
  },
];
