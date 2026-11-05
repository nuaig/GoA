// Steps for the Heapsort tutorial (array [1, 5, 3, 4, 11]).
// expectedAction: [value] to place in the tree (build phase), [a, b] values to swap, or null.
export const tutorialSteps = [
  {
    instruction:
      "Let's start by building a Binary Heap from the given array: [1, 5, 3, 4, 11]. Let's try to click, hold and drag one of the elements in the array to begin the tutorial. ",
    explanation:
      "Step 1 of HeapSort is converting the array into a Binary Heap. A Binary Heap is a complete binary tree where elements are inserted from top to bottom, left to right. We are building a **Max-Heap**, where each parent is **greater than or equal to** its children.",
    expectedAction: null, // No specific action yet
    errorMessage: "Click on the tree area to start the tutorial.",
  },
  {
    instruction: "Drag and insert 1 (index-0) at the root of the heap.",
    explanation:
      "In a binary heap, elements are inserted from top to bottom, left to right. We will fill the index-0 element at the top. Therefore, the first element in the array (1) becomes the root node in the binary heap. One thing to note is that each element from Binary Heap will have maximum 2 elements (left and right children).",
    expectedAction: [1], // Expecting node 1 to be placed at the root
    errorMessage: "Place 1 at the root of the tree.",
  },
  {
    instruction:
      "Drag and Insert 5 (index-1)  as the left child of 1 in Binary Heap.",
    explanation:
      "In a binary heap, elements are inserted from top to bottom, left to right. Since highest layer is already filled, we will go down one layer and start filling it from left to right. Therefore, the next element 5 (index-1) becomes the left child of 1.",
    expectedAction: [5], // Expecting node 5 to be placed as the left child of 1
    errorMessage: "Place 5 as the left child of node 1.",
  },
  {
    instruction:
      "Drag and Insert 3 (index-2) as the right child of 1 in Binary Heap.",
    explanation:
      "Since this second layer isn't filled yet, we will keep filling it from left to right. As a result, the next element 3 (index-2) will be dragged and inserted as the right child of 1 (index-0) to maintain the binary heap structure.",
    expectedAction: [3], // Expecting node 3 to be placed as the right child of 1
    errorMessage: "Place 3 as the right child of node 1.",
  },
  {
    instruction:
      "Drag and Insert 4 (index-3) as the left child of 5 in Binary Heap.",
    explanation:
      "Since second layer is already filled, you will go down to next layer and continue the left-to-right insertion. Therefore, the next element 4 (index-3) is placed as the left child of 5.",
    expectedAction: [4], // Expecting node 4 to be placed as the left child of 5
    errorMessage: "Place 4 as the left child of node 5.",
  },
  {
    instruction:
      "Drag and Insert 11 (index-4) as the right child of 5 in Binary Heap.",
    explanation:
      "Continuing the left-to-right insertion, the last element 11 (index-4) is placed as the right child of 5 to maintain the binary heap structure.",
    expectedAction: [11], // Expecting node 11 to be placed as the right child of 5
    errorMessage: "Place 11 as the right child of node 5.",
  },

  {
    instruction:
      "Now that you have binary heap data structure. Let's start building Max Heap. Swap 5 and 11 to maintain the Max-Heap property.",
    explanation:
      "Step 2 of Heapsort is to build Max Heap which means every element will be larger than its children. You will start at the last parent node (index ⌊n/2 - 1⌋). If that parent node is smaller than its children, we will need to swap it with the largest child. As a result, 5 (index-1) will be swapped with 11 (index-4).",
    expectedAction: [5, 11],
    errorMessage: "",
  },
  {
    instruction:
      "Next step is to decrement the index of last parent node (index-1). The parent node you will be checking becomes index-0. Now, swap 1 (index-0) and 11 (index-1)",
    explanation:
      "If you look at last parent node (index-1) which becomes 11 after previous swap, you will notice that it meets max heap property since it is larger than its children. You will move backwards from that parent index and land on index-0. After checking both of its children, wee will swap 1 (index-0) with 11 (index-1) as 11 is the bigger child.",
    expectedAction: [1, 11], // Expecting node 11 to be placed as the right child of 1
    errorMessage: "",
  },
  {
    instruction:
      "Swap 1 (index-1) and 5 (index-4) to maintain the Max-Heap property. Before you decrement the parent index, always remember to check if the sub-tree still maintains max heap property after swapping.",
    explanation:
      "After each swap, continue checking the newly swapped value with its children and swapping downwards to keep the entire subtree in correct heap order. After swapping 1 to index-1, it still violates the Max-Heap rule as it has a larger child (5 at index-4)",
    expectedAction: [1, 5],
    errorMessage: "",
  },
  {
    instruction:
      "Max-Heap construction is complete! Now, let's proceed with HeapSort. Swap the root (maximum element 11) with the last element 1 (index-4) and remove it.",
    explanation:
      "HeapSort works by repeatedly removing the largest element (root) and swapping it with the last element. This step **places the largest element at the correct sorted position**.",
    expectedAction: [11, 1],
    errorMessage: "",
  },
  {
    instruction:
      "Reheapify the heap after removing the root node. Swap 1 (index-0) and 5 (index-1) to restructure max-heap. ",
    explanation:
      "After removing the root (11), the heap is **restructured**. The new root (1 at index-0) violates the Max-Heap property, so we swap it with 5 (index-1).",
    expectedAction: [1, 5],
    errorMessage: "",
  },
  {
    instruction:
      "Continue checking the newly swapped value with its children and swapping downwards as needed. Swap 1 (index-1) with its left child 4 (index-3).",
    explanation:
      "We check the newly swapped element 1 (index-1) with its children to see if it requires more swapping downwards. Since left child 4 (index-3) is bigger than its parent 1 (index-1), we swap them to maintain max heap property",
    expectedAction: [1, 4],
    errorMessage: "",
  },
  {
    instruction:
      "Now that we have max heap again, swap the root (maximum element 5) with the last element 1 (index-3) and remove it.",
    explanation:
      "After restoring heap order, we remove the largest element (root) and swapping it with the last element. As we remove largest elements one after another, the array will becomed sorted",
    expectedAction: [5, 1],
    errorMessage: "",
  },
  {
    instruction:
      "Re-Heapify the tree. Swap 1 (index-0) with its left child 4 (index-1)",
    explanation:
      "After removing the root node, you must restore the Max-Heap property by performing heapify operations. as a result, the new root 1 (index-0) will be swapped with 4 (index-1) since 4 is the largest child of 1.",
    expectedAction: [1, 4],
    errorMessage: "",
  },
  {
    instruction:
      "Now that we have max heap again, swap the root (maximum element 4) with the last element 3 (index-2) and remove 4.",
    explanation:
      "Once the heap is restructured, we continue **extracting the max element**. Swap 4 with 3.",
    expectedAction: [4, 3],
    errorMessage: "",
  },
  {
    instruction:
      "Since we still have the max Heap after previous swap, let's swap the root (maximum element 3) with the last element 1 (index-1) and remove 3.",
    explanation:
      "After this swap, we will see that all elements will be sorted and heapsort algorithm will be completed.",
    expectedAction: [3, 1],
    errorMessage: "",
  },
];
