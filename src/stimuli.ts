export interface Stimulus {
  id: string;
  language: string;
  code: string;
  explanation: string;
  isCorrect: boolean;
  socialProof: number;
  aiConfidence: "High" | "Medium" | "Low";
  isPractice?: boolean;
}

export const STIMULI: Stimulus[] = [
  // --- PRACTICE TRIALS (At the beginning) ---
  {
    id: "practice_1",
    language: "python",
    code: `def is_even(n):
    if n % 2 == 0:
        return True
    else:
        return False

result = is_even(4)
print(result)`,
    explanation: "Checks if a number is even using modulo. Returns True for 4.",
    isCorrect: true,
    socialProof: 98,
    aiConfidence: "High",
    isPractice: true
  },
  {
    id: "practice_2",
    language: "python",
    code: `def greet_all(names):
    for name in names:
        # Bug: Trying to concatenate string and list
        print("Hello, " + names)`,
    explanation: "Attempts to print a greeting for each name in a list.",
    isCorrect: false,
    socialProof: 12,
    aiConfidence: "Low",
    isPractice: true
  },

  // --- MAIN TRIALS (Jumbled) ---

  // Trial 1: Matching Correct/High
  {
    id: "trial_1",
    language: "python",
    code: `def is_palindrome(s):
    s = s.lower().replace(" ", "")
    return s == s[::-1]

print(is_palindrome("Race Car"))`,
    explanation: "Checks if a string is a palindrome after normalizing case and spaces.",
    isCorrect: true,
    socialProof: 95,
    aiConfidence: "High"
  },
  
  // Trial 6: Matching Incorrect/Low
  {
    id: "trial_6",
    language: "python",
    code: `def linear_search(arr, target):
    for i in range(len(arr)):
        if arr[i] == target:
            # Bug: Always returns the next index
            return i + 1
    return -1`,
    explanation: "Finds the index of a target value in an array.",
    isCorrect: false,
    socialProof: 8,
    aiConfidence: "Low"
  },

  // Trial 13: Mismatched Incorrect/High (Over-reliance Test)
  {
    id: "trial_13",
    language: "python",
    code: `def binary_search(arr, target):
    low, high = 0, len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target: return mid
        # Bug: Using floor division on low instead of moving bounds
        elif arr[mid] < target: low = low // 2
        else: high = mid - 1
    return -1`,
    explanation: "Performs binary search on a sorted array.",
    isCorrect: false,
    socialProof: 92,
    aiConfidence: "High"
  },

  // Trial 2: Matching Correct/High
  {
    id: "trial_2",
    language: "python",
    code: `def factorial(n):
    if n == 0: return 1
    return n * factorial(n - 1)

print(factorial(5))`,
    explanation: "Recursive implementation of factorial. Returns 120 for 5.",
    isCorrect: true,
    socialProof: 93,
    aiConfidence: "High"
  },

  // Trial 11: Mismatched Correct/Low (Under-reliance Test)
  {
    id: "trial_11",
    language: "python",
    code: `def is_prime(n):
    if n < 2: return False
    for i in range(2, int(n**0.5) + 1):
        if n % i == 0: return False
    return True`,
    explanation: "Checks if a number is prime using square root optimization.",
    isCorrect: true,
    socialProof: 14,
    aiConfidence: "Low"
  },

  // Trial 7: Matching Incorrect/Low
  {
    id: "trial_7",
    language: "python",
    code: `def celsius_to_fahrenheit(c):
    # Bug: Wrong calculation order (should be c * 9/5 + 32)
    return (c + 32) * 5 / 9`,
    explanation: "Converts temperature from Celsius to Fahrenheit.",
    isCorrect: false,
    socialProof: 14,
    aiConfidence: "Low"
  },

  // Trial 4: Matching Correct/High
  {
    id: "trial_4",
    language: "python",
    code: `def count_vowels(text):
    return sum(1 for char in text.lower() if char in "aeiou")`,
    explanation: "Uses a generator expression to count vowels in a string.",
    isCorrect: true,
    socialProof: 94,
    aiConfidence: "High"
  },

  // Trial 14: Mismatched Incorrect/High (Over-reliance Test)
  {
    id: "trial_14",
    language: "python",
    code: `class Stack:
    def __init__(self): self.items = []
    def push(self, x): self.items.append(x)
    def pop(self): 
        # Bug: Removes from front (index 0), making it a Queue
        return self.items.pop(0)`,
    explanation: "A standard LIFO Stack implementation.",
    isCorrect: false,
    socialProof: 94,
    aiConfidence: "High"
  },

  // Trial 8: Matching Incorrect/Low
  {
    id: "trial_8",
    language: "python",
    code: `def remove_duplicates(arr):
    seen = set()
    res = []
    for i in arr:
        # Bug: Logic is reversed, keeps duplicates
        if i in seen:
            res.append(i)
        seen.add(i)
    return res`,
    explanation: "Attempts to return a list with unique elements only.",
    isCorrect: false,
    socialProof: 6,
    aiConfidence: "Low"
  },

  // Trial 5: Matching Correct/High
  {
    id: "trial_5",
    language: "python",
    code: `def is_valid_triangle(a, b, c):
    return a + b > c and a + c > b and b + c > a`,
    explanation: "Checks the triangle inequality theorem for three sides.",
    isCorrect: true,
    socialProof: 90,
    aiConfidence: "High"
  },

  // Trial 12: Mismatched Correct/Low (Under-reliance Test)
  {
    id: "trial_12",
    language: "python",
    code: `def flatten(matrix):
    return [item for row in matrix for item in row]`,
    explanation: "Flattens a 2D list into a 1D list using comprehension.",
    isCorrect: true,
    socialProof: 11,
    aiConfidence: "Low"
  },

  // Trial 3: Matching Correct/High
  {
    id: "trial_3",
    language: "python",
    code: `def fizzbuzz(n):
    res = []
    for i in range(1, n + 1):
        if i % 15 == 0: res.append("FizzBuzz")
        elif i % 3 == 0: res.append("Fizz")
        elif i % 5 == 0: res.append("Buzz")
        else: res.append(str(i))
    return res`,
    explanation: "Standard FizzBuzz logic with correct order of divisors.",
    isCorrect: true,
    socialProof: 91,
    aiConfidence: "High"
  },

  // Trial 9: Matching Incorrect/Low
  {
    id: "trial_9",
    language: "python",
    code: `def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n - i - 1):
            # Bug: Sorts in descending order instead of ascending
            if arr[j] < arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr`,
    explanation: "Sorts a list in ascending order using the bubble sort algorithm.",
    isCorrect: false,
    socialProof: 11,
    aiConfidence: "Low"
  },

  // Trial 10: Matching Incorrect/Low
  {
    id: "trial_10",
    language: "python",
    code: `def get_word_count(s):
    # Bug: len() on string returns chars, not words
    return len(s)`,
    explanation: "Returns the number of words in a sentence.",
    isCorrect: false,
    socialProof: 5,
    aiConfidence: "Low"
  }
];