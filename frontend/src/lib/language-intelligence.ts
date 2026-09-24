/**
 * Language Intelligence — keyword databases, symbol extraction, typo detection, and signature help
 * for Code Mentor's Monaco-based editor.
 *
 * This module provides offline, zero-dependency intelligence for 8 major languages.
 * No AI/network calls — all data is static and runs entirely in the browser.
 */

// ---------------------------------------------------------------------------
// 1. Keyword & Builtin Databases
// ---------------------------------------------------------------------------

export interface BuiltinEntry {
  name: string;
  kind: 'keyword' | 'function' | 'type' | 'module' | 'constant' | 'method' | 'class' | 'snippet' | 'variable';
  detail?: string;
  documentation?: string;
  insertText?: string; // if different from name (e.g. snippets)
}

const PYTHON_KEYWORDS: BuiltinEntry[] = [
  // Keywords
  ...'False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield'
    .split(' ')
    .map((k) => ({ name: k, kind: 'keyword' as const, detail: 'keyword' })),
  // Built-in functions
  { name: 'print', kind: 'function', detail: 'print(*objects, sep, end, file, flush)', documentation: 'Print objects to the text stream file, separated by sep and followed by end.' },
  { name: 'input', kind: 'function', detail: 'input(prompt?) → str', documentation: 'Read a line of input from stdin.' },
  { name: 'len', kind: 'function', detail: 'len(s) → int', documentation: 'Return the number of items in a container.' },
  { name: 'range', kind: 'function', detail: 'range(stop) | range(start, stop, step)', documentation: 'Return an immutable sequence of numbers.' },
  { name: 'int', kind: 'type', detail: 'int(x=0) → int', documentation: 'Convert a number or string to an integer.' },
  { name: 'float', kind: 'type', detail: 'float(x=0) → float', documentation: 'Convert a string or number to a floating point number.' },
  { name: 'str', kind: 'type', detail: 'str(object) → str', documentation: 'Return a string version of object.' },
  { name: 'bool', kind: 'type', detail: 'bool(x) → bool', documentation: 'Return a Boolean value.' },
  { name: 'list', kind: 'type', detail: 'list(iterable?) → list', documentation: 'Create a new list.' },
  { name: 'dict', kind: 'type', detail: 'dict(**kwargs) → dict', documentation: 'Create a new dictionary.' },
  { name: 'set', kind: 'type', detail: 'set(iterable?) → set', documentation: 'Create a new set.' },
  { name: 'tuple', kind: 'type', detail: 'tuple(iterable?) → tuple', documentation: 'Create a new tuple.' },
  { name: 'type', kind: 'function', detail: 'type(object) → type', documentation: 'Return the type of an object.' },
  { name: 'isinstance', kind: 'function', detail: 'isinstance(obj, classinfo) → bool', documentation: 'Return True if the object is an instance of the classinfo.' },
  { name: 'issubclass', kind: 'function', detail: 'issubclass(cls, classinfo) → bool', documentation: 'Return True if cls is a subclass of classinfo.' },
  { name: 'abs', kind: 'function', detail: 'abs(x) → number', documentation: 'Return the absolute value of a number.' },
  { name: 'max', kind: 'function', detail: 'max(iterable) | max(a, b, ...)', documentation: 'Return the largest item.' },
  { name: 'min', kind: 'function', detail: 'min(iterable) | min(a, b, ...)', documentation: 'Return the smallest item.' },
  { name: 'sum', kind: 'function', detail: 'sum(iterable, start=0)', documentation: 'Sum the items of an iterable.' },
  { name: 'sorted', kind: 'function', detail: 'sorted(iterable, key?, reverse?) → list', documentation: 'Return a new sorted list from the items in iterable.' },
  { name: 'reversed', kind: 'function', detail: 'reversed(seq) → iterator', documentation: 'Return a reverse iterator.' },
  { name: 'enumerate', kind: 'function', detail: 'enumerate(iterable, start=0)', documentation: 'Return an enumerate object yielding (index, value) pairs.' },
  { name: 'zip', kind: 'function', detail: 'zip(*iterables) → iterator', documentation: 'Aggregate elements from each iterable.' },
  { name: 'map', kind: 'function', detail: 'map(func, *iterables) → iterator', documentation: 'Apply function to every item of iterables.' },
  { name: 'filter', kind: 'function', detail: 'filter(func, iterable) → iterator', documentation: 'Construct an iterator from those elements for which function is true.' },
  { name: 'any', kind: 'function', detail: 'any(iterable) → bool', documentation: 'Return True if any element is truthy.' },
  { name: 'all', kind: 'function', detail: 'all(iterable) → bool', documentation: 'Return True if all elements are truthy.' },
  { name: 'open', kind: 'function', detail: 'open(file, mode="r") → file object', documentation: 'Open a file and return a file object.' },
  { name: 'round', kind: 'function', detail: 'round(number, ndigits?) → number', documentation: 'Round a number to a given precision.' },
  { name: 'pow', kind: 'function', detail: 'pow(base, exp, mod?) → number', documentation: 'Return base to the power exp.' },
  { name: 'divmod', kind: 'function', detail: 'divmod(a, b) → (quotient, remainder)', documentation: 'Return quotient and remainder.' },
  { name: 'hash', kind: 'function', detail: 'hash(object) → int', documentation: 'Return the hash value of the object.' },
  { name: 'id', kind: 'function', detail: 'id(object) → int', documentation: 'Return the identity of an object.' },
  { name: 'hex', kind: 'function', detail: 'hex(x) → str', documentation: 'Convert an integer to a hexadecimal string.' },
  { name: 'oct', kind: 'function', detail: 'oct(x) → str', documentation: 'Convert an integer to an octal string.' },
  { name: 'bin', kind: 'function', detail: 'bin(x) → str', documentation: 'Convert an integer to a binary string.' },
  { name: 'chr', kind: 'function', detail: 'chr(i) → str', documentation: 'Return a string of one character from Unicode code point.' },
  { name: 'ord', kind: 'function', detail: 'ord(c) → int', documentation: 'Return the Unicode code point for a one-character string.' },
  { name: 'repr', kind: 'function', detail: 'repr(object) → str', documentation: 'Return a printable representation of the object.' },
  { name: 'format', kind: 'function', detail: 'format(value, format_spec?) → str', documentation: 'Convert a value to a formatted representation.' },
  { name: 'iter', kind: 'function', detail: 'iter(object) → iterator', documentation: 'Return an iterator object.' },
  { name: 'next', kind: 'function', detail: 'next(iterator, default?) → item', documentation: 'Retrieve the next item from the iterator.' },
  { name: 'hasattr', kind: 'function', detail: 'hasattr(obj, name) → bool', documentation: 'Return True if the object has the named attribute.' },
  { name: 'getattr', kind: 'function', detail: 'getattr(obj, name, default?) → value', documentation: 'Return the value of the named attribute.' },
  { name: 'setattr', kind: 'function', detail: 'setattr(obj, name, value)', documentation: 'Set the named attribute on the given object.' },
  { name: 'delattr', kind: 'function', detail: 'delattr(obj, name)', documentation: 'Delete the named attribute.' },
  { name: 'callable', kind: 'function', detail: 'callable(object) → bool', documentation: 'Return True if the object appears callable.' },
  { name: 'vars', kind: 'function', detail: 'vars(object?) → dict', documentation: 'Return the __dict__ attribute of the object.' },
  { name: 'dir', kind: 'function', detail: 'dir(object?) → list', documentation: 'Return a list of names in scope or attributes of the object.' },
  { name: 'globals', kind: 'function', detail: 'globals() → dict', documentation: 'Return a dictionary of the current global symbol table.' },
  { name: 'locals', kind: 'function', detail: 'locals() → dict', documentation: 'Return a dictionary of the current local symbol table.' },
  { name: 'eval', kind: 'function', detail: 'eval(expression) → value', documentation: 'Evaluate a Python expression.' },
  { name: 'exec', kind: 'function', detail: 'exec(code)', documentation: 'Execute Python code dynamically.' },
  { name: 'compile', kind: 'function', detail: 'compile(source, filename, mode)', documentation: 'Compile source into a code object.' },
  { name: 'super', kind: 'function', detail: 'super() → proxy object', documentation: 'Return a proxy object that delegates method calls to the parent class.' },
  { name: 'property', kind: 'function', detail: 'property(fget?, fset?, fdel?, doc?)', documentation: 'Return a property attribute.' },
  { name: 'staticmethod', kind: 'function', detail: '@staticmethod', documentation: 'Transform a method into a static method.' },
  { name: 'classmethod', kind: 'function', detail: '@classmethod', documentation: 'Transform a method into a class method.' },
  { name: 'object', kind: 'type', detail: 'object()', documentation: 'Base class for all classes.' },
  { name: 'Exception', kind: 'class', detail: 'Exception(*args)', documentation: 'Common base class for all non-exit exceptions.' },
  { name: 'ValueError', kind: 'class', detail: 'ValueError(*args)', documentation: 'Raised when an operation receives an argument with the right type but inappropriate value.' },
  { name: 'TypeError', kind: 'class', detail: 'TypeError(*args)', documentation: 'Raised when an operation is applied to an object of inappropriate type.' },
  { name: 'IndexError', kind: 'class', detail: 'IndexError(*args)', documentation: 'Raised when a sequence index is out of range.' },
  { name: 'KeyError', kind: 'class', detail: 'KeyError(*args)', documentation: 'Raised when a mapping key is not found.' },
  { name: 'AttributeError', kind: 'class', detail: 'AttributeError(*args)', documentation: 'Raised when an attribute reference or assignment fails.' },
  { name: 'NameError', kind: 'class', detail: 'NameError(*args)', documentation: 'Raised when a local or global name is not found.' },
  { name: 'StopIteration', kind: 'class', detail: 'StopIteration(*args)', documentation: 'Raised by next() to signal exhaustion.' },
  { name: 'FileNotFoundError', kind: 'class', detail: 'FileNotFoundError(*args)', documentation: 'Raised when a file or directory is requested but does not exist.' },
  { name: 'ZeroDivisionError', kind: 'class', detail: 'ZeroDivisionError(*args)', documentation: 'Raised when dividing by zero.' },
  // Common modules
  { name: 'math', kind: 'module', detail: 'import math', documentation: 'Mathematical functions.' },
  { name: 'os', kind: 'module', detail: 'import os', documentation: 'Operating system interface.' },
  { name: 'sys', kind: 'module', detail: 'import sys', documentation: 'System-specific parameters and functions.' },
  { name: 'json', kind: 'module', detail: 'import json', documentation: 'JSON encoder and decoder.' },
  { name: 'random', kind: 'module', detail: 'import random', documentation: 'Generate pseudo-random numbers.' },
  { name: 'collections', kind: 'module', detail: 'import collections', documentation: 'Container datatypes.' },
  { name: 'itertools', kind: 'module', detail: 'import itertools', documentation: 'Functions creating iterators for efficient looping.' },
  { name: 'functools', kind: 'module', detail: 'import functools', documentation: 'Higher-order functions and operations on callable objects.' },
  { name: 'datetime', kind: 'module', detail: 'import datetime', documentation: 'Date and time types.' },
  { name: 're', kind: 'module', detail: 'import re', documentation: 'Regular expression operations.' },
  // Snippets
  { name: 'def', kind: 'snippet', detail: 'Function definition', insertText: 'def ${1:function_name}(${2:params}):\n    ${3:pass}', documentation: 'Define a new function.' },
  { name: 'class', kind: 'snippet', detail: 'Class definition', insertText: 'class ${1:ClassName}:\n    def __init__(self${2:, params}):\n        ${3:pass}', documentation: 'Define a new class.' },
  { name: 'if', kind: 'snippet', detail: 'If statement', insertText: 'if ${1:condition}:\n    ${2:pass}', documentation: 'Conditional statement.' },
  { name: 'for', kind: 'snippet', detail: 'For loop', insertText: 'for ${1:item} in ${2:iterable}:\n    ${3:pass}', documentation: 'For loop over an iterable.' },
  { name: 'while', kind: 'snippet', detail: 'While loop', insertText: 'while ${1:condition}:\n    ${2:pass}', documentation: 'While loop.' },
  { name: 'try', kind: 'snippet', detail: 'Try/except', insertText: 'try:\n    ${1:pass}\nexcept ${2:Exception} as e:\n    ${3:print(e)}', documentation: 'Exception handling.' },
  { name: 'with', kind: 'snippet', detail: 'With statement', insertText: 'with ${1:expression} as ${2:var}:\n    ${3:pass}', documentation: 'Context manager.' },
  { name: 'lambda', kind: 'snippet', detail: 'Lambda expression', insertText: 'lambda ${1:x}: ${2:x}', documentation: 'Anonymous function.' },
  { name: 'list comprehension', kind: 'snippet', detail: '[expr for x in iter]', insertText: '[${1:x} for ${2:x} in ${3:iterable}]', documentation: 'List comprehension.' },
  { name: 'dict comprehension', kind: 'snippet', detail: '{k: v for k, v in iter}', insertText: '{${1:k}: ${2:v} for ${3:k}, ${4:v} in ${5:iterable}.items()}', documentation: 'Dictionary comprehension.' },
  { name: 'main guard', kind: 'snippet', detail: 'if __name__ == "__main__"', insertText: 'if __name__ == "__main__":\n    ${1:main()}', documentation: 'Main module guard.' },
];

