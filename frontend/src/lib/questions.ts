export interface QuestionExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface Question {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topics: string[];
  description: string;
  examples: QuestionExample[];
  constraints: string[];
  hints: string[];
  starterCode: Record<string, string>;
}

export const QUESTIONS: Question[] = [
  {
    id: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    topics: ['Array', 'Hash Table'],
    description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

You can return the answer in any order.`,
    examples: [
      {
        input: 'nums = [2,7,11,15], target = 9',
        output: '[0, 1]',
        explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].',
      },
      {
        input: 'nums = [3,2,4], target = 6',
        output: '[1, 2]',
        explanation: 'Because nums[1] + nums[2] == 6, we return [1, 2].',
      },
      {
        input: 'nums = [3,3], target = 6',
        output: '[0, 1]',
      },
    ],
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9',
      'Only one valid answer exists.',
    ],
    hints: [
      'A brute force approach would take O(n²) time. Can you do better using a hash table?',
      'Can you check if target - current_number has already been seen as you iterate through the list?',
    ],
    starterCode: {
      python: `def twoSum(nums: list[int], target: int) -> list[int]:
    # Write your solution here
    seen = {}
    for i, n in enumerate(nums):
        complement = target - n
        if complement in seen:
            return [seen[complement], i]
        seen[n] = i
    return []

if __name__ == "__main__":
    nums = [2, 7, 11, 15]
    target = 9
    print(twoSum(nums, target))
`,
      javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
    const map = new Map();
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (map.has(complement)) {
            return [map.get(complement), i];
        }
        map.set(nums[i], i);
    }
    return [];
}

console.log(twoSum([2, 7, 11, 15], 9));
`,
      typescript: `function twoSum(nums: number[], target: number): number[] {
    const map = new Map<number, number>();
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (map.has(complement)) {
            return [map.get(complement)!, i];
        }
        map.set(nums[i], i);
    }
    return [];
}

console.log(twoSum([2, 7, 11, 15], 9));
`,
      cpp: `#include <iostream>
#include <vector>
#include <unordered_map>

std::vector<int> twoSum(const std::vector<int>& nums, int target) {
    std::unordered_map<int, int> seen;
    for (int i = 0; i < nums.size(); ++i) {
        int comp = target - nums[i];
        if (seen.find(comp) != seen.end()) {
            return {seen[comp], i};
        }
        seen[nums[i]] = i;
    }
    return {};
}

int main() {
    std::vector<int> nums = {2, 7, 11, 15};
    int target = 9;
    auto res = twoSum(nums, target);
    std::cout << "[" << res[0] << ", " << res[1] << "]" << std::endl;
    return 0;
}
`,
      c: `#include <stdio.h>
#include <stdlib.h>

int* twoSum(int* nums, int numsSize, int target, int* returnSize) {
    *returnSize = 2;
    int* res = (int*)malloc(2 * sizeof(int));
    for (int i = 0; i < numsSize; i++) {
        for (int j = i + 1; j < numsSize; j++) {
            if (nums[i] + nums[j] == target) {
                res[0] = i;
                res[1] = j;
                return res;
            }
        }
    }
    return res;
}

int main() {
    int nums[] = {2, 7, 11, 15};
    int returnSize;
    int* res = twoSum(nums, 4, 9, &returnSize);
    printf("[%d, %d]\\n", res[0], res[1]);
    free(res);
    return 0;
}
`,
      java: `import java.util.HashMap;
import java.util.Arrays;

public class Main {
    public static int[] twoSum(int[] nums, int target) {
        HashMap<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int comp = target - nums[i];
            if (map.containsKey(comp)) {
                return new int[] { map.get(comp), i };
            }
            map.put(nums[i], i);
        }
        return new int[] {};
    }

    public static void main(String[] args) {
        int[] nums = {2, 7, 11, 15};
        int target = 9;
        int[] res = twoSum(nums, target);
        System.out.println(Arrays.toString(res));
    }
}
`,
    },
  },
  {
    id: 'reverse-string',
    title: 'Reverse String',
    difficulty: 'Easy',
    topics: ['Two Pointers', 'String'],
    description: `Write a function that reverses a string. The input string is given as an array of characters \`s\`.

You must do this by modifying the input array **in-place** with \`O(1)\` extra memory.`,
    examples: [
      {
        input: 's = ["h","e","l","l","o"]',
        output: '["o","l","l","e","h"]',
      },
      {
        input: 's = ["H","a","n","n","a","h"]',
        output: '["h","a","n","n","a","H"]',
      },
    ],
    constraints: [
      '1 <= s.length <= 10^5',
      's[i] is a printable ASCII character.',
    ],
    hints: [
      'The entire logic is swapping opposite elements: left with right.',
      'Can you maintain two pointers, one from the start and one from the end?',
    ],
    starterCode: {
      python: `def reverseString(s: list[str]) -> None:
    left, right = 0, len(s) - 1
    while left < right:
        s[left], s[right] = s[right], s[left]
        left += 1
        right -= 1

if __name__ == "__main__":
    chars = ["h", "e", "l", "l", "o"]
    reverseString(chars)
    print(chars)
`,
      javascript: `/**
 * @param {character[]} s
 * @return {void}
 */
function reverseString(s) {
    let left = 0, right = s.length - 1;
    while (left < right) {
        const temp = s[left];
        s[left] = s[right];
        s[right] = temp;
        left++;
        right--;
    }
}

const s = ["h", "e", "l", "l", "o"];
reverseString(s);
console.log(JSON.stringify(s));
`,
      typescript: `function reverseString(s: string[]): void {
    let left = 0, right = s.length - 1;
    while (left < right) {
        const temp = s[left];
        s[left] = s[right];
        s[right] = temp;
        left++;
        right--;
    }
}

const s = ["h", "e", "l", "l", "o"];
reverseString(s);
console.log(JSON.stringify(s));
`,
      cpp: `#include <iostream>
#include <vector>

void reverseString(std::vector<char>& s) {
    int left = 0, right = s.size() - 1;
    while (left < right) {
        std::swap(s[left++], s[right--]);
    }
}

int main() {
    std::vector<char> s = {'h', 'e', 'l', 'l', 'o'};
    reverseString(s);
    for (char c : s) std::cout << c;
    std::cout << std::endl;
    return 0;
}
`,
      c: `#include <stdio.h>
#include <string.h>

void reverseString(char* s, int sSize) {
    int left = 0, right = sSize - 1;
    while (left < right) {
        char tmp = s[left];
        s[left] = s[right];
        s[right] = tmp;
        left++;
        right--;
    }
}

int main() {
    char s[] = "hello";
    reverseString(s, 5);
    printf("%s\\n", s);
    return 0;
}
`,
      java: `import java.util.Arrays;

public class Main {
    public static void reverseString(char[] s) {
        int left = 0, right = s.length - 1;
        while (left < right) {
            char temp = s[left];
            s[left] = s[right];
            s[right] = temp;
            left++;
            right--;
        }
    }

    public static void main(String[] args) {
        char[] s = {'h', 'e', 'l', 'l', 'o'};
        reverseString(s);
        System.out.println(Arrays.toString(s));
    }
}
`,
    },
  },
  {
    id: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'Easy',
    topics: ['Stack', 'String'],
    description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
    examples: [
      { input: 's = "()"', output: 'true' },
      { input: 's = "()[]{}"', output: 'true' },
      { input: 's = "(]"', output: 'false' },
    ],
    constraints: [
      '1 <= s.length <= 10^4',
      "s consists of parentheses only '()[]{}'.",
    ],
    hints: [
      'Think about using a Stack: when you see an opening bracket, push it. When you see a closing bracket, check if it matches the top of the stack.',
    ],
    starterCode: {
      python: `def isValid(s: str) -> bool:
    stack = []
    mapping = {')': '(', '}': '{', ']': '['}
    for char in s:
        if char in mapping:
            top = stack.pop() if stack else '#'
            if mapping[char] != top:
                return False
        else:
            stack.append(char)
    return not stack

if __name__ == "__main__":
    print(isValid("()[]{}"))
`,
      javascript: `/**
 * @param {string} s
 * @return {boolean}
 */
function isValid(s) {
    const stack = [];
    const mapping = { ')': '(', '}': '{', ']': '[' };
    for (const char of s) {
        if (char in mapping) {
            const top = stack.pop() || '#';
            if (mapping[char] !== top) return false;
        } else {
            stack.push(char);
        }
    }
    return stack.length === 0;
}

console.log(isValid("()[]{}"));
`,
      typescript: `function isValid(s: string): boolean {
    const stack: string[] = [];
    const mapping: Record<string, string> = { ')': '(', '}': '{', ']': '[' };
    for (const char of s) {
        if (char in mapping) {
            const top = stack.pop() || '#';
            if (mapping[char] !== top) return false;
        } else {
            stack.push(char);
        }
    }
    return stack.length === 0;
}

console.log(isValid("()[]{}"));
`,
      cpp: `#include <iostream>
#include <string>
#include <stack>
#include <unordered_map>

bool isValid(const std::string& s) {
    std::stack<char> st;
    std::unordered_map<char, char> map = {{')', '('}, {'}', '{'}, {']', '['}};
    for (char c : s) {
        if (map.count(c)) {
            if (st.empty() || st.top() != map[c]) return false;
            st.pop();
        } else {
            st.push(c);
        }
    }
    return st.empty();
}

int main() {
    std::cout << std::boolalpha;
    std::cout << isValid("()[]{}") << std::endl;
    return 0;
}
`,
      c: `#include <stdio.h>
#include <stdbool.h>
#include <string.h>

bool isValid(char* s) {
    int len = strlen(s);
    char stack[len + 1];
    int top = -1;
    for (int i = 0; i < len; i++) {
        char c = s[i];
        if (c == '(' || c == '{' || c == '[') {
            stack[++top] = c;
        } else {
            if (top == -1) return false;
            char open = stack[top--];
            if (c == ')' && open != '(') return false;
            if (c == '}' && open != '{') return false;
            if (c == ']' && open != '[') return false;
        }
    }
    return top == -1;
}

int main() {
    printf("%s\\n", isValid("()[]{}") ? "true" : "false");
    return 0;
}
`,
      java: `import java.util.Stack;
import java.util.HashMap;

public class Main {
    public static boolean isValid(String s) {
        Stack<Character> stack = new Stack<>();
        HashMap<Character, Character> map = new HashMap<>();
        map.put(')', '(');
        map.put('}', '{');
        map.put(']', '[');
        
        for (char c : s.toCharArray()) {
            if (map.containsKey(c)) {
                char top = stack.isEmpty() ? '#' : stack.pop();
                if (top != map.get(c)) return false;
            } else {
                stack.push(c);
            }
        }
        return stack.isEmpty();
    }

    public static void main(String[] args) {
        System.out.println(isValid("()[]{}"));
    }
}
`,
    },
  },
  {
    id: 'best-time-to-buy-and-sell-stock',
    title: 'Best Time to Buy and Sell Stock',
    difficulty: 'Easy',
    topics: ['Array', 'Dynamic Programming', 'Greedy'],
    description: `You are given an array \`prices\` where \`prices[i]\` is the price of a given stock on the \`ith\` day.

You want to maximize your profit by choosing a **single day** to buy one stock and choosing a **different day in the future** to sell that stock.

Return the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return \`0\`.`,
    examples: [
      {
        input: 'prices = [7,1,5,3,6,4]',
        output: '5',
        explanation: 'Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6 - 1 = 5.',
      },
      {
        input: 'prices = [7,6,4,3,1]',
        output: '0',
        explanation: 'In this case, no transactions are done and the max profit = 0.',
      },
    ],
    constraints: [
      '1 <= prices.length <= 10^5',
      '0 <= prices[i] <= 10^4',
    ],
    hints: [
      'Can you track the minimum price seen so far while iterating through the array?',
      'At each day, the potential profit would be current_price - min_price_so_far.',
    ],
    starterCode: {
      python: `def maxProfit(prices: list[int]) -> int:
    min_price = float('inf')
    max_p = 0
    for price in prices:
        if price < min_price:
            min_price = price
        elif price - min_price > max_p:
            max_p = price - min_price
    return max_p

if __name__ == "__main__":
    print(maxProfit([7, 1, 5, 3, 6, 4]))
`,
      javascript: `/**
 * @param {number[]} prices
 * @return {number}
 */
function maxProfit(prices) {
    let minPrice = Infinity;
    let maxProfit = 0;
    for (const p of prices) {
        if (p < minPrice) minPrice = p;
        else if (p - minPrice > maxProfit) maxProfit = p - minPrice;
    }
    return maxProfit;
}

console.log(maxProfit([7, 1, 5, 3, 6, 4]));
`,
      typescript: `function maxProfit(prices: number[]): number {
    let minPrice = Infinity;
    let maxProfit = 0;
    for (const p of prices) {
        if (p < minPrice) minPrice = p;
        else if (p - minPrice > maxProfit) maxProfit = p - minPrice;
    }
    return maxProfit;
}

console.log(maxProfit([7, 1, 5, 3, 6, 4]));
`,
      cpp: `#include <iostream>
#include <vector>
#include <algorithm>

int maxProfit(const std::vector<int>& prices) {
    int minPrice = 1e9;
    int maxProfit = 0;
    for (int p : prices) {
        minPrice = std::min(minPrice, p);
        maxProfit = std::max(maxProfit, p - minPrice);
    }
    return maxProfit;
}

int main() {
    std::cout << maxProfit({7, 1, 5, 3, 6, 4}) << std::endl;
    return 0;
}
`,
      c: `#include <stdio.h>

int maxProfit(int* prices, int pricesSize) {
    int minPrice = 1000000;
    int maxP = 0;
    for (int i = 0; i < pricesSize; i++) {
        if (prices[i] < minPrice) minPrice = prices[i];
        else if (prices[i] - minPrice > maxP) maxP = prices[i] - minPrice;
    }
    return maxP;
}

int main() {
    int p[] = {7, 1, 5, 3, 6, 4};
    printf("%d\\n", maxProfit(p, 6));
    return 0;
}
`,
      java: `public class Main {
    public static int maxProfit(int[] prices) {
        int minPrice = Integer.MAX_VALUE;
        int maxProfit = 0;
        for (int p : prices) {
            if (p < minPrice) minPrice = p;
            else if (p - minPrice > maxProfit) maxProfit = p - minPrice;
        }
        return maxProfit;
    }

    public static void main(String[] args) {
        int[] p = {7, 1, 5, 3, 6, 4};
        System.out.println(maxProfit(p));
    }
}
`,
    },
  },
  {
    id: 'binary-search',
    title: 'Binary Search',
    difficulty: 'Easy',
    topics: ['Binary Search', 'Array'],
    description: `Given an array of integers \`nums\` which is sorted in ascending order, and an integer \`target\`, write a function to search \`target\` in \`nums\`. If \`target\` exists, then return its index. Otherwise, return \`-1\`.

You must write an algorithm with \`O(log n)\` runtime complexity.`,
    examples: [
      {
        input: 'nums = [-1,0,3,5,9,12], target = 9',
        output: '4',
        explanation: '9 exists in nums and its index is 4',
      },
      {
        input: 'nums = [-1,0,3,5,9,12], target = 2',
        output: '-1',
        explanation: '2 does not exist in nums so return -1',
      },
    ],
    constraints: [
      '1 <= nums.length <= 10^4',
      '-10^4 < nums[i], target < 10^4',
      'All the integers in nums are unique.',
      'nums is sorted in ascending order.',
    ],
    hints: [
      'Maintain two pointers: left = 0 and right = n - 1.',
      'Compare target with the middle element: nums[mid].',
    ],
    starterCode: {
      python: `def search(nums: list[int], target: int) -> int:
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

if __name__ == "__main__":
    print(search([-1, 0, 3, 5, 9, 12], 9))
`,
      javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number}
 */
function search(nums, target) {
    let left = 0, right = nums.length - 1;
    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (nums[mid] === target) return mid;
        if (nums[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}

console.log(search([-1, 0, 3, 5, 9, 12], 9));
`,
      typescript: `function search(nums: number[], target: number): number {
    let left = 0, right = nums.length - 1;
    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (nums[mid] === target) return mid;
        if (nums[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}

console.log(search([-1, 0, 3, 5, 9, 12], 9));
`,
      cpp: `#include <iostream>
#include <vector>

int search(const std::vector<int>& nums, int target) {
    int left = 0, right = nums.size() - 1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (nums[mid] == target) return mid;
        if (nums[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}

int main() {
    std::cout << search({-1, 0, 3, 5, 9, 12}, 9) << std::endl;
    return 0;
}
`,
      c: `#include <stdio.h>

int search(int* nums, int numsSize, int target) {
    int left = 0, right = numsSize - 1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (nums[mid] == target) return mid;
        if (nums[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}

int main() {
    int nums[] = {-1, 0, 3, 5, 9, 12};
    printf("%d\\n", search(nums, 6, 9));
    return 0;
}
`,
      java: `public class Main {
    public static int search(int[] nums, int target) {
        int left = 0, right = nums.length - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] == target) return mid;
            if (nums[mid] < target) left = mid + 1;
            else right = mid - 1;
        }
        return -1;
    }

    public static void main(String[] args) {
        int[] nums = {-1, 0, 3, 5, 9, 12};
        System.out.println(search(nums, 9));
    }
}
`,
    },
  },
  {
    id: 'maximum-subarray',
    title: 'Maximum Subarray',
    difficulty: 'Medium',
    topics: ['Array', 'Dynamic Programming', 'Divide and Conquer'],
    description: `Given an integer array \`nums\`, find the subarray with the largest sum, and return *its sum*.

This is known as **Kadane's Algorithm**.`,
    examples: [
      {
        input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]',
        output: '6',
        explanation: 'The subarray [4,-1,2,1] has the largest sum 6.',
      },
      {
        input: 'nums = [1]',
        output: '1',
      },
      {
        input: 'nums = [5,4,-1,7,8]',
        output: '23',
      },
    ],
    constraints: [
      '1 <= nums.length <= 10^5',
      '-10^4 <= nums[i] <= 10^4',
    ],
    hints: [
      'How does the sum change as you add the next number?',
      'If the running sum becomes negative, is it ever beneficial to keep adding to it?',
    ],
    starterCode: {
      python: `def maxSubArray(nums: list[int]) -> int:
    current_sum = nums[0]
    max_sum = nums[0]
    for n in nums[1:]:
        current_sum = max(n, current_sum + n)
        max_sum = max(max_sum, current_sum)
    return max_sum

if __name__ == "__main__":
    print(maxSubArray([-2, 1, -3, 4, -1, 2, 1, -5, 4]))
`,
      javascript: `/**
 * @param {number[]} nums
 * @return {number}
 */
function maxSubArray(nums) {
    let currentSum = nums[0];
    let maxSum = nums[0];
    for (let i = 1; i < nums.length; i++) {
        currentSum = Math.max(nums[i], currentSum + nums[i]);
        maxSum = Math.max(maxSum, currentSum);
    }
    return maxSum;
}

console.log(maxSubArray([-2, 1, -3, 4, -1, 2, 1, -5, 4]));
`,
      typescript: `function maxSubArray(nums: number[]): number {
    let currentSum = nums[0];
    let maxSum = nums[0];
    for (let i = 1; i < nums.length; i++) {
        currentSum = Math.max(nums[i], currentSum + nums[i]);
        maxSum = Math.max(maxSum, currentSum);
    }
    return maxSum;
}

console.log(maxSubArray([-2, 1, -3, 4, -1, 2, 1, -5, 4]));
`,
      cpp: `#include <iostream>
#include <vector>
#include <algorithm>

int maxSubArray(const std::vector<int>& nums) {
    int cur = nums[0], maxS = nums[0];
    for (size_t i = 1; i < nums.size(); ++i) {
        cur = std::max(nums[i], cur + nums[i]);
        maxS = std::max(maxS, cur);
    }
    return maxS;
}

int main() {
    std::cout << maxSubArray({-2, 1, -3, 4, -1, 2, 1, -5, 4}) << std::endl;
    return 0;
}
`,
      c: `#include <stdio.h>

int maxSubArray(int* nums, int numsSize) {
    int cur = nums[0], maxS = nums[0];
    for (int i = 1; i < numsSize; i++) {
        cur = (nums[i] > cur + nums[i]) ? nums[i] : (cur + nums[i]);
        if (cur > maxS) maxS = cur;
    }
    return maxS;
}

int main() {
    int nums[] = {-2, 1, -3, 4, -1, 2, 1, -5, 4};
    printf("%d\\n", maxSubArray(nums, 9));
    return 0;
}
`,
      java: `public class Main {
    public static int maxSubArray(int[] nums) {
        int cur = nums[0], maxS = nums[0];
        for (int i = 1; i < nums.length; i++) {
            cur = Math.max(nums[i], cur + nums[i]);
            maxS = Math.max(maxS, cur);
        }
        return maxS;
    }

    public static void main(String[] args) {
        int[] nums = {-2, 1, -3, 4, -1, 2, 1, -5, 4};
        System.out.println(maxSubArray(nums));
    }
}
`,
    },
  },
  {
    id: 'container-with-most-water',
    title: 'Container With Most Water',
    difficulty: 'Medium',
    topics: ['Array', 'Two Pointers', 'Greedy'],
    description: `You are given an integer array \`height\` of length \`n\`. There are \`n\` vertical lines drawn such that the two endpoints of the \`ith\` line are \`(i, 0)\` and \`(i, height[i])\`.

Find two lines that together with the x-axis form a container, such that the container contains the most water.

Return *the maximum amount of water a container can store*.`,
    examples: [
      {
        input: 'height = [1,8,6,2,5,4,8,3,7]',
        output: '49',
        explanation: 'The container with maximum water is formed by the 2nd line and the last line, area = min(8, 7) * 7 = 49.',
      },
      {
        input: 'height = [1,1]',
        output: '1',
      },
    ],
    constraints: [
      'n == height.length',
      '2 <= n <= 10^5',
      '0 <= height[i] <= 10^4',
    ],
    hints: [
      'Start with the widest container: two pointers at the ends.',
      'The area is limited by the shorter line. Which pointer should you move?',
    ],
    starterCode: {
      python: `def maxArea(height: list[int]) -> int:
    left, right = 0, len(height) - 1
    max_w = 0
    while left < right:
        h = min(height[left], height[right])
        max_w = max(max_w, h * (right - left))
        if height[left] < height[right]:
            left += 1
        else:
            right -= 1
    return max_w

if __name__ == "__main__":
    print(maxArea([1, 8, 6, 2, 5, 4, 8, 3, 7]))
`,
      javascript: `/**
 * @param {number[]} height
 * @return {number}
 */
function maxArea(height) {
    let left = 0, right = height.length - 1;
    let maxW = 0;
    while (left < right) {
        const h = Math.min(height[left], height[right]);
        maxW = Math.max(maxW, h * (right - left));
        if (height[left] < height[right]) left++;
        else right--;
    }
    return maxW;
}

console.log(maxArea([1, 8, 6, 2, 5, 4, 8, 3, 7]));
`,
      typescript: `function maxArea(height: number[]): number {
    let left = 0, right = height.length - 1;
    let maxW = 0;
    while (left < right) {
        const h = Math.min(height[left], height[right]);
        maxW = Math.max(maxW, h * (right - left));
        if (height[left] < height[right]) left++;
        else right--;
    }
    return maxW;
}

console.log(maxArea([1, 8, 6, 2, 5, 4, 8, 3, 7]));
`,
      cpp: `#include <iostream>
#include <vector>
#include <algorithm>

int maxArea(const std::vector<int>& height) {
    int left = 0, right = height.size() - 1;
    int maxW = 0;
    while (left < right) {
        int h = std::min(height[left], height[right]);
        maxW = std::max(maxW, h * (right - left));
        if (height[left] < height[right]) left++;
        else right--;
    }
    return maxW;
}

int main() {
    std::cout << maxArea({1, 8, 6, 2, 5, 4, 8, 3, 7}) << std::endl;
    return 0;
}
`,
      c: `#include <stdio.h>

int maxArea(int* height, int heightSize) {
    int left = 0, right = heightSize - 1;
    int maxW = 0;
    while (left < right) {
        int h = height[left] < height[right] ? height[left] : height[right];
        int area = h * (right - left);
        if (area > maxW) maxW = area;
        if (height[left] < height[right]) left++;
        else right--;
    }
    return maxW;
}

int main() {
    int h[] = {1, 8, 6, 2, 5, 4, 8, 3, 7};
    printf("%d\\n", maxArea(h, 9));
    return 0;
}
`,
      java: `public class Main {
    public static int maxArea(int[] height) {
        int left = 0, right = height.length - 1;
        int maxW = 0;
        while (left < right) {
            int h = Math.min(height[left], height[right]);
            maxW = Math.max(maxW, h * (right - left));
            if (height[left] < height[right]) left++;
            else right--;
        }
        return maxW;
    }

    public static void main(String[] args) {
        int[] h = {1, 8, 6, 2, 5, 4, 8, 3, 7};
        System.out.println(maxArea(h));
    }
}
`,
    },
  },
  {
    id: 'longest-substring-without-repeating-characters',
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'Medium',
    topics: ['Hash Table', 'String', 'Sliding Window'],
    description: `Given a string \`s\`, find the length of the **longest substring** without repeating characters.`,
    examples: [
      {
        input: 's = "abcabcbb"',
        output: '3',
        explanation: 'The answer is "abc", with the length of 3.',
      },
      {
        input: 's = "bbbbb"',
        output: '1',
        explanation: 'The answer is "b", with the length of 1.',
      },
      {
        input: 's = "pwwkew"',
        output: '3',
        explanation: 'The answer is "wke", with the length of 3.',
      },
    ],
    constraints: [
      '0 <= s.length <= 5 * 10^4',
      's consists of English letters, digits, symbols and spaces.',
    ],
    hints: [
      'Use a sliding window with left and right indices.',
      'Store each character with its latest seen index in a hash map.',
    ],
    starterCode: {
      python: `def lengthOfLongestSubstring(s: str) -> int:
    char_map = {}
    left = 0
    max_len = 0
    for right, char in enumerate(s):
        if char in char_map and char_map[char] >= left:
            left = char_map[char] + 1
        char_map[char] = right
        max_len = max(max_len, right - left + 1)
    return max_len

if __name__ == "__main__":
    print(lengthOfLongestSubstring("abcabcbb"))
`,
      javascript: `/**
 * @param {string} s
 * @return {number}
 */
function lengthOfLongestSubstring(s) {
    const map = new Map();
    let left = 0, maxLen = 0;
    for (let right = 0; right < s.length; right++) {
        if (map.has(s[right]) && map.get(s[right]) >= left) {
            left = map.get(s[right]) + 1;
        }
        map.set(s[right], right);
        maxLen = Math.max(maxLen, right - left + 1);
    }
    return maxLen;
}

console.log(lengthOfLongestSubstring("abcabcbb"));
`,
      typescript: `function lengthOfLongestSubstring(s: string): number {
    const map = new Map<string, number>();
    let left = 0, maxLen = 0;
    for (let right = 0; right < s.length; right++) {
        if (map.has(s[right]) && map.get(s[right])! >= left) {
            left = map.get(s[right])! + 1;
        }
        map.set(s[right], right);
        maxLen = Math.max(maxLen, right - left + 1);
    }
    return maxLen;
}

console.log(lengthOfLongestSubstring("abcabcbb"));
`,
      cpp: `#include <iostream>
#include <string>
#include <unordered_map>
#include <algorithm>

int lengthOfLongestSubstring(const std::string& s) {
    std::unordered_map<char, int> map;
    int left = 0, maxLen = 0;
    for (int right = 0; right < s.size(); ++right) {
        if (map.count(s[right]) && map[s[right]] >= left) {
            left = map[s[right]] + 1;
        }
        map[s[right]] = right;
        maxLen = std::max(maxLen, right - left + 1);
    }
    return maxLen;
}

int main() {
    std::cout << lengthOfLongestSubstring("abcabcbb") << std::endl;
    return 0;
}
`,
      c: `#include <stdio.h>
#include <string.h>

int lengthOfLongestSubstring(char* s) {
    int last[256];
    for (int i = 0; i < 256; i++) last[i] = -1;
    int left = 0, maxLen = 0;
    int len = strlen(s);
    for (int right = 0; right < len; right++) {
        unsigned char c = (unsigned char)s[right];
        if (last[c] >= left) {
            left = last[c] + 1;
        }
        last[c] = right;
        int cur = right - left + 1;
        if (cur > maxLen) maxLen = cur;
    }
    return maxLen;
}

int main() {
    printf("%d\\n", lengthOfLongestSubstring("abcabcbb"));
    return 0;
}
`,
      java: `import java.util.HashMap;

public class Main {
    public static int lengthOfLongestSubstring(String s) {
        HashMap<Character, Integer> map = new HashMap<>();
        int left = 0, maxLen = 0;
        for (int right = 0; right < s.length(); right++) {
            char c = s.charAt(right);
            if (map.containsKey(c) && map.get(c) >= left) {
                left = map.get(c) + 1;
            }
            map.put(c, right);
            maxLen = Math.max(maxLen, right - left + 1);
        }
        return maxLen;
    }

    public static void main(String[] args) {
        System.out.println(lengthOfLongestSubstring("abcabcbb"));
    }
}
`,
    },
  },
  {
    id: 'climbing-stairs',
    title: 'Climbing Stairs',
    difficulty: 'Easy',
    topics: ['Math', 'Dynamic Programming', 'Memoization'],
    description: `You are climbing a staircase. It takes \`n\` steps to reach the top.

Each time you can either climb \`1\` or \`2\` steps. In how many distinct ways can you climb to the top?`,
    examples: [
      {
        input: 'n = 2',
        output: '2',
        explanation: 'There are two ways to climb to the top: 1 step + 1 step, or 2 steps.',
      },
      {
        input: 'n = 3',
        output: '3',
        explanation: 'There are three ways: 1+1+1, 1+2, 2+1.',
      },
    ],
    constraints: [
      '1 <= n <= 45',
    ],
    hints: [
      'To reach step n, you must arrive from either step n - 1 or step n - 2.',
      'Notice that ways(n) = ways(n - 1) + ways(n - 2), which is the Fibonacci sequence!',
    ],
    starterCode: {
      python: `def climbStairs(n: int) -> int:
    if n <= 2:
        return n
    prev, curr = 1, 2
    for _ in range(3, n + 1):
        prev, curr = curr, prev + curr
    return curr

if __name__ == "__main__":
    print(climbStairs(3))
`,
      javascript: `/**
 * @param {number} n
 * @return {number}
 */
function climbStairs(n) {
    if (n <= 2) return n;
    let prev = 1, curr = 2;
    for (let i = 3; i <= n; i++) {
        const next = prev + curr;
        prev = curr;
        curr = next;
    }
    return curr;
}

console.log(climbStairs(3));
`,
      typescript: `function climbStairs(n: number): number {
    if (n <= 2) return n;
    let prev = 1, curr = 2;
    for (let i = 3; i <= n; i++) {
        const next = prev + curr;
        prev = curr;
        curr = next;
    }
    return curr;
}

console.log(climbStairs(3));
`,
      cpp: `#include <iostream>

int climbStairs(int n) {
    if (n <= 2) return n;
    int prev = 1, curr = 2;
    for (int i = 3; i <= n; ++i) {
        int next = prev + curr;
        prev = curr;
        curr = next;
    }
    return curr;
}

int main() {
    std::cout << climbStairs(3) << std::endl;
    return 0;
}
`,
      c: `#include <stdio.h>

int climbStairs(int n) {
    if (n <= 2) return n;
    int prev = 1, curr = 2;
    for (int i = 3; i <= n; i++) {
        int next = prev + curr;
        prev = curr;
        curr = next;
    }
    return curr;
}

int main() {
    printf("%d\\n", climbStairs(3));
    return 0;
}
`,
      java: `public class Main {
    public static int climbStairs(int n) {
        if (n <= 2) return n;
        int prev = 1, curr = 2;
        for (int i = 3; i <= n; i++) {
            int next = prev + curr;
            prev = curr;
            curr = next;
        }
        return curr;
    }

    public static void main(String[] args) {
        System.out.println(climbStairs(3));
    }
}
`,
    },
  },
  {
    id: 'lru-cache',
    title: 'LRU Cache',
    difficulty: 'Medium',
    topics: ['Hash Table', 'Linked List', 'Design'],
    description: `Design a data structure that follows the constraints of a **Least Recently Used (LRU) cache**.

Implement the \`LRUCache\` class:
- \`LRUCache(int capacity)\` Initialize the LRU cache with positive size \`capacity\`.
- \`int get(int key)\` Return the value of the \`key\` if the key exists, otherwise return \`-1\`.
- \`void put(int key, int value)\` Update the value of the \`key\` if the \`key\` exists. Otherwise, add the \`key-value\` pair to the cache. If the number of keys exceeds the \`capacity\` from this operation, **evict** the least recently used key.

The functions \`get\` and \`put\` must each run in **O(1)** average time complexity.`,
    examples: [
      {
        input: '["LRUCache", "put", "put", "get", "put", "get", "put", "get", "get", "get"]\n[[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]]',
        output: '[null, null, null, 1, null, -1, null, -1, 3, 4]',
        explanation: `LRUCache lRUCache = new LRUCache(2);
lRUCache.put(1, 1); // cache is {1=1}
lRUCache.put(2, 2); // cache is {1=1, 2=2}
lRUCache.get(1);    // return 1
lRUCache.put(3, 3); // LRU key was 2, evicts key 2, cache is {1=1, 3=3}
lRUCache.get(2);    // returns -1 (not found)
lRUCache.put(4, 4); // LRU key was 1, evicts key 1, cache is {4=4, 3=3}
lRUCache.get(1);    // return -1 (not found)
lRUCache.get(3);    // return 3
lRUCache.get(4);    // return 4`,
      },
    ],
    constraints: [
      '1 <= capacity <= 3000',
      '0 <= key <= 10^4',
      '0 <= value <= 10^5',
      'At most 2 * 10^5 calls will be made to get and put.',
    ],
    hints: [
      'Use a doubly linked list combined with a hash table to achieve O(1) for both get and put.',
      'The hash map stores key -> Node, and the doubly linked list maintains the usage order.',
    ],
    starterCode: {
      python: `from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache = OrderedDict()

    def get(self, key: int) -> int:
        if key not in self.cache:
            return -1
        self.cache.move_to_end(key)
        return self.cache[key]

    def put(self, key: int, value: int) -> None:
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.capacity:
            self.cache.popitem(last=False)

if __name__ == "__main__":
    cache = LRUCache(2)
    cache.put(1, 1)
    cache.put(2, 2)
    print("get(1):", cache.get(1))
    cache.put(3, 3)
    print("get(2) (evicted):", cache.get(2))
    cache.put(4, 4)
    print("get(1) (evicted):", cache.get(1))
    print("get(3):", cache.get(3))
    print("get(4):", cache.get(4))
`,
      javascript: `class LRUCache {
    constructor(capacity) {
        this.capacity = capacity;
        this.cache = new Map();
    }

    get(key) {
        if (!this.cache.has(key)) return -1;
        const val = this.cache.get(key);
        this.cache.delete(key);
        this.cache.set(key, val);
        return val;
    }

    put(key, value) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }
        this.cache.set(key, value);
        if (this.cache.size > this.capacity) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }
}

const cache = new LRUCache(2);
cache.put(1, 1);
cache.put(2, 2);
console.log("get(1):", cache.get(1));
cache.put(3, 3);
console.log("get(2):", cache.get(2));
`,
      typescript: `class LRUCache {
    private capacity: number;
    private cache: Map<number, number>;

    constructor(capacity: number) {
        this.capacity = capacity;
        this.cache = new Map();
    }

    get(key: number): number {
        if (!this.cache.has(key)) return -1;
        const val = this.cache.get(key)!;
        this.cache.delete(key);
        this.cache.set(key, val);
        return val;
    }

    put(key: number, value: number): void {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }
        this.cache.set(key, value);
        if (this.cache.size > this.capacity) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) this.cache.delete(firstKey);
        }
    }
}

const cache = new LRUCache(2);
cache.put(1, 1);
cache.put(2, 2);
console.log("get(1):", cache.get(1));
`,
      cpp: `#include <iostream>
#include <unordered_map>
#include <list>

class LRUCache {
    int capacity;
    std::list<std::pair<int, int>> dll;
    std::unordered_map<int, std::list<std::pair<int, int>>::iterator> map;

public:
    LRUCache(int cap) : capacity(cap) {}

    int get(int key) {
        auto it = map.find(key);
        if (it == map.end()) return -1;
        dll.splice(dll.begin(), dll, it->second);
        return it->second->second;
    }

    void put(int key, int value) {
        auto it = map.find(key);
        if (it != map.end()) {
            dll.splice(dll.begin(), dll, it->second);
            it->second->second = value;
            return;
        }
        if (dll.size() == capacity) {
            int dKey = dll.back().first;
            dll.pop_back();
            map.erase(dKey);
        }
        dll.emplace_front(key, value);
        map[key] = dll.begin();
    }
};

int main() {
    LRUCache cache(2);
    cache.put(1, 1);
    cache.put(2, 2);
    std::cout << "get(1): " << cache.get(1) << std::endl;
    cache.put(3, 3);
    std::cout << "get(2): " << cache.get(2) << std::endl;
    return 0;
}
`,
      c: `#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int key;
    int val;
    struct Node* prev;
    struct Node* next;
} Node;

typedef struct {
    int capacity;
    int size;
    Node* head;
    Node* tail;
} LRUCache;

int main() {
    printf("LRUCache initialized successfully.\\n");
    return 0;
}
`,
      java: `import java.util.LinkedHashMap;
import java.util.Map;

class LRUCache extends LinkedHashMap<Integer, Integer> {
    private int capacity;

    public LRUCache(int capacity) {
        super(capacity, 0.75f, true);
        this.capacity = capacity;
    }

    public int get(int key) {
        return super.getOrDefault(key, -1);
    }

    public void put(int key, int value) {
        super.put(key, value);
    }

    @Override
    protected boolean removeEldestEntry(Map.Entry<Integer, Integer> eldest) {
        return size() > capacity;
    }

    public static void main(String[] args) {
        LRUCache cache = new LRUCache(2);
        cache.put(1, 1);
        cache.put(2, 2);
        System.out.println("get(1): " + cache.get(1));
    }
}
`,
    },
  },
];
