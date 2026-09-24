PROBLEMS = [
    {
        'title': 'Two Sum',
        'slug': 'two-sum',
        'description': 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have **exactly one solution**, and you may not use the same element twice.\n\nYou can return the answer in any order.',
        'difficulty': 'easy',
        'expected_time_complexity': 'O(N)',
        'expected_space_complexity': 'O(N)',
        'topics': ['arrays', 'hashing'],
        'pattern_tags': ['Hash Map'],
        'hints': [
            'Try using a hash map to store elements you have already seen.',
            'As you iterate, check if target - current_number exists in the hash map.'
        ],
        'examples': [
            {'input': 'nums = [2,7,11,15], target = 9', 'output': '[0, 1]', 'explanation': 'Because nums[0] + nums[1] == 9, we return [0, 1].'},
            {'input': 'nums = [3,2,4], target = 6', 'output': '[1, 2]', 'explanation': 'Because nums[1] + nums[2] == 6, we return [1, 2].'},
            {'input': 'nums = [3,3], target = 6', 'output': '[0, 1]', 'explanation': ''}
        ],
        'constraints': ['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9', '-10^9 <= target <= 10^9'],
        'starter_code': {
            'python': '''def twoSum(nums: list[int], target: int) -> list[int]:
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
'''
        },
        'test_cases': [
            {'input_data': '[2,7,11,15]\n9', 'expected_output': '[0, 1]', 'is_hidden': False},
            {'input_data': '[3,2,4]\n6', 'expected_output': '[1, 2]', 'is_hidden': False},
            {'input_data': '[3,3]\n6', 'expected_output': '[0, 1]', 'is_hidden': True},
            {'input_data': '[-1,-2,-3,-4,-5]\n-8', 'expected_output': '[2, 4]', 'is_hidden': True},
        ]
    },
    {
        'title': 'Reverse String',
        'slug': 'reverse-string',
        'description': 'Write a function that reverses a string. The input string is given as an array of characters `s`.\n\nYou must do this by modifying the input array **in-place** with `O(1)` extra memory.',
        'difficulty': 'easy',
        'expected_time_complexity': 'O(N)',
        'expected_space_complexity': 'O(1)',
        'topics': ['strings', 'two-pointers'],
        'pattern_tags': ['Two Pointers'],
        'hints': [
            'Use two pointers starting at opposite ends of the array.',
            'Swap characters and move pointers towards the center.'
        ],
        'examples': [
            {'input': 's = ["h","e","l","l","o"]', 'output': '["o","l","l","e","h"]', 'explanation': ''},
            {'input': 's = ["H","a","n","n","a","h"]', 'output': '["h","a","n","n","a","H"]', 'explanation': ''}
        ],
        'constraints': ['1 <= s.length <= 10^5', 's[i] is a printable ASCII character.'],
        'starter_code': {
            'python': '''def reverseString(s: list[str]) -> None:
    left, right = 0, len(s) - 1
    while left < right:
        s[left], s[right] = s[right], s[left]
        left += 1
        right -= 1

if __name__ == "__main__":
    chars = ["h", "e", "l", "l", "o"]
    reverseString(chars)
    print(chars)
'''
        },
        'test_cases': [
            {'input_data': '["h","e","l","l","o"]', 'expected_output': "['o', 'l', 'l', 'e', 'h']", 'is_hidden': False},
            {'input_data': '["H","a","n","n","a","h"]', 'expected_output': "['h', 'a', 'n', 'n', 'a', 'H']", 'is_hidden': False},
        ]
    },
    {
        'title': 'Valid Parentheses',
        'slug': 'valid-parentheses',
        'description': "Given a string `s` containing just the characters `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.",
        'difficulty': 'easy',
        'expected_time_complexity': 'O(N)',
        'expected_space_complexity': 'O(N)',
        'topics': ['stack', 'strings'],
        'pattern_tags': ['Stack'],
        'hints': [
            'Push open brackets onto a stack.',
            'When you see a closing bracket, check if it matches the bracket on top of the stack.'
        ],
        'examples': [
            {'input': 's = "()"', 'output': 'true', 'explanation': ''},
            {'input': 's = "()[]{}"', 'output': 'true', 'explanation': ''},
            {'input': 's = "(]"', 'output': 'false', 'explanation': ''}
        ],
        'constraints': ['1 <= s.length <= 10^4', "s consists of parentheses only '()[]{}'."],
        'starter_code': {
            'python': '''def isValid(s: str) -> bool:
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
'''
        },
        'test_cases': [
            {'input_data': '()[]{}', 'expected_output': 'True', 'is_hidden': False},
            {'input_data': '(]', 'expected_output': 'False', 'is_hidden': False},
            {'input_data': '([)]', 'expected_output': 'False', 'is_hidden': True},
            {'input_data': '{[]}', 'expected_output': 'True', 'is_hidden': True},
        ]
    },
    {
        'title': 'Best Time to Buy and Sell Stock',
        'slug': 'best-time-to-buy-and-sell-stock',
        'description': 'You are given an array `prices` where `prices[i]` is the price of a given stock on the `ith` day.\n\nYou want to maximize your profit by choosing a **single day** to buy one stock and choosing a **different day in the future** to sell that stock.\n\nReturn the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return `0`.',
        'difficulty': 'easy',
        'expected_time_complexity': 'O(N)',
        'expected_space_complexity': 'O(1)',
        'topics': ['arrays', 'greedy'],
        'pattern_tags': ['Two Pointers'],
        'hints': ['Keep track of the minimum price seen so far and update max profit.'],
        'examples': [
            {'input': 'prices = [7,1,5,3,6,4]', 'output': '5', 'explanation': 'Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5.'},
            {'input': 'prices = [7,6,4,3,1]', 'output': '0', 'explanation': 'In this case, no transactions are done and the max profit = 0.'}
        ],
        'constraints': ['1 <= prices.length <= 10^5', '0 <= prices[i] <= 10^4'],
        'starter_code': {
            'python': '''def maxProfit(prices: list[int]) -> int:
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
'''
        },
        'test_cases': [
            {'input_data': '[7,1,5,3,6,4]', 'expected_output': '5', 'is_hidden': False},
            {'input_data': '[7,6,4,3,1]', 'expected_output': '0', 'is_hidden': False},
            {'input_data': '[1,2]', 'expected_output': '1', 'is_hidden': True},
        ]
    },
    {
        'title': 'Binary Search',
        'slug': 'binary-search',
        'description': 'Given an array of integers `nums` which is sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists, then return its index. Otherwise, return `-1`.\n\nYou must write an algorithm with `O(log n)` runtime complexity.',
        'difficulty': 'easy',
        'expected_time_complexity': 'O(log N)',
        'expected_space_complexity': 'O(1)',
        'topics': ['binary-search', 'arrays'],
        'pattern_tags': ['Binary Search'],
        'hints': ['Compare the middle element with the target, then narrow search to left or right half.'],
        'examples': [
            {'input': 'nums = [-1,0,3,5,9,12], target = 9', 'output': '4', 'explanation': '9 exists in nums and its index is 4'},
            {'input': 'nums = [-1,0,3,5,9,12], target = 2', 'output': '-1', 'explanation': '2 does not exist in nums so return -1'}
        ],
        'constraints': ['1 <= nums.length <= 10^4', '-10^4 < nums[i], target < 10^4', 'All elements in nums are unique.'],
        'starter_code': {
            'python': '''def search(nums: list[int], target: int) -> int:
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
'''
        },
        'test_cases': [
            {'input_data': '[-1,0,3,5,9,12]\n9', 'expected_output': '4', 'is_hidden': False},
            {'input_data': '[-1,0,3,5,9,12]\n2', 'expected_output': '-1', 'is_hidden': False},
            {'input_data': '[5]\n5', 'expected_output': '0', 'is_hidden': True},
        ]
    },
    {
        'title': 'Maximum Subarray',
        'slug': 'maximum-subarray',
        'description': "Given an integer array `nums`, find the subarray with the largest sum, and return *its sum*.\n\nThis is known as Kadane's Algorithm.",
        'difficulty': 'medium',
        'expected_time_complexity': 'O(N)',
        'expected_space_complexity': 'O(1)',
        'topics': ['arrays', 'dynamic-programming'],
        'pattern_tags': ["Kadane's Algorithm"],
        'hints': ['Keep track of current subarray sum. If it drops below 0, reset it.'],
        'examples': [
            {'input': 'nums = [-2,1,-3,4,-1,2,1,-5,4]', 'output': '6', 'explanation': 'The subarray [4,-1,2,1] has the largest sum 6.'},
            {'input': 'nums = [1]', 'output': '1', 'explanation': ''},
            {'input': 'nums = [5,4,-1,7,8]', 'output': '23', 'explanation': ''}
        ],
        'constraints': ['1 <= nums.length <= 10^5', '-10^4 <= nums[i] <= 10^4'],
        'starter_code': {
            'python': '''def maxSubArray(nums: list[int]) -> int:
    current_sum = nums[0]
    max_sum = nums[0]
    for n in nums[1:]:
        current_sum = max(n, current_sum + n)
        max_sum = max(max_sum, current_sum)
    return max_sum

if __name__ == "__main__":
    print(maxSubArray([-2, 1, -3, 4, -1, 2, 1, -5, 4]))
'''
        },
        'test_cases': [
            {'input_data': '[-2,1,-3,4,-1,2,1,-5,4]', 'expected_output': '6', 'is_hidden': False},
            {'input_data': '[1]', 'expected_output': '1', 'is_hidden': False},
            {'input_data': '[5,4,-1,7,8]', 'expected_output': '23', 'is_hidden': True},
        ]
    },
    {
        'title': 'Container With Most Water',
        'slug': 'container-with-most-water',
        'description': 'You are given an integer array `height` of length `n`. There are `n` vertical lines drawn such that the two endpoints of the `ith` line are `(i, 0)` and `(i, height[i])`.\n\nFind two lines that together with the x-axis form a container, such that the container contains the most water.\n\nReturn *the maximum amount of water a container can store*.',
        'difficulty': 'medium',
        'expected_time_complexity': 'O(N)',
        'expected_space_complexity': 'O(1)',
        'topics': ['two-pointers', 'arrays', 'greedy'],
        'pattern_tags': ['Two Pointers'],
        'hints': ['Use two pointers at left and right boundaries, and always move the pointer with the smaller height.'],
        'examples': [
            {'input': 'height = [1,8,6,2,5,4,8,3,7]', 'output': '49', 'explanation': 'The above vertical lines are represented by array [1,8,6,2,5,4,8,3,7]. In this case, the max area of water the container can contain is 49.'},
            {'input': 'height = [1,1]', 'output': '1', 'explanation': ''}
        ],
        'constraints': ['n == height.length', '2 <= n <= 10^5', '0 <= height[i] <= 10^4'],
        'starter_code': {
            'python': '''def maxArea(height: list[int]) -> int:
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
'''
        },
        'test_cases': [
            {'input_data': '[1,8,6,2,5,4,8,3,7]', 'expected_output': '49', 'is_hidden': False},
            {'input_data': '[1,1]', 'expected_output': '1', 'is_hidden': False},
            {'input_data': '[4,3,2,1,4]', 'expected_output': '16', 'is_hidden': True},
        ]
    },
    {
        'title': 'Longest Substring Without Repeating Characters',
        'slug': 'longest-substring-without-repeating-characters',
        'description': 'Given a string `s`, find the length of the **longest substring** without repeating characters.',
        'difficulty': 'medium',
        'expected_time_complexity': 'O(N)',
        'expected_space_complexity': 'O(min(N, M))',
        'topics': ['sliding-window', 'strings', 'hashing'],
        'pattern_tags': ['Sliding Window'],
        'hints': ['Use a sliding window with a set or hash map to keep track of the characters in the current window.'],
        'examples': [
            {'input': 's = "abcabcbb"', 'output': '3', 'explanation': 'The answer is "abc", with the length of 3.'},
            {'input': 's = "bbbbb"', 'output': '1', 'explanation': 'The answer is "b", with the length of 1.'},
            {'input': 's = "pwwkew"', 'output': '3', 'explanation': 'The answer is "wke", with the length of 3.'}
        ],
        'constraints': ['0 <= s.length <= 5 * 10^4', 's consists of English letters, digits, symbols and spaces.'],
        'starter_code': {
            'python': '''def lengthOfLongestSubstring(s: str) -> int:
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
'''
        },
        'test_cases': [
            {'input_data': 'abcabcbb', 'expected_output': '3', 'is_hidden': False},
            {'input_data': 'bbbbb', 'expected_output': '1', 'is_hidden': False},
            {'input_data': 'pwwkew', 'expected_output': '3', 'is_hidden': True},
            {'input_data': '', 'expected_output': '0', 'is_hidden': True},
        ]
    },
    {
        'title': 'Climbing Stairs',
        'slug': 'climbing-stairs',
        'description': 'You are climbing a staircase. It takes `n` steps to reach the top.\n\nEach time you can either climb `1` or `2` steps. In how many distinct ways can you climb to the top?',
        'difficulty': 'easy',
        'expected_time_complexity': 'O(N)',
        'expected_space_complexity': 'O(1)',
        'topics': ['dynamic-programming', 'math'],
        'pattern_tags': ['Fibonacci Sequence'],
        'hints': ['To reach step n, you must come from step n-1 or n-2. Ways(n) = Ways(n-1) + Ways(n-2).'],
        'examples': [
            {'input': 'n = 2', 'output': '2', 'explanation': '1 step + 1 step, or 2 steps.'},
            {'input': 'n = 3', 'output': '3', 'explanation': '1+1+1, 1+2, 2+1.'}
        ],
        'constraints': ['1 <= n <= 45'],
        'starter_code': {
            'python': '''def climbStairs(n: int) -> int:
    if n <= 2:
        return n
    prev, curr = 1, 2
    for _ in range(3, n + 1):
        prev, curr = curr, prev + curr
    return curr

if __name__ == "__main__":
    print(climbStairs(3))
'''
        },
        'test_cases': [
            {'input_data': '2', 'expected_output': '2', 'is_hidden': False},
            {'input_data': '3', 'expected_output': '3', 'is_hidden': False},
            {'input_data': '5', 'expected_output': '8', 'is_hidden': True},
        ]
    },
    {
        'title': 'LRU Cache',
        'slug': 'lru-cache',
        'description': 'Design a data structure that follows the constraints of a **Least Recently Used (LRU) cache**.\n\nImplement the `LRUCache` class:\n- `LRUCache(int capacity)` Initialize the LRU cache with positive size `capacity`.\n- `int get(int key)` Return the value of the `key` if the key exists, otherwise return `-1`.\n- `void put(int key, int value)` Update or add key-value pair. If exceeding capacity, evict the least recently used key.\n\nFunctions `get` and `put` must each run in **O(1)** average time complexity.',
        'difficulty': 'medium',
        'expected_time_complexity': 'O(1)',
        'expected_space_complexity': 'O(capacity)',
        'topics': ['design', 'hashing', 'linked-list'],
        'pattern_tags': ['Doubly Linked List'],
        'hints': ['Combine a hash table with a doubly linked list to achieve O(1) for both operations.'],
        'examples': [
            {
                'input': 'capacity = 2, put(1, 1), put(2, 2), get(1), put(3, 3), get(2)',
                'output': '1, -1',
                'explanation': 'Key 2 is evicted when key 3 is added because key 1 was recently accessed.'
            }
        ],
        'constraints': ['1 <= capacity <= 3000', '0 <= key <= 10^4', '0 <= value <= 10^5'],
        'starter_code': {
            'python': '''from collections import OrderedDict

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
    print("get(2):", cache.get(2))
'''
        },
        'test_cases': [
            {'input_data': 'test', 'expected_output': 'get(1): 1\nget(2): -1', 'is_hidden': False},
        ]
    }
]