const JAVASCRIPT_KEYWORDS: BuiltinEntry[] = [
  ...'break case catch class const continue debugger default delete do else export extends finally for function if import in instanceof let new of return static super switch this throw try typeof var void while with yield async await'
    .split(' ')
    .map((k) => ({ name: k, kind: 'keyword' as const, detail: 'keyword' })),
  { name: 'console.log', kind: 'function', detail: 'console.log(...data)', documentation: 'Output a message to the web console.' },
  { name: 'console.error', kind: 'function', detail: 'console.error(...data)', documentation: 'Output an error message to the console.' },
  { name: 'console.warn', kind: 'function', detail: 'console.warn(...data)', documentation: 'Output a warning message to the console.' },
  { name: 'console.table', kind: 'function', detail: 'console.table(data)', documentation: 'Display tabular data as a table.' },
  { name: 'parseInt', kind: 'function', detail: 'parseInt(string, radix?) → number', documentation: 'Parse a string and return an integer.' },
  { name: 'parseFloat', kind: 'function', detail: 'parseFloat(string) → number', documentation: 'Parse a string and return a floating-point number.' },
  { name: 'isNaN', kind: 'function', detail: 'isNaN(value) → boolean', documentation: 'Determine whether a value is NaN.' },
  { name: 'isFinite', kind: 'function', detail: 'isFinite(value) → boolean', documentation: 'Determine whether a value is a finite number.' },
  { name: 'JSON.stringify', kind: 'function', detail: 'JSON.stringify(value, replacer?, space?)', documentation: 'Convert a JavaScript object to a JSON string.' },
  { name: 'JSON.parse', kind: 'function', detail: 'JSON.parse(text, reviver?)', documentation: 'Parse a JSON string.' },
  { name: 'Math.max', kind: 'function', detail: 'Math.max(...values) → number', documentation: 'Returns the largest of zero or more numbers.' },
  { name: 'Math.min', kind: 'function', detail: 'Math.min(...values) → number', documentation: 'Returns the smallest of zero or more numbers.' },
  { name: 'Math.floor', kind: 'function', detail: 'Math.floor(x) → number', documentation: 'Returns the largest integer less than or equal to x.' },
  { name: 'Math.ceil', kind: 'function', detail: 'Math.ceil(x) → number', documentation: 'Returns the smallest integer greater than or equal to x.' },
  { name: 'Math.round', kind: 'function', detail: 'Math.round(x) → number', documentation: 'Returns the value of x rounded to the nearest integer.' },
  { name: 'Math.abs', kind: 'function', detail: 'Math.abs(x) → number', documentation: 'Returns the absolute value of x.' },
  { name: 'Math.random', kind: 'function', detail: 'Math.random() → number', documentation: 'Returns a pseudo-random number between 0 and 1.' },
  { name: 'Math.sqrt', kind: 'function', detail: 'Math.sqrt(x) → number', documentation: 'Returns the square root of x.' },
  { name: 'Math.pow', kind: 'function', detail: 'Math.pow(base, exponent) → number', documentation: 'Returns base raised to the power exponent.' },
  { name: 'Math.PI', kind: 'constant', detail: '3.141592653589793', documentation: 'The ratio of the circumference of a circle to its diameter.' },
  { name: 'Array.isArray', kind: 'function', detail: 'Array.isArray(value) → boolean', documentation: 'Determine if value is an Array.' },
  { name: 'Array.from', kind: 'function', detail: 'Array.from(arrayLike, mapFn?) → Array', documentation: 'Create a new Array from an array-like or iterable object.' },
  { name: 'Object.keys', kind: 'function', detail: 'Object.keys(obj) → string[]', documentation: 'Return an array of own enumerable property names.' },
  { name: 'Object.values', kind: 'function', detail: 'Object.values(obj) → any[]', documentation: 'Return an array of own enumerable property values.' },
  { name: 'Object.entries', kind: 'function', detail: 'Object.entries(obj) → [key, value][]', documentation: 'Return an array of own enumerable [key, value] pairs.' },
  { name: 'Object.assign', kind: 'function', detail: 'Object.assign(target, ...sources)', documentation: 'Copy values of all enumerable own properties from sources to target.' },
  { name: 'Promise', kind: 'class', detail: 'new Promise((resolve, reject) => { ... })', documentation: 'Represents the eventual completion or failure of an async operation.' },
  { name: 'setTimeout', kind: 'function', detail: 'setTimeout(callback, delay?, ...args)', documentation: 'Calls a function after a specified delay.' },
  { name: 'setInterval', kind: 'function', detail: 'setInterval(callback, delay?, ...args)', documentation: 'Repeatedly calls a function at specified intervals.' },
  { name: 'clearTimeout', kind: 'function', detail: 'clearTimeout(timeoutId)', documentation: 'Cancel a timeout previously established by setTimeout.' },
  { name: 'clearInterval', kind: 'function', detail: 'clearInterval(intervalId)', documentation: 'Cancel a timed, repeating action established by setInterval.' },
  { name: 'fetch', kind: 'function', detail: 'fetch(url, options?) → Promise<Response>', documentation: 'Start a request to fetch a resource.' },
  { name: 'require', kind: 'function', detail: 'require(module) → exports', documentation: 'Import a CommonJS module (Node.js).' },
  { name: 'process', kind: 'module', detail: 'process (Node.js global)', documentation: 'Information about and control over the current Node.js process.' },
  { name: 'Buffer', kind: 'class', detail: 'Buffer (Node.js)', documentation: 'Used to handle binary data in Node.js.' },
  // Snippets
  { name: 'function', kind: 'snippet', detail: 'Function declaration', insertText: 'function ${1:name}(${2:params}) {\n  ${3}\n}', documentation: 'Declare a function.' },
  { name: 'arrow function', kind: 'snippet', detail: '(params) => { ... }', insertText: '(${1:params}) => {\n  ${2}\n}', documentation: 'Arrow function expression.' },
  { name: 'for...of', kind: 'snippet', detail: 'for (const x of iterable)', insertText: 'for (const ${1:item} of ${2:iterable}) {\n  ${3}\n}', documentation: 'For...of loop.' },
  { name: 'for...in', kind: 'snippet', detail: 'for (const key in object)', insertText: 'for (const ${1:key} in ${2:object}) {\n  ${3}\n}', documentation: 'For...in loop.' },
  { name: 'try/catch', kind: 'snippet', detail: 'try { } catch (e) { }', insertText: 'try {\n  ${1}\n} catch (${2:error}) {\n  ${3:console.error(error)}\n}', documentation: 'Try/catch block.' },
  { name: 'async function', kind: 'snippet', detail: 'async function name() { ... }', insertText: 'async function ${1:name}(${2:params}) {\n  ${3}\n}', documentation: 'Async function declaration.' },
  { name: 'class', kind: 'snippet', detail: 'Class declaration', insertText: 'class ${1:Name} {\n  constructor(${2:params}) {\n    ${3}\n  }\n}', documentation: 'Class declaration.' },
];

