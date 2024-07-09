export class InsertionSortAlgorithm {
  constructor(array) {
    this.array = [...array]; // Copy the input array
    this.currentIndex = 1; // Start sorting from the second element
    this.currentValue = this.array[this.currentIndex];
    this.innerIndex = this.currentIndex - 1; // Initialize innerIndex for the while loop
  }

  // Check if the swap is correct and perform the swap if it is
  checkSwap(userSwapIndex1, userSwapIndex2) {
    if (
      userSwapIndex1 === this.innerIndex &&
      userSwapIndex2 === this.innerIndex + 1 &&
      this.array[userSwapIndex1] > this.array[userSwapIndex2]
    ) {
      // Perform the swap as the user suggests
      [this.array[userSwapIndex1], this.array[userSwapIndex2]] = [
        this.array[userSwapIndex2],
        this.array[userSwapIndex1],
      ];

      // Advance to the next step in the algorithm
      this.innerIndex--;

      if (
        this.innerIndex < 0 ||
        this.array[this.innerIndex] <= this.currentValue
      ) {
        this.array[this.innerIndex + 1] = this.currentValue;
        this.currentIndex++;
        if (this.currentIndex < this.array.length) {
          this.currentValue = this.array[this.currentIndex];
          this.innerIndex = this.currentIndex - 1;
        }
      }

      return true; // The swap was correct
    }

    return false; // The swap was incorrect
  }

  // Get the current state of the array
  getArray() {
    return [...this.array];
  }

  // Check if the sorting is complete
  isComplete() {
    return this.currentIndex >= this.array.length;
  }
}
const array = [5, 2, 9, 1, 5, 6];
const insertionSort = new InsertionSortAlgorithm(array);

// Predefined swaps for testing
const swaps = [
  [1, 2], // Correct swap for 2 and 5
  [0, 1], // Correct swap for 2 and 5
  [2, 3], // Correct swap for 1 and 9
  [1, 2], // Correct swap for 1 and 5
  [0, 1], // Correct swap for 1 and 2
  [3, 4], // Correct swap for 5 and 9
  [2, 3], // Correct swap for 5 and 5 (but won't change anything)
];

let step = 0;

while (!insertionSort.isComplete() && step < swaps.length) {
  const [userSwapIndex1, userSwapIndex2] = swaps[step];
  const isCorrect = insertionSort.checkSwap(userSwapIndex1, userSwapIndex2);
  console.log(
    `Swap ${userSwapIndex1} with ${userSwapIndex2}: ${
      isCorrect ? "Correct swap!" : "Incorrect swap."
    }`
  );
  console.log(insertionSort.getArray());
  step++;
}

console.log("Final sorted array:", insertionSort.getArray());
