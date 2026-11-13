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
      "• Goal: sort [1, 5, 3, 4, 11] from smallest to largest.<br>" +
      "• Part 1: Put the numbers into the tree, top to bottom, left to right.<br>" +
      "• Part 2: Make every number bigger than the ones under it. Work bottom-up.<br>" +
      "• Part 3: Move the top (biggest) number to the end. Then fix the tree from the top down. Repeat.<br>" +
      "• Spot tip: left child = 2i + 1, right child = 2i + 2 (i = a number's index).<br>" +
      "• Drag to move numbers. More help: \"Click for help\" (lower right).",
    expectedAction: null,
    errorMessage: "Press Next to begin.",
  },
  {
    instruction: "Step 1: Drag 1 (index 0) into the root of the tree (top of the tree).",
    explanation:
      "Put the list into the tree from top to bottom, left to right. The first number goes at the root (top of the tree).",
    expectedAction: [1],
    errorMessage: "Drag 1 to the top of the tree.",
  },
  {
    instruction: "Step 2: Drag 5 (index 1) to the left child of 1.",
    explanation:
      "Keep filling top to bottom, left to right. The top row is full, so the next number goes under 1, on the left.<br>" +
      "We use the Heap Sort formula for the left child: 2i + 1.<br>" +
      "• 2 = each number can have 2 children<br>" +
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
      "• 2 = each number can have 2 children<br>" +
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
      "Part 2 starts. The actual rule (SOT): every number must be bigger than (or equal to) the numbers under it.<br>" +
      "We go bottom-up: i counts down from the last spot, one at a time: i = 4 → 3 → 2 → 1 → 0.<br>" +
      "• i = 4, 3, 2 hold 11, 4 and 3. Nothing is under them (they are leaves), so we skip them.<br>" +
      "• i = 1 holds 5. It is the first number with children, so we start here. (Shortcut: the last parent is at ⌊5/2⌋ − 1 = 1.)<br>" +
      "Under 5 are 4 and 11. 11 is bigger than 5, so swap them.<br><br>" +
      "Array: [1, 11, 3, 4, 5]",
    expectedAction: [5, 11],
    errorMessage: "Swap 5 with 11.",
  },
  {
    instruction: "Step 7: Swap 1 and 11.",
    explanation:
      "Keep counting i down: i = 4 → 3 → 2 → 1 → 0.<br>" +
      "• i = 4, 3, 2 now hold 5, 4 and 3. They are still leaves, so we skip them.<br>" +
      "• i = 1 was Step 6. It now holds 11, which is already bigger than 4 and 5 under it, so leave it.<br>" +
      "• Next is i = 0. It holds 1. Under it are 11 and 3. 11 is bigger than 1, so swap them.<br><br>" +
      "Array: [11, 1, 3, 4, 5]",
    expectedAction: [1, 11],
    errorMessage: "Swap 1 with 11.",
  },
  {
    instruction: "Step 8: Swap 1 and 5.",
    explanation:
      "Same rule still. 1 moved down. Under it now are 4 and 5. 5 is bigger than 1, so swap them.<br><br>" +
      "Array: [11, 5, 3, 4, 1]. The rule holds everywhere — Part 2 is done.",
    expectedAction: [1, 5],
    errorMessage: "Swap 1 with 5.",
  },
  {
    instruction: "Step 9: Swap the root 11 (top of the tree) with the last element 1.",
    explanation:
      "Part 3 — sorting. Unlike Part 2 (bottom-up from the last parent), sorting always starts at the TOP.<br>" +
      "The top number is the biggest still being sorted, so swap it with the LAST number still being sorted. Next we will fix FROM THE TOP DOWN: look at the left and right children under the current number, swap with the LARGER child if that child is bigger, and keep going down from the new spot until the number is ≥ what is under it.<br>" +
      "Numbers to the right of | are already sorted and stay put.<br><br>" +
      "Array: [1, 5, 3, 4 | 11]",
    expectedAction: [11, 1],
    errorMessage: "Swap 11 with 1.",
  },
  {
    instruction: "Step 10: Swap 1 and 5.",
    explanation:
      "Fix FROM THE TOP DOWN. 1 is on top. Look at its left and right children: 5 and 3. 5 is the LARGER child and bigger than 1, so swap them.<br><br>" +
      "Array: [5, 1, 3, 4 | 11]",
    expectedAction: [1, 5],
    errorMessage: "Swap 1 with 5.",
  },
  {
    instruction: "Step 11: Swap 1 and 4.",
    explanation:
      "Keep going down from the new spot. The only child still under 1 (and still being sorted) is 4. 4 is bigger than 1, so swap them.<br><br>" +
      "Array: [5, 4, 3, 1 | 11]. 1 is now ≥ what is under it — the top-down fix is done.",
    expectedAction: [1, 4],
    errorMessage: "Swap 1 with 4.",
  },
  {
    instruction: "Step 12: Swap the root 5 (top of the tree) with the last element 1.",
    explanation:
      "Back to the TOP. Swap the top number with the LAST number still being sorted.<br><br>" +
      "Array: [1, 4, 3 | 5, 11]",
    expectedAction: [5, 1],
    errorMessage: "Swap 5 with 1.",
  },
  {
    instruction: "Step 13: Swap 1 and 4.",
    explanation:
      "Fix FROM THE TOP DOWN again. Under 1 are left and right children 4 and 3. 4 is the LARGER child and bigger than 1, so swap them.<br><br>" +
      "Array: [4, 1, 3 | 5, 11]",
    expectedAction: [1, 4],
    errorMessage: "Swap 1 with 4.",
  },
  {
    instruction: "Step 14: Swap the root 4 (top of the tree) with the last element 3.",
    explanation:
      "1 has nothing under it left to sort, so stop going down. Back to the TOP: swap the top number with the LAST number still being sorted.<br><br>" +
      "Array: [3, 1 | 4, 5, 11]",
    expectedAction: [4, 3],
    errorMessage: "Swap 4 with 3.",
  },
  {
    instruction: "Step 15: Swap the root 3 (top of the tree) with the last element 1.",
    explanation:
      "Fix FROM THE TOP DOWN: 3 is already ≥ 1 under it, so no swap needed. Swap the top number with the LAST number still being sorted.<br><br>" +
      "Array: [1 | 3, 4, 5, 11]. Only one number is left to sort — the list is done: [1, 3, 4, 5, 11].",
    expectedAction: [3, 1],
    errorMessage: "Swap 3 with 1.",
  },
];