const CPP_KEYWORDS: BuiltinEntry[] = [
  ...'alignas alignof and and_eq asm auto bitand bitor bool break case catch char char8_t char16_t char32_t class co_await co_return co_yield compl concept const consteval constexpr constinit const_cast continue decltype default delete do double dynamic_cast else enum explicit export extern false float for friend goto if inline int long mutable namespace new noexcept not not_eq nullptr operator or or_eq private protected public register reinterpret_cast requires return short signed sizeof static static_assert static_cast struct switch template this thread_local throw true try typedef typeid typename union unsigned using virtual void volatile wchar_t while xor xor_eq'
    .split(' ')
    .map((k) => ({ name: k, kind: 'keyword' as const, detail: 'keyword' })),
  { name: 'std::cout', kind: 'function', detail: 'std::cout << value', documentation: 'Standard output stream.' },
  { name: 'std::cin', kind: 'function', detail: 'std::cin >> variable', documentation: 'Standard input stream.' },
  { name: 'std::endl', kind: 'constant', detail: 'End line and flush', documentation: 'Insert newline and flush the output buffer.' },
  { name: 'std::string', kind: 'type', detail: 'std::string', documentation: 'Standard string class.' },
  { name: 'std::vector', kind: 'type', detail: 'std::vector<T>', documentation: 'Dynamic array container.' },
  { name: 'std::map', kind: 'type', detail: 'std::map<K, V>', documentation: 'Sorted associative container of key-value pairs.' },
  { name: 'std::unordered_map', kind: 'type', detail: 'std::unordered_map<K, V>', documentation: 'Hash-based associative container.' },
  { name: 'std::set', kind: 'type', detail: 'std::set<T>', documentation: 'Sorted unique element container.' },
  { name: 'std::pair', kind: 'type', detail: 'std::pair<T1, T2>', documentation: 'Pair of two heterogeneous objects.' },
  { name: 'std::sort', kind: 'function', detail: 'std::sort(first, last, comp?)', documentation: 'Sort elements in range [first, last).' },
  { name: 'std::reverse', kind: 'function', detail: 'std::reverse(first, last)', documentation: 'Reverse elements in range.' },
  { name: 'std::max', kind: 'function', detail: 'std::max(a, b) → T', documentation: 'Return the greater of a and b.' },
  { name: 'std::min', kind: 'function', detail: 'std::min(a, b) → T', documentation: 'Return the lesser of a and b.' },
  { name: 'std::swap', kind: 'function', detail: 'std::swap(a, b)', documentation: 'Exchange the values of a and b.' },
  { name: 'std::find', kind: 'function', detail: 'std::find(first, last, value)', documentation: 'Find the first occurrence of value in range.' },
  { name: 'std::accumulate', kind: 'function', detail: 'std::accumulate(first, last, init)', documentation: 'Compute sum of elements in range plus init.' },
  { name: 'std::to_string', kind: 'function', detail: 'std::to_string(value) → string', documentation: 'Convert numeric value to string.' },
  { name: 'std::stoi', kind: 'function', detail: 'std::stoi(str) → int', documentation: 'Convert string to integer.' },
  { name: 'std::getline', kind: 'function', detail: 'std::getline(stream, str)', documentation: 'Read a line from stream into str.' },
  { name: 'printf', kind: 'function', detail: 'printf(format, ...)', documentation: 'Print formatted output to stdout (C-style).' },
  { name: 'scanf', kind: 'function', detail: 'scanf(format, ...)', documentation: 'Read formatted input from stdin (C-style).' },
  { name: 'sizeof', kind: 'keyword', detail: 'sizeof(type) → size_t', documentation: 'Return the size of a type in bytes.' },
  { name: '#include', kind: 'keyword', detail: '#include <header>', documentation: 'Include a header file.' },
  // Common includes
  { name: 'iostream', kind: 'module', detail: '#include <iostream>', documentation: 'Standard input/output stream library.' },
  { name: 'vector', kind: 'module', detail: '#include <vector>', documentation: 'Dynamic array container.' },
  { name: 'string', kind: 'module', detail: '#include <string>', documentation: 'String class library.' },
  { name: 'algorithm', kind: 'module', detail: '#include <algorithm>', documentation: 'Standard algorithms library.' },
  { name: 'map', kind: 'module', detail: '#include <map>', documentation: 'Sorted map container.' },
  { name: 'set', kind: 'module', detail: '#include <set>', documentation: 'Sorted set container.' },
  { name: 'queue', kind: 'module', detail: '#include <queue>', documentation: 'Queue and priority_queue containers.' },
  { name: 'stack', kind: 'module', detail: '#include <stack>', documentation: 'Stack container adapter.' },
];

const JAVA_KEYWORDS: BuiltinEntry[] = [
  ...'abstract assert boolean break byte case catch char class continue default do double else enum extends final finally float for if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while'
    .split(' ')
    .map((k) => ({ name: k, kind: 'keyword' as const, detail: 'keyword' })),
  { name: 'System.out.println', kind: 'function', detail: 'System.out.println(x)', documentation: 'Print to stdout with newline.' },
  { name: 'System.out.print', kind: 'function', detail: 'System.out.print(x)', documentation: 'Print to stdout without newline.' },
  { name: 'System.in', kind: 'constant', detail: 'System.in', documentation: 'Standard input stream.' },
  { name: 'Scanner', kind: 'class', detail: 'new Scanner(System.in)', documentation: 'A simple text scanner for reading input.' },
  { name: 'String', kind: 'type', detail: 'String', documentation: 'Represents a sequence of characters.' },
  { name: 'Integer', kind: 'type', detail: 'Integer', documentation: 'Wrapper class for int.' },
  { name: 'Double', kind: 'type', detail: 'Double', documentation: 'Wrapper class for double.' },
  { name: 'Boolean', kind: 'type', detail: 'Boolean', documentation: 'Wrapper class for boolean.' },
  { name: 'ArrayList', kind: 'class', detail: 'ArrayList<E>', documentation: 'Resizable-array implementation of the List interface.' },
  { name: 'HashMap', kind: 'class', detail: 'HashMap<K, V>', documentation: 'Hash-based Map implementation.' },
  { name: 'HashSet', kind: 'class', detail: 'HashSet<E>', documentation: 'Hash-based Set implementation.' },
  { name: 'LinkedList', kind: 'class', detail: 'LinkedList<E>', documentation: 'Doubly-linked list implementation.' },
  { name: 'Arrays', kind: 'class', detail: 'java.util.Arrays', documentation: 'Utility class for array operations.' },
  { name: 'Collections', kind: 'class', detail: 'java.util.Collections', documentation: 'Utility class for collection operations.' },
  { name: 'Math.abs', kind: 'function', detail: 'Math.abs(a) → number', documentation: 'Returns the absolute value.' },
  { name: 'Math.max', kind: 'function', detail: 'Math.max(a, b) → number', documentation: 'Returns the greater of two values.' },
  { name: 'Math.min', kind: 'function', detail: 'Math.min(a, b) → number', documentation: 'Returns the smaller of two values.' },
  { name: 'Math.sqrt', kind: 'function', detail: 'Math.sqrt(a) → double', documentation: 'Returns the square root.' },
  { name: 'Math.pow', kind: 'function', detail: 'Math.pow(a, b) → double', documentation: 'Returns a raised to the power b.' },
  { name: 'Integer.parseInt', kind: 'function', detail: 'Integer.parseInt(s) → int', documentation: 'Parse string as integer.' },
  { name: 'String.valueOf', kind: 'function', detail: 'String.valueOf(x) → String', documentation: 'Return string representation of the argument.' },
];

const C_KEYWORDS: BuiltinEntry[] = [
  ...'auto break case char const continue default do double else enum extern float for goto if inline int long register restrict return short signed sizeof static struct switch typedef union unsigned void volatile while _Bool _Complex _Imaginary'
    .split(' ')
    .map((k) => ({ name: k, kind: 'keyword' as const, detail: 'keyword' })),
  { name: 'printf', kind: 'function', detail: 'printf(format, ...) → int', documentation: 'Print formatted output to stdout.' },
  { name: 'scanf', kind: 'function', detail: 'scanf(format, ...) → int', documentation: 'Read formatted input from stdin.' },
  { name: 'fprintf', kind: 'function', detail: 'fprintf(stream, format, ...)', documentation: 'Print formatted output to stream.' },
  { name: 'sprintf', kind: 'function', detail: 'sprintf(str, format, ...)', documentation: 'Print formatted output to string.' },
  { name: 'malloc', kind: 'function', detail: 'malloc(size) → void*', documentation: 'Allocate memory block.' },
  { name: 'calloc', kind: 'function', detail: 'calloc(num, size) → void*', documentation: 'Allocate and zero-initialize memory.' },
  { name: 'realloc', kind: 'function', detail: 'realloc(ptr, size) → void*', documentation: 'Reallocate memory block.' },
  { name: 'free', kind: 'function', detail: 'free(ptr)', documentation: 'Deallocate memory block.' },
  { name: 'strlen', kind: 'function', detail: 'strlen(str) → size_t', documentation: 'Get string length.' },
  { name: 'strcpy', kind: 'function', detail: 'strcpy(dest, src) → char*', documentation: 'Copy string.' },
  { name: 'strcat', kind: 'function', detail: 'strcat(dest, src) → char*', documentation: 'Concatenate strings.' },
  { name: 'strcmp', kind: 'function', detail: 'strcmp(s1, s2) → int', documentation: 'Compare two strings.' },
  { name: 'memset', kind: 'function', detail: 'memset(ptr, value, num)', documentation: 'Fill block of memory.' },
  { name: 'memcpy', kind: 'function', detail: 'memcpy(dest, src, num)', documentation: 'Copy block of memory.' },
  { name: 'atoi', kind: 'function', detail: 'atoi(str) → int', documentation: 'Convert string to integer.' },
  { name: 'abs', kind: 'function', detail: 'abs(x) → int', documentation: 'Absolute value.' },
  { name: 'exit', kind: 'function', detail: 'exit(status)', documentation: 'Terminate calling process.' },
  { name: 'NULL', kind: 'constant', detail: 'NULL', documentation: 'Null pointer constant.' },
  { name: 'EOF', kind: 'constant', detail: 'EOF', documentation: 'End-of-file indicator.' },
  { name: 'stdin', kind: 'constant', detail: 'FILE* stdin', documentation: 'Standard input stream.' },
  { name: 'stdout', kind: 'constant', detail: 'FILE* stdout', documentation: 'Standard output stream.' },
  { name: 'stderr', kind: 'constant', detail: 'FILE* stderr', documentation: 'Standard error stream.' },
  { name: 'stdio.h', kind: 'module', detail: '#include <stdio.h>', documentation: 'Standard input/output library.' },
  { name: 'stdlib.h', kind: 'module', detail: '#include <stdlib.h>', documentation: 'General utilities library.' },
  { name: 'string.h', kind: 'module', detail: '#include <string.h>', documentation: 'String handling library.' },
  { name: 'math.h', kind: 'module', detail: '#include <math.h>', documentation: 'Mathematics library.' },
];

const GO_KEYWORDS: BuiltinEntry[] = [
  ...'break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var'
    .split(' ')
    .map((k) => ({ name: k, kind: 'keyword' as const, detail: 'keyword' })),
  { name: 'fmt.Println', kind: 'function', detail: 'fmt.Println(a ...any)', documentation: 'Print line to stdout.' },
  { name: 'fmt.Printf', kind: 'function', detail: 'fmt.Printf(format string, a ...any)', documentation: 'Print formatted string to stdout.' },
  { name: 'fmt.Sprintf', kind: 'function', detail: 'fmt.Sprintf(format string, a ...any) string', documentation: 'Return a formatted string.' },
  { name: 'fmt.Scan', kind: 'function', detail: 'fmt.Scan(a ...any)', documentation: 'Read from stdin.' },
  { name: 'len', kind: 'function', detail: 'len(v) → int', documentation: 'Return the length of v (string, array, slice, map, channel).' },
  { name: 'cap', kind: 'function', detail: 'cap(v) → int', documentation: 'Return the capacity of v.' },
  { name: 'make', kind: 'function', detail: 'make(t Type, size ...int) → Type', documentation: 'Allocate and initialize a slice, map, or channel.' },
  { name: 'append', kind: 'function', detail: 'append(slice []T, elems ...T) → []T', documentation: 'Append elements to a slice.' },
  { name: 'copy', kind: 'function', detail: 'copy(dst, src []T) → int', documentation: 'Copy elements from src to dst.' },
  { name: 'delete', kind: 'function', detail: 'delete(m map[K]V, key K)', documentation: 'Delete a key from a map.' },
  { name: 'panic', kind: 'function', detail: 'panic(v any)', documentation: 'Stop normal execution of the current goroutine.' },
  { name: 'recover', kind: 'function', detail: 'recover() → any', documentation: 'Regain control of a panicking goroutine.' },
  { name: 'close', kind: 'function', detail: 'close(ch chan<- T)', documentation: 'Close a channel.' },
  { name: 'new', kind: 'function', detail: 'new(Type) → *Type', documentation: 'Allocate memory and return a pointer.' },
  { name: 'error', kind: 'type', detail: 'error interface', documentation: 'The built-in error interface.' },
  { name: 'nil', kind: 'constant', detail: 'nil', documentation: 'Zero value for pointers, interfaces, maps, slices, channels, and function types.' },
  { name: 'true', kind: 'constant', detail: 'true', documentation: 'Boolean true.' },
  { name: 'false', kind: 'constant', detail: 'false', documentation: 'Boolean false.' },
];

const RUST_KEYWORDS: BuiltinEntry[] = [
  ...'as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while'
    .split(' ')
    .map((k) => ({ name: k, kind: 'keyword' as const, detail: 'keyword' })),
  { name: 'println!', kind: 'function', detail: 'println!(format, ...)', documentation: 'Print to stdout with newline.' },
  { name: 'print!', kind: 'function', detail: 'print!(format, ...)', documentation: 'Print to stdout without newline.' },
  { name: 'eprintln!', kind: 'function', detail: 'eprintln!(format, ...)', documentation: 'Print to stderr with newline.' },
  { name: 'format!', kind: 'function', detail: 'format!(format, ...) → String', documentation: 'Create a formatted string.' },
  { name: 'vec!', kind: 'function', detail: 'vec![elements] → Vec<T>', documentation: 'Create a new Vec.' },
  { name: 'String', kind: 'type', detail: 'String', documentation: 'A growable UTF-8 string.' },
  { name: 'Vec', kind: 'type', detail: 'Vec<T>', documentation: 'A contiguous growable array type.' },
  { name: 'HashMap', kind: 'type', detail: 'HashMap<K, V>', documentation: 'A hash map implementation.' },
  { name: 'HashSet', kind: 'type', detail: 'HashSet<T>', documentation: 'A hash set implementation.' },
  { name: 'Option', kind: 'type', detail: 'Option<T>', documentation: 'Optional value (Some or None).' },
  { name: 'Result', kind: 'type', detail: 'Result<T, E>', documentation: 'Result of an operation (Ok or Err).' },
  { name: 'Some', kind: 'function', detail: 'Some(T)', documentation: 'An Option containing a value.' },
  { name: 'None', kind: 'constant', detail: 'None', documentation: 'An empty Option.' },
  { name: 'Ok', kind: 'function', detail: 'Ok(T)', documentation: 'A Result indicating success.' },
  { name: 'Err', kind: 'function', detail: 'Err(E)', documentation: 'A Result indicating failure.' },
  { name: 'Box', kind: 'type', detail: 'Box<T>', documentation: 'A pointer type for heap allocation.' },
  { name: 'Rc', kind: 'type', detail: 'Rc<T>', documentation: 'Reference-counted smart pointer.' },
  { name: 'Arc', kind: 'type', detail: 'Arc<T>', documentation: 'Atomically reference-counted smart pointer.' },
  { name: 'Clone', kind: 'type', detail: 'trait Clone', documentation: 'Trait for types that can be cloned.' },
  { name: 'Debug', kind: 'type', detail: 'trait Debug', documentation: 'Trait for formatting with {:?}.' },
  { name: 'Display', kind: 'type', detail: 'trait Display', documentation: 'Trait for user-facing output formatting.' },
  { name: 'Iterator', kind: 'type', detail: 'trait Iterator', documentation: 'Trait for iterating over a collection.' },
];

const HTML_KEYWORDS: BuiltinEntry[] = [
  // Tags
  ...'div span p a h1 h2 h3 h4 h5 h6 ul ol li table thead tbody tr th td form input button textarea select option label img video audio canvas svg section article header footer nav main aside iframe html head body title meta link style script'
    .split(' ')
    .map((tag) => ({ name: tag, kind: 'keyword' as const, detail: `<${tag}> element`, insertText: `<${tag}>$0</${tag}>` })),
  // Attributes
  ...'class id src href alt title placeholder type value name rel target width height required disabled style'
    .split(' ')
    .map((attr) => ({ name: attr, kind: 'variable' as const, detail: `${attr} attribute`, insertText: `${attr}="$0"` })),
  // Snippet
  {
    name: 'html5',
    kind: 'snippet',
    detail: 'HTML5 Boilerplate',
    documentation: 'Standard HTML5 document template',
    insertText: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Document</title>\n</head>\n<body>\n  $0\n</body>\n</html>',
  },
];

const CSS_KEYWORDS: BuiltinEntry[] = [
  // Properties
  ...'display position top right bottom left z-index color background background-color border border-radius margin padding width height min-width max-width min-height max-height font-size font-family font-weight line-height text-align text-decoration overflow cursor box-shadow transition transform opacity justify-content align-items flex-direction flex-wrap gap flex grid grid-template-columns'
    .split(' ')
    .map((prop) => ({ name: prop, kind: 'keyword' as const, detail: `CSS property: ${prop}`, insertText: `${prop}: $0;` })),
  // Values
  ...'block inline inline-block none absolute relative fixed sticky pointer inherit initial auto center solid dashed transparent hidden bold uppercase lowercase flex grid column row'
    .split(' ')
    .map((val) => ({ name: val, kind: 'constant' as const, detail: `CSS value: ${val}` })),
  // At-rules
  { name: '@media', kind: 'keyword', detail: '@media query', insertText: '@media (max-width: ${1:768px}) {\n  $0\n}' },
  { name: '@keyframes', kind: 'keyword', detail: '@keyframes animation', insertText: '@keyframes ${1:animationName} {\n  0% { $2 }\n  100% { $0 }\n}' },
];

// Language DB lookup
const LANGUAGE_DBS: Record<string, BuiltinEntry[]> = {
  python: PYTHON_KEYWORDS,
  html: HTML_KEYWORDS,
  css: CSS_KEYWORDS,
  javascript: JAVASCRIPT_KEYWORDS,
  typescript: JAVASCRIPT_KEYWORDS, // TS extends JS
  c: C_KEYWORDS,
  cpp: CPP_KEYWORDS,
  java: JAVA_KEYWORDS,
  go: GO_KEYWORDS,
  rust: RUST_KEYWORDS,
};

export function getLanguageBuiltins(language: string): BuiltinEntry[] {
  return LANGUAGE_DBS[language] || [];
}

// ---------------------------------------------------------------------------
// 2. Symbol Extractor — scans current file for user-defined symbols
// ---------------------------------------------------------------------------

export interface ExtractedSymbol {
  name: string;
  kind: 'variable' | 'function' | 'class' | 'constant' | 'parameter';
  line: number;
}

export function extractSymbols(code: string, language: string): ExtractedSymbol[] {
  const symbols: ExtractedSymbol[] = [];
  const seen = new Set<string>();
  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    let matches: RegExpMatchArray | null;

    if (language === 'python') {
      // def function_name(
      matches = line.match(/^\s*def\s+([a-zA-Z_]\w*)\s*\(/);
      if (matches && !seen.has(matches[1])) { seen.add(matches[1]); symbols.push({ name: matches[1], kind: 'function', line: lineNum }); }
      // class ClassName
      matches = line.match(/^\s*class\s+([a-zA-Z_]\w*)/);
      if (matches && !seen.has(matches[1])) { seen.add(matches[1]); symbols.push({ name: matches[1], kind: 'class', line: lineNum }); }
      // variable = value
      matches = line.match(/^\s*([a-zA-Z_]\w*)\s*=[^=]/);
      if (matches && !seen.has(matches[1]) && !['self', 'cls'].includes(matches[1])) { seen.add(matches[1]); symbols.push({ name: matches[1], kind: 'variable', line: lineNum }); }
      // for var in
      matches = line.match(/^\s*for\s+([a-zA-Z_]\w*)\s+in\b/);
      if (matches && !seen.has(matches[1])) { seen.add(matches[1]); symbols.push({ name: matches[1], kind: 'variable', line: lineNum }); }
    } else if (language === 'javascript' || language === 'typescript') {
      // function name(
      matches = line.match(/(?:function\s+|(?:const|let|var)\s+)([a-zA-Z_$]\w*)/);
      if (matches && !seen.has(matches[1])) { seen.add(matches[1]); symbols.push({ name: matches[1], kind: line.includes('function') || line.includes('=>') ? 'function' : 'variable', line: lineNum }); }
      // class Name
      matches = line.match(/class\s+([a-zA-Z_$]\w*)/);
      if (matches && !seen.has(matches[1])) { seen.add(matches[1]); symbols.push({ name: matches[1], kind: 'class', line: lineNum }); }
    } else if (language === 'c' || language === 'cpp') {
      // type name( → function
      matches = line.match(/^\s*(?:(?:void|int|char|float|double|long|short|unsigned|bool|auto|string|vector|map|set)\s+\**\s*)([a-zA-Z_]\w*)\s*\(/);
      if (matches && !seen.has(matches[1])) { seen.add(matches[1]); symbols.push({ name: matches[1], kind: 'function', line: lineNum }); }
      // type name; or type name = → variable
      matches = line.match(/^\s*(?:(?:int|char|float|double|long|short|unsigned|bool|auto|string|const)\s+\**\s*)([a-zA-Z_]\w*)\s*[;=,\[]/);
      if (matches && !seen.has(matches[1])) { seen.add(matches[1]); symbols.push({ name: matches[1], kind: 'variable', line: lineNum }); }
      // struct/class Name
      matches = line.match(/(?:struct|class)\s+([a-zA-Z_]\w*)/);
      if (matches && !seen.has(matches[1])) { seen.add(matches[1]); symbols.push({ name: matches[1], kind: 'class', line: lineNum }); }
      // #define NAME → constant
      matches = line.match(/#define\s+([a-zA-Z_]\w*)/);
      if (matches && !seen.has(matches[1])) { seen.add(matches[1]); symbols.push({ name: matches[1], kind: 'constant', line: lineNum }); }
    } else if (language === 'java') {
      // access modifier type name( → method
      matches = line.match(/(?:public|private|protected|static|\s)+\s+\w+\s+([a-zA-Z_]\w*)\s*\(/);
      if (matches && !seen.has(matches[1])) { seen.add(matches[1]); symbols.push({ name: matches[1], kind: 'function', line: lineNum }); }
      // type name; or type name = → variable
      matches = line.match(/^\s*(?:(?:int|char|float|double|long|short|boolean|byte|String|var)\s+)([a-zA-Z_]\w*)\s*[;=]/);
      if (matches && !seen.has(matches[1])) { seen.add(matches[1]); symbols.push({ name: matches[1], kind: 'variable', line: lineNum }); }
      // class Name
      matches = line.match(/class\s+([a-zA-Z_]\w*)/);
      if (matches && !seen.has(matches[1])) { seen.add(matches[1]); symbols.push({ name: matches[1], kind: 'class', line: lineNum }); }
    } else if (language === 'go') {
      // func name(
      matches = line.match(/func\s+(?:\([^)]+\)\s+)?([a-zA-Z_]\w*)\s*\(/);
      if (matches && !seen.has(matches[1])) { seen.add(matches[1]); symbols.push({ name: matches[1], kind: 'function', line: lineNum }); }
      // var name or name :=
      matches = line.match(/(?:var\s+|(\w+)\s*:=)/);
      if (matches) {
        const n = matches[1] || line.match(/var\s+([a-zA-Z_]\w*)/)?.[1];
        if (n && !seen.has(n)) { seen.add(n); symbols.push({ name: n, kind: 'variable', line: lineNum }); }
      }
      // type Name struct
      matches = line.match(/type\s+([a-zA-Z_]\w*)\s+struct/);
      if (matches && !seen.has(matches[1])) { seen.add(matches[1]); symbols.push({ name: matches[1], kind: 'class', line: lineNum }); }
    } else if (language === 'rust') {
      // fn name(
      matches = line.match(/fn\s+([a-zA-Z_]\w*)\s*[<(]/);
      if (matches && !seen.has(matches[1])) { seen.add(matches[1]); symbols.push({ name: matches[1], kind: 'function', line: lineNum }); }
      // let name or let mut name
      matches = line.match(/let\s+(?:mut\s+)?([a-zA-Z_]\w*)/);
      if (matches && !seen.has(matches[1])) { seen.add(matches[1]); symbols.push({ name: matches[1], kind: 'variable', line: lineNum }); }
      // struct Name
      matches = line.match(/struct\s+([a-zA-Z_]\w*)/);
      if (matches && !seen.has(matches[1])) { seen.add(matches[1]); symbols.push({ name: matches[1], kind: 'class', line: lineNum }); }
      // const NAME
      matches = line.match(/const\s+([a-zA-Z_]\w*)/);
      if (matches && !seen.has(matches[1])) { seen.add(matches[1]); symbols.push({ name: matches[1], kind: 'constant', line: lineNum }); }
    }
  }

  return symbols;
}

// ---------------------------------------------------------------------------
// 3. Typo Detector — Levenshtein distance matching
// ---------------------------------------------------------------------------

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export interface TypoSuggestion {
  original: string;
  suggestion: string;
  distance: number;
}

/**
 * Given a word and a language, find close matches in the keyword/builtin database.
 * Only returns suggestions with edit distance ≤ 2 and at least 3 characters long.
 */
export function findTypoSuggestions(word: string, language: string): TypoSuggestion[] {
  if (word.length < 3) return [];
  const builtins = getLanguageBuiltins(language);
  const suggestions: TypoSuggestion[] = [];

  for (const entry of builtins) {
    if (entry.name === word) continue; // exact match, not a typo
    const dist = levenshtein(word.toLowerCase(), entry.name.toLowerCase());
    if (dist <= 2 && dist > 0 && entry.name.length >= 3) {
      suggestions.push({ original: word, suggestion: entry.name, distance: dist });
    }
  }

  suggestions.sort((a, b) => a.distance - b.distance);
  return suggestions.slice(0, 5);
}

// ---------------------------------------------------------------------------
// 4. Function Signature Database
// ---------------------------------------------------------------------------

export interface FunctionSignature {
  name: string;
  parameters: { name: string; type?: string; optional?: boolean; documentation?: string }[];
  returnType?: string;
  documentation?: string;
}

const PYTHON_SIGNATURES: FunctionSignature[] = [
  { name: 'print', parameters: [{ name: '*objects', documentation: 'Objects to print' }, { name: 'sep', type: 'str', optional: true, documentation: 'Separator between objects (default " ")' }, { name: 'end', type: 'str', optional: true, documentation: 'String appended after the last value (default "\\n")' }, { name: 'file', optional: true, documentation: 'A file-like object (default sys.stdout)' }, { name: 'flush', type: 'bool', optional: true, documentation: 'Whether to forcibly flush the stream' }], documentation: 'Print objects to the text stream file.' },
  { name: 'input', parameters: [{ name: 'prompt', type: 'str', optional: true, documentation: 'String to display before reading input' }], returnType: 'str', documentation: 'Read a line of input from stdin.' },
  { name: 'len', parameters: [{ name: 's', documentation: 'A sequence or collection' }], returnType: 'int', documentation: 'Return the number of items in a container.' },
  { name: 'range', parameters: [{ name: 'start', type: 'int', optional: true }, { name: 'stop', type: 'int' }, { name: 'step', type: 'int', optional: true }], returnType: 'range', documentation: 'Return an immutable sequence of numbers.' },
  { name: 'sorted', parameters: [{ name: 'iterable' }, { name: 'key', optional: true, documentation: 'Function of one argument used to extract a comparison key' }, { name: 'reverse', type: 'bool', optional: true, documentation: 'If True, sort in descending order' }], returnType: 'list', documentation: 'Return a new sorted list.' },
  { name: 'enumerate', parameters: [{ name: 'iterable' }, { name: 'start', type: 'int', optional: true, documentation: 'Starting count value (default 0)' }], returnType: 'enumerate', documentation: 'Return an enumerate object.' },
  { name: 'zip', parameters: [{ name: '*iterables', documentation: 'Iterables to zip together' }], returnType: 'zip', documentation: 'Aggregate elements from each iterable.' },
  { name: 'map', parameters: [{ name: 'function' }, { name: '*iterables' }], returnType: 'map', documentation: 'Apply function to every item of iterables.' },
  { name: 'filter', parameters: [{ name: 'function' }, { name: 'iterable' }], returnType: 'filter', documentation: 'Construct an iterator from elements for which function returns True.' },
  { name: 'int', parameters: [{ name: 'x', optional: true, documentation: 'Number or string to convert' }, { name: 'base', type: 'int', optional: true, documentation: 'Base for string conversion (default 10)' }], returnType: 'int', documentation: 'Convert to integer.' },
  { name: 'float', parameters: [{ name: 'x', optional: true }], returnType: 'float', documentation: 'Convert to floating point number.' },
  { name: 'str', parameters: [{ name: 'object', optional: true }, { name: 'encoding', optional: true }, { name: 'errors', optional: true }], returnType: 'str', documentation: 'Return a string version of object.' },
  { name: 'list', parameters: [{ name: 'iterable', optional: true }], returnType: 'list', documentation: 'Create a new list.' },
  { name: 'dict', parameters: [{ name: '**kwargs', optional: true }], returnType: 'dict', documentation: 'Create a new dictionary.' },
  { name: 'set', parameters: [{ name: 'iterable', optional: true }], returnType: 'set', documentation: 'Create a new set.' },
  { name: 'open', parameters: [{ name: 'file', type: 'str' }, { name: 'mode', type: 'str', optional: true, documentation: 'File mode ("r", "w", "a", etc.)' }, { name: 'encoding', type: 'str', optional: true }], returnType: 'file', documentation: 'Open a file and return a file object.' },
  { name: 'max', parameters: [{ name: '*args' }, { name: 'key', optional: true }, { name: 'default', optional: true }], documentation: 'Return the largest item.' },
  { name: 'min', parameters: [{ name: '*args' }, { name: 'key', optional: true }, { name: 'default', optional: true }], documentation: 'Return the smallest item.' },
  { name: 'sum', parameters: [{ name: 'iterable' }, { name: 'start', optional: true, documentation: 'Value added to sum (default 0)' }], returnType: 'number', documentation: 'Sum the items of an iterable.' },
  { name: 'abs', parameters: [{ name: 'x', documentation: 'Number to get absolute value of' }], returnType: 'number', documentation: 'Return the absolute value.' },
  { name: 'round', parameters: [{ name: 'number' }, { name: 'ndigits', type: 'int', optional: true }], returnType: 'number', documentation: 'Round to given precision.' },
  { name: 'isinstance', parameters: [{ name: 'object' }, { name: 'classinfo' }], returnType: 'bool', documentation: 'Return True if object is an instance of classinfo.' },
  { name: 'type', parameters: [{ name: 'object' }], returnType: 'type', documentation: 'Return the type of an object.' },
  { name: 'hasattr', parameters: [{ name: 'object' }, { name: 'name', type: 'str' }], returnType: 'bool', documentation: 'Return True if object has the named attribute.' },
  { name: 'getattr', parameters: [{ name: 'object' }, { name: 'name', type: 'str' }, { name: 'default', optional: true }], documentation: 'Return the value of the named attribute.' },
];

const JS_SIGNATURES: FunctionSignature[] = [
  { name: 'console.log', parameters: [{ name: '...data', documentation: 'Data to output' }], documentation: 'Output a message to the web console.' },
  { name: 'console.error', parameters: [{ name: '...data' }], documentation: 'Output an error message.' },
  { name: 'parseInt', parameters: [{ name: 'string', type: 'string' }, { name: 'radix', type: 'number', optional: true }], returnType: 'number', documentation: 'Parse string and return an integer.' },
  { name: 'parseFloat', parameters: [{ name: 'string', type: 'string' }], returnType: 'number', documentation: 'Parse string and return a float.' },
  { name: 'JSON.stringify', parameters: [{ name: 'value' }, { name: 'replacer', optional: true }, { name: 'space', optional: true }], returnType: 'string', documentation: 'Convert a value to a JSON string.' },
  { name: 'JSON.parse', parameters: [{ name: 'text', type: 'string' }, { name: 'reviver', optional: true }], documentation: 'Parse a JSON string.' },
  { name: 'setTimeout', parameters: [{ name: 'callback', type: 'Function' }, { name: 'delay', type: 'number', optional: true }, { name: '...args', optional: true }], returnType: 'number', documentation: 'Call a function after a delay.' },
  { name: 'setInterval', parameters: [{ name: 'callback', type: 'Function' }, { name: 'delay', type: 'number', optional: true }, { name: '...args', optional: true }], returnType: 'number', documentation: 'Call a function at specified intervals.' },
  { name: 'fetch', parameters: [{ name: 'url', type: 'string' }, { name: 'options', optional: true }], returnType: 'Promise<Response>', documentation: 'Fetch a resource from the network.' },
  { name: 'Array.isArray', parameters: [{ name: 'value' }], returnType: 'boolean', documentation: 'Determine if value is an Array.' },
  { name: 'Array.from', parameters: [{ name: 'arrayLike' }, { name: 'mapFn', optional: true }], returnType: 'Array', documentation: 'Create a new Array from an array-like or iterable.' },
  { name: 'Object.keys', parameters: [{ name: 'obj' }], returnType: 'string[]', documentation: 'Return own enumerable property names.' },
  { name: 'Object.values', parameters: [{ name: 'obj' }], returnType: 'any[]', documentation: 'Return own enumerable property values.' },
  { name: 'Object.entries', parameters: [{ name: 'obj' }], returnType: '[string, any][]', documentation: 'Return own enumerable [key, value] pairs.' },
  { name: 'Math.max', parameters: [{ name: '...values', type: 'number' }], returnType: 'number', documentation: 'Returns the largest of the given numbers.' },
  { name: 'Math.min', parameters: [{ name: '...values', type: 'number' }], returnType: 'number', documentation: 'Returns the smallest of the given numbers.' },
  { name: 'Math.floor', parameters: [{ name: 'x', type: 'number' }], returnType: 'number', documentation: 'Returns the largest integer ≤ x.' },
  { name: 'Math.ceil', parameters: [{ name: 'x', type: 'number' }], returnType: 'number', documentation: 'Returns the smallest integer ≥ x.' },
  { name: 'Math.round', parameters: [{ name: 'x', type: 'number' }], returnType: 'number', documentation: 'Returns x rounded to the nearest integer.' },
  { name: 'Math.abs', parameters: [{ name: 'x', type: 'number' }], returnType: 'number', documentation: 'Returns the absolute value of x.' },
  { name: 'Math.random', parameters: [], returnType: 'number', documentation: 'Returns a pseudo-random number between 0 and 1.' },
  { name: 'require', parameters: [{ name: 'module', type: 'string' }], documentation: 'Import a CommonJS module (Node.js).' },
];

const SIGNATURE_DBS: Record<string, FunctionSignature[]> = {
  python: PYTHON_SIGNATURES,
  javascript: JS_SIGNATURES,
  typescript: JS_SIGNATURES,
};

export function getFunctionSignature(funcName: string, language: string): FunctionSignature | undefined {
  const db = SIGNATURE_DBS[language];
  if (!db) return undefined;
  return db.find((s) => s.name === funcName);
}

export function getAllSignatures(language: string): FunctionSignature[] {
  return SIGNATURE_DBS[language] || [];
}

// ---------------------------------------------------------------------------
// 5. Common Typo Database (language-specific known typos)
// ---------------------------------------------------------------------------

const COMMON_TYPOS: Record<string, Record<string, string>> = {
  python: {
    'pritn': 'print',
    'pirnt': 'print',
    'prnt': 'print',
    'prnit': 'print',
    'ptint': 'print',
    'prit': 'print',
    'inpt': 'input',
    'inut': 'input',
    'retrun': 'return',
    'retrn': 'return',
    'reutrn': 'return',
    'retunr': 'return',
    'reutn': 'return',
    'improt': 'import',
    'imoprt': 'import',
    'impor': 'import',
    'whlie': 'while',
    'whiel': 'while',
    'ture': 'True',
    'flase': 'False',
    'fasle': 'False',
    'breack': 'break',
    'braek': 'break',
    'cotninue': 'continue',
    'contnue': 'continue',
    'lne': 'len',
    'leng': 'len',
    'lenght': 'len',
    'rnage': 'range',
    'ragn': 'range',
    'rnge': 'range',
    'soretd': 'sorted',
    'srotd': 'sorted',
  },
  javascript: {
    'cosole': 'console',
    'consoel': 'console',
    'consle': 'console',
    'consloe': 'console',
    'fucntion': 'function',
    'funciton': 'function',
    'funcion': 'function',
    'funtcion': 'function',
    'retrun': 'return',
    'retrn': 'return',
    'reutrn': 'return',
    'undefied': 'undefined',
    'undefiend': 'undefined',
    'lenght': 'length',
    'lentgh': 'length',
    'legth': 'length',
    'ture': 'true',
    'flase': 'false',
    'fasle': 'false',
    'nul': 'null',
    'docuemnt': 'document',
    'documnet': 'document',
    'widnow': 'window',
    'windwo': 'window',
    'setTimout': 'setTimeout',
    'setTiemout': 'setTimeout',
    'setTimeotu': 'setTimeout',
  },
  typescript: {}, // inherits from javascript
  c: {
    'pirntf': 'printf',
    'pritnf': 'printf',
    'prntf': 'printf',
    'scanff': 'scanf',
    'scnaf': 'scanf',
    'retrun': 'return',
    'mian': 'main',
    'maloc': 'malloc',
    'fre': 'free',
    'streln': 'strlen',
    'strlne': 'strlen',
  },
  cpp: {
    'coute': 'cout',
    'cotu': 'cout',
    'cing': 'cin',
    'vecotr': 'vector',
    'vectro': 'vector',
    'stirng': 'string',
    'strign': 'string',
    'retrun': 'return',
    'mian': 'main',
    'namsepace': 'namespace',
    'namepsace': 'namespace',
    'namesapce': 'namespace',
    'incldue': 'include',
    'includ': 'include',
  },
  java: {
    'Sytem': 'System',
    'Systme': 'System',
    'Ssytem': 'System',
    'pritnln': 'println',
    'printlm': 'println',
    'Sacnner': 'Scanner',
    'Scannner': 'Scanner',
    'Scaner': 'Scanner',
    'retrun': 'return',
    'pubilc': 'public',
    'pubic': 'public',
    'privat': 'private',
    'Stirng': 'String',
    'Strign': 'String',
  },
  go: {
    'fmtt': 'fmt',
    'Pritnln': 'Println',
    'Printlm': 'Println',
    'Pirntln': 'Println',
    'retrun': 'return',
    'pacakge': 'package',
    'pakage': 'package',
    'improt': 'import',
    'fucn': 'func',
    'fnuc': 'func',
  },
  rust: {
    'pritnln': 'println',
    'printlm': 'println',
    'pirntln': 'println',
    'retrun': 'return',
    'fnc': 'fn',
    'lte': 'let',
    'mtu': 'mut',
    'Stirng': 'String',
    'Strign': 'String',
    'Vec': 'Vec',
  },
};

/**
 * Check if a word is a known typo and return the correction.
 * Falls back to Levenshtein-based detection if not in the known typo list.
 */
export function getTypoCorrection(word: string, language: string): string | null {
  // Check exact known typos
  const langTypos = COMMON_TYPOS[language] || {};
  const jsTypos = language === 'typescript' ? (COMMON_TYPOS['javascript'] || {}) : {};
  const merged = { ...jsTypos, ...langTypos };
  if (merged[word]) return merged[word];

  // Fall back to Levenshtein
  const suggestions = findTypoSuggestions(word, language);
  if (suggestions.length > 0 && suggestions[0].distance === 1) {
    return suggestions[0].suggestion;
  }
  return null;
}
