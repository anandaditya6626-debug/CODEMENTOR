'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Language } from '@/types';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface TechItem {
  id: string;
  name: string;
  iconText: string;       // 1-3 char for the icon badge
  iconBg: string;         // bg color (tailwind or hex)
  iconColor: string;      // text color for icon badge
  language: Language;      // maps to our supported Language union
  filename: string;       // default filename to create
  starterCode: string;
}

interface TechCategory {
  id: string;
  name: string;
  labelColor: string;     // category label color
  items: TechItem[];
  initialVisible: number;
}

/* ------------------------------------------------------------------ */
/*  Starter code templates                                             */
/* ------------------------------------------------------------------ */

const STARTER = {
  python: `# Python 3
def main():
    name = input("Enter your name: ")
    print(f"Hello, {name}! Welcome to CodeMentor.")

if __name__ == "__main__":
    main()
`,
  java: `// Java (OpenJDK)
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.print("Enter your name: ");
        String name = sc.nextLine();
        System.out.println("Hello, " + name + "! Welcome to CodeMentor.");
    }
}
`,
  c: `// C (GCC)
#include <stdio.h>

int main() {
    setvbuf(stdout, NULL, _IONBF, 0);
    char name[64];
    printf("Enter your name: ");
    if (scanf("%63s", name) == 1) {
        printf("Hello, %s! Welcome to CodeMentor.\\n", name);
    }
    return 0;
}
`,
  cpp: `// C++ (GCC)
#include <iostream>
#include <string>

int main() {
    std::string name;
    std::cout << "Enter your name: ";
    std::getline(std::cin, name);
    std::cout << "Hello, " << name << "! Welcome to CodeMentor." << std::endl;
    return 0;
}
`,
  javascript: `// JavaScript (Node.js)
const readline = require("readline");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question("Enter your name: ", (name) => {
    console.log(\`Hello, \${name}! Welcome to CodeMentor.\`);
    rl.close();
});
`,
  typescript: `// TypeScript
const greeting: string = "Hello, World!";
console.log(greeting);

function greet(name: string): string {
    return \`Hello, \${name}! Welcome to CodeMentor.\`;
}

console.log(greet("Developer"));
`,
  go: `// Go
package main

import "fmt"

func main() {
    var name string
    fmt.Print("Enter your name: ")
    fmt.Scanln(&name)
    fmt.Printf("Hello, %s! Welcome to CodeMentor.\\n", name)
}
`,
  rust: `// Rust
use std::io;

fn main() {
    println!("Enter your name:");
    let mut name = String::new();
    io::stdin().read_line(&mut name).expect("Failed to read line");
    let name = name.trim();
    println!("Hello, {}! Welcome to CodeMentor.", name);
}
`,
  php: `<?php
// PHP
echo "Enter your name: ";
$name = trim(fgets(STDIN));
echo "Hello, $name! Welcome to CodeMentor.\\n";
?>
`,
  csharp: `// C#
using System;

class Program {
    static void Main() {
        Console.Write("Enter your name: ");
        string name = Console.ReadLine();
        Console.WriteLine($"Hello, {name}! Welcome to CodeMentor.");
    }
}
`,
  ruby: `# Ruby
print "Enter your name: "
name = gets.chomp
puts "Hello, #{name}! Welcome to CodeMentor."
`,
  kotlin: `// Kotlin
fun main() {
    print("Enter your name: ")
    val name = readLine() ?: "World"
    println("Hello, $name! Welcome to CodeMentor.")
}
`,
  swift: `// Swift
import Foundation

print("Enter your name: ", terminator: "")
if let name = readLine() {
    print("Hello, \\(name)! Welcome to CodeMentor.")
}
`,
  sql: `-- SQL Query
CREATE TABLE users (
    id    INTEGER PRIMARY KEY,
    name  TEXT NOT NULL,
    email TEXT UNIQUE
);

INSERT INTO users (name, email) VALUES ('CodeMentor', 'hello@codementor.dev');
SELECT * FROM users;
`,
  html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hello World</title>
    <style>
        body {
            font-family: 'Inter', system-ui, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: #0e1015;
            color: #f3f4f6;
        }
        h1 { color: #a3e635; }
    </style>
</head>
<body>
    <h1>Hello, World!</h1>
</body>
</html>
`,
  css: `/* CSS Stylesheet */
:root {
    --bg: #0e1015;
    --fg: #f3f4f6;
    --accent: #a3e635;
}

body {
    font-family: 'Inter', system-ui, sans-serif;
    background-color: var(--bg);
    color: var(--fg);
    margin: 0;
    padding: 2rem;
}

h1 {
    color: var(--accent);
    font-size: 2rem;
}

.container {
    max-width: 800px;
    margin: 0 auto;
}
`,
  // Frameworks
  fastapi: `# FastAPI
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello, FastAPI!"}

@app.get("/items/{item_id}")
def read_item(item_id: int, q: str = None):
    return {"item_id": item_id, "q": q}

# Run with: uvicorn main:app --reload
`,
  springboot: `// Spring Boot
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;

@SpringBootApplication
@RestController
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }

    @GetMapping("/")
    public String hello() {
        return "Hello, Spring Boot!";
    }
}
`,
  tkinter: `# Tkinter GUI
import tkinter as tk
from tkinter import messagebox

root = tk.Tk()
root.title("CodeMentor - Tkinter")
root.geometry("400x300")
root.configure(bg="#0e1015")

label = tk.Label(root, text="Hello, Tkinter!", font=("Inter", 18, "bold"),
                 fg="#a3e635", bg="#0e1015")
label.pack(pady=40)

def on_click():
    messagebox.showinfo("CodeMentor", "Button clicked!")

btn = tk.Button(root, text="Click Me", command=on_click,
                bg="#a3e635", fg="#0e1015", font=("Inter", 12, "bold"),
                relief="flat", padx=20, pady=8)
btn.pack()

root.mainloop()
`,
  nodejs: `// Node.js HTTP Server
const http = require('http');

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        message: 'Hello, Node.js!',
        path: req.url,
        method: req.method
    }));
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(\`Server running at http://localhost:\${PORT}\`);
});
`,
  react: `// React Component
import React, { useState } from 'react';

function App() {
    const [count, setCount] = useState(0);

    return (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
            <h1>Hello, React! ⚛️</h1>
            <p>Count: {count}</p>
            <button onClick={() => setCount(c => c + 1)}>
                Increment
            </button>
        </div>
    );
}

export default App;
`,
  vue: `// Vue.js Component
const { createApp, ref } = Vue;

const App = {
    setup() {
        const count = ref(0);
        const message = ref('Hello, Vue!');

        function increment() {
            count.value++;
        }

        return { count, message, increment };
    },
    template: \`
        <div style="text-align: center; padding: 2rem;">
            <h1>{{ message }} 💚</h1>
            <p>Count: {{ count }}</p>
            <button @click="increment">Increment</button>
        </div>
    \`
};

createApp(App).mount('#app');
`,
  angular: `// Angular Component
import { Component } from '@angular/core';

@Component({
    selector: 'app-root',
    template: \`
        <div style="text-align: center; padding: 2rem;">
            <h1>Hello, Angular! 🅰️</h1>
            <p>Count: {{ count }}</p>
            <button (click)="increment()">Increment</button>
        </div>
    \`
})
export class AppComponent {
    count = 0;

    increment() {
        this.count++;
    }
}
`,
  nextjs: `// Next.js Page
'use client';

import { useState } from 'react';

export default function Home() {
    const [count, setCount] = useState(0);

    return (
        <main style={{ textAlign: 'center', padding: '2rem' }}>
            <h1>Hello, Next.js! ▲</h1>
            <p>Count: {count}</p>
            <button onClick={() => setCount(c => c + 1)}>
                Increment
            </button>
        </main>
    );
}
`,
  svelte: `<!-- Svelte Component -->
<script>
    let count = 0;

    function increment() {
        count += 1;
    }
</script>

<main>
    <h1>Hello, Svelte! 🔥</h1>
    <p>Count: {count}</p>
    <button on:click={increment}>Increment</button>
</main>

<style>
    main { text-align: center; padding: 2rem; }
</style>
`,
  django: `# Django View
from django.http import JsonResponse
from django.views import View

class HelloView(View):
    def get(self, request):
        return JsonResponse({
            "message": "Hello, Django!",
            "framework": "Django",
            "version": "4.x"
        })

# urls.py:
# from django.urls import path
# from .views import HelloView
# urlpatterns = [path('', HelloView.as_view(), name='hello')]
`,
  flask: `# Flask App
from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/')
def hello():
    return jsonify({
        "message": "Hello, Flask!",
        "framework": "Flask"
    })

@app.route('/greet/<name>')
def greet(name):
    return jsonify({"greeting": f"Hello, {name}!"})

if __name__ == '__main__':
    app.run(debug=True)
`,
  express: `// Express.js Server
const express = require('express');
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
    res.json({ message: 'Hello, Express!' });
});

app.get('/greet/:name', (req, res) => {
    res.json({ greeting: \`Hello, \${req.params.name}!\` });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(\`Express server on http://localhost:\${PORT}\`);
});
`,
  lua: `-- Lua
print("Hello, World!")

function greet(name)
    return "Hello, " .. name .. "! Welcome to CodeMentor."
end

print(greet("Developer"))

-- Table example
local fruits = {"apple", "banana", "cherry"}
for i, fruit in ipairs(fruits) do
    print(i, fruit)
end
`,
  mongodb: `// MongoDB Queries
// Insert a document
db.users.insertOne({
    name: "CodeMentor",
    email: "hello@codementor.dev",
    role: "student",
    joined: new Date()
});

// Find documents
db.users.find({ role: "student" }).sort({ joined: -1 });

// Update
db.users.updateOne(
    { name: "CodeMentor" },
    { $set: { role: "pro" } }
);

// Aggregate
db.users.aggregate([
    { $group: { _id: "$role", count: { $sum: 1 } } }
]);
`,
  postgresql: `-- PostgreSQL
CREATE TABLE IF NOT EXISTS users (
    id         SERIAL PRIMARY KEY,
    username   VARCHAR(50) UNIQUE NOT NULL,
    email      VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO users (username, email)
VALUES ('codementor', 'hello@codementor.dev')
ON CONFLICT (username) DO NOTHING;

SELECT * FROM users ORDER BY created_at DESC;
`,
  mysql: `-- MySQL
CREATE TABLE IF NOT EXISTS users (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    username   VARCHAR(50) UNIQUE NOT NULL,
    email      VARCHAR(255) UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO users (username, email)
VALUES ('codementor', 'hello@codementor.dev');

SELECT * FROM users ORDER BY created_at DESC;
`,
  sqlite: `-- SQLite
CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT UNIQUE NOT NULL,
    email      TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO users (username, email)
VALUES ('codementor', 'hello@codementor.dev');

SELECT * FROM users ORDER BY created_at DESC;
`,
  redis: `# Redis Commands Reference

# String operations
SET greeting "Hello, Redis!"
GET greeting

# Hash operations
HSET user:1 name "CodeMentor" email "hello@codementor.dev"
HGETALL user:1

# List operations
RPUSH tasks "learn redis" "build app" "deploy"
LRANGE tasks 0 -1

# Set operations
SADD languages "python" "javascript" "go" "rust"
SMEMBERS languages

# Sorted set
ZADD leaderboard 100 "alice" 200 "bob" 150 "charlie"
ZREVRANGE leaderboard 0 -1 WITHSCORES
`,
  // Extra programming languages
  r: `# R Programming
cat("Hello, World!\\n")

# Vector operations
nums <- c(1, 2, 3, 4, 5)
cat("Sum:", sum(nums), "\\n")
cat("Mean:", mean(nums), "\\n")

# Function
fibonacci <- function(n) {
    if (n <= 1) return(n)
    return(fibonacci(n-1) + fibonacci(n-2))
}

for (i in 0:9) {
    cat("fib(", i, ") =", fibonacci(i), "\\n")
}
`,
  perl: `#!/usr/bin/perl
use strict;
use warnings;

print "Enter your name: ";
chomp(my $name = <STDIN>);
print "Hello, $name! Welcome to CodeMentor.\\n";

# Array operations
my @languages = ("Python", "JavaScript", "Perl");
foreach my $lang (@languages) {
    print "Language: $lang\\n";
}
`,
  scala: `// Scala
object Main extends App {
    println("Hello, Scala!")

    // Functional style
    val numbers = List(1, 2, 3, 4, 5)
    val doubled = numbers.map(_ * 2)
    println(s"Doubled: $doubled")

    // Pattern matching
    def classify(x: Int): String = x match {
        case 1 => "one"
        case 2 => "two"
        case _ => "other"
    }

    println(classify(1))
}
`,
  dart: `// Dart
void main() {
    print('Hello, Dart!');

    // Variables
    var name = 'CodeMentor';
    int count = 42;
    print('Welcome to $name! Count: $count');

    // List
    var languages = ['Python', 'Dart', 'JavaScript'];
    for (var lang in languages) {
        print('Language: $lang');
    }

    // Function
    print('Sum: \${add(3, 4)}');
}

int add(int a, int b) => a + b;
`,
  haskell: `-- Haskell
module Main where

main :: IO ()
main = do
    putStrLn "Hello, Haskell!"
    let numbers = [1..10]
    putStrLn $ "Sum: " ++ show (sum numbers)
    putStrLn $ "Fibonacci: " ++ show (map fib [0..9])

fib :: Int -> Int
fib 0 = 0
fib 1 = 1
fib n = fib (n - 1) + fib (n - 2)
`,
  elixir: `# Elixir
defmodule Hello do
  def greet(name) do
    "Hello, #{name}! Welcome to CodeMentor."
  end

  def fibonacci(0), do: 0
  def fibonacci(1), do: 1
  def fibonacci(n), do: fibonacci(n - 1) + fibonacci(n - 2)
end

IO.puts Hello.greet("Developer")
Enum.each(0..9, fn n ->
  IO.puts "fib(#{n}) = #{Hello.fibonacci(n)}"
end)
`,
  julia: `# Julia
println("Hello, Julia!")

# Function
function greet(name::String)
    return "Hello, $name! Welcome to CodeMentor."
end

println(greet("Developer"))

# Array operations
numbers = [1, 2, 3, 4, 5]
println("Sum: ", sum(numbers))
println("Squared: ", numbers .^ 2)

# Fibonacci
fib(n) = n <= 1 ? n : fib(n-1) + fib(n-2)
println("Fibonacci: ", [fib(i) for i in 0:9])
`,
  // Web frameworks extra
  mui: `// React + Material UI (MUI)
import React from 'react';
import { Button, Container, Typography, Box } from '@mui/material';

function App() {
    return (
        <Container maxWidth="sm">
            <Box sx={{ textAlign: 'center', mt: 8 }}>
                <Typography variant="h3" gutterBottom>
                    Hello, MUI! 🎨
                </Typography>
                <Button variant="contained" color="primary">
                    Get Started
                </Button>
            </Box>
        </Container>
    );
}

export default App;
`,
  chakra: `// React + Chakra UI
import React from 'react';
import { ChakraProvider, Box, Heading, Button, VStack } from '@chakra-ui/react';

function App() {
    return (
        <ChakraProvider>
            <Box textAlign="center" py={10}>
                <VStack spacing={4}>
                    <Heading>Hello, Chakra UI! ⚡</Heading>
                    <Button colorScheme="teal" size="lg">
                        Get Started
                    </Button>
                </VStack>
            </Box>
        </ChakraProvider>
    );
}

export default App;
`,
  shadcn: `// React + shadcn/ui
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Card className="w-[400px]">
                <CardHeader>
                    <CardTitle>Hello, shadcn/ui! 🎯</CardTitle>
                </CardHeader>
                <CardContent>
                    <Button className="w-full">Get Started</Button>
                </CardContent>
            </Card>
        </div>
    );
}
`,
  mantine: `// React + Mantine
import React from 'react';
import { MantineProvider, Container, Title, Button, Stack } from '@mantine/core';

function App() {
    return (
        <MantineProvider>
            <Container size="sm" style={{ textAlign: 'center', paddingTop: '4rem' }}>
                <Stack align="center" gap="md">
                    <Title order={1}>Hello, Mantine! 🌊</Title>
                    <Button size="lg" variant="filled">
                        Get Started
                    </Button>
                </Stack>
            </Container>
        </MantineProvider>
    );
}

export default App;
`,
  reactBootstrap: `// React + Bootstrap
import React from 'react';
import { Container, Button, Row, Col } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
    return (
        <Container className="text-center mt-5">
            <Row className="justify-content-center">
                <Col md={6}>
                    <h1>Hello, React Bootstrap! 🅱️</h1>
                    <p className="lead">
                        Build responsive UIs with Bootstrap components.
                    </p>
                    <Button variant="primary" size="lg">
                        Get Started
                    </Button>
                </Col>
            </Row>
        </Container>
    );
}

export default App;
`,
  radix: `// React + Radix UI
import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';

function App() {
    return (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
            <h1>Hello, Radix UI! 🧩</h1>
            <Dialog.Root>
                <Dialog.Trigger asChild>
                    <button className="btn-primary">Open Dialog</button>
                </Dialog.Trigger>
                <Dialog.Portal>
                    <Dialog.Overlay className="dialog-overlay" />
                    <Dialog.Content className="dialog-content">
                        <Dialog.Title>Welcome</Dialog.Title>
                        <Dialog.Description>
                            Radix provides unstyled, accessible components.
                        </Dialog.Description>
                        <Dialog.Close asChild>
                            <button>Close</button>
                        </Dialog.Close>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </div>
    );
}

export default App;
`,
  jquery: `// jQuery
$(document).ready(function() {
    $('h1').text('Hello, jQuery!');

    // Event handling
    $('#btn-greet').click(function() {
        const name = $('#name-input').val() || 'World';
        $('#greeting').text('Hello, ' + name + '!');
    });

    // AJAX example
    $.ajax({
        url: '/api/data',
        method: 'GET',
        success: function(data) {
            console.log('Data received:', data);
        }
    });
});
`,
  bootstrap: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hello Bootstrap</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-dark text-light">
    <div class="container text-center py-5">
        <h1 class="display-4 mb-3">Hello, Bootstrap! 🅱️</h1>
        <p class="lead">Build responsive, mobile-first sites.</p>
        <a class="btn btn-primary btn-lg" href="#" role="button">Get Started</a>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
`,
  tailwind: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hello Tailwind CSS</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-900 text-gray-100 min-h-screen flex items-center justify-center">
    <div class="text-center space-y-4">
        <h1 class="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            Hello, Tailwind CSS! 🌊
        </h1>
        <p class="text-gray-400 text-lg">Rapidly build modern websites.</p>
        <button class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition">
            Get Started
        </button>
    </div>
</body>
</html>
`,
  nuxtjs: `// Nuxt.js Page
<template>
    <div class="container">
        <h1>Hello, Nuxt.js! 💚</h1>
        <p>Count: {{ count }}</p>
        <button @click="count++">Increment</button>
    </div>
</template>

<script setup>
const count = ref(0);
</script>

<style scoped>
.container {
    text-align: center;
    padding: 2rem;
}
</style>
`,
  gatsby: `// Gatsby Page
import React from 'react';

const IndexPage = () => {
    return (
        <main style={{ textAlign: 'center', padding: '2rem' }}>
            <h1>Hello, Gatsby! 💜</h1>
            <p>Build blazing fast websites and apps.</p>
        </main>
    );
};

export default IndexPage;

export const Head = () => <title>Home | Gatsby</title>;
`,
  rails: `# Ruby on Rails Controller
class WelcomeController < ApplicationController
    def index
        render json: {
            message: "Hello, Ruby on Rails!",
            framework: "Rails",
            ruby_version: RUBY_VERSION
        }
    end

    def greet
        name = params[:name] || "World"
        render json: { greeting: "Hello, #{name}!" }
    end
end

# config/routes.rb:
# Rails.application.routes.draw do
#   root 'welcome#index'
#   get '/greet/:name', to: 'welcome#greet'
# end
`,
  laravel: `<?php
// Laravel Controller
namespace App\\Http\\Controllers;

use Illuminate\\Http\\Request;

class WelcomeController extends Controller
{
    public function index()
    {
        return response()->json([
            'message' => 'Hello, Laravel!',
            'framework' => 'Laravel',
            'php_version' => PHP_VERSION
        ]);
    }

    public function greet(string $name)
    {
        return response()->json([
            'greeting' => "Hello, {$name}!"
        ]);
    }
}
`,
};

/* ------------------------------------------------------------------ */
/*  Tech items per category                                            */
/* ------------------------------------------------------------------ */

const PROGRAMMING_LANGUAGES: TechItem[] = [
  // ── Initial 12 (visible by default) ────────────────────────────
  { id: 'python',      name: 'Python',     iconText: '🐍', iconBg: '#1e3a5f', iconColor: '#3b82f6', language: 'python',     filename: 'main.py',       starterCode: STARTER.python },
  { id: 'java',        name: 'Java',       iconText: '☕', iconBg: '#5c2d0e', iconColor: '#f97316', language: 'java',       filename: 'Main.java',     starterCode: STARTER.java },
  { id: 'c',           name: 'C',          iconText: 'C',  iconBg: '#1e3a5f', iconColor: '#60a5fa', language: 'c',          filename: 'main.c',        starterCode: STARTER.c },
  { id: 'cpp',         name: 'C++',        iconText: 'C+', iconBg: '#1a2f5a', iconColor: '#3b82f6', language: 'cpp',        filename: 'main.cpp',      starterCode: STARTER.cpp },
  { id: 'javascript',  name: 'JavaScript', iconText: 'JS', iconBg: '#4a3f0a', iconColor: '#fbbf24', language: 'javascript', filename: 'main.js',       starterCode: STARTER.javascript },
  { id: 'lua',         name: 'Lua',        iconText: '🌙', iconBg: '#1a1a4a', iconColor: '#818cf8', language: 'javascript', filename: 'main.lua',      starterCode: STARTER.lua },
  { id: 'php',         name: 'PHP',        iconText: 'php',iconBg: '#2d1f4e', iconColor: '#a78bfa', language: 'php',        filename: 'main.php',      starterCode: STARTER.php },
  { id: 'csharp',      name: 'C#',         iconText: 'C#', iconBg: '#2d1a4e', iconColor: '#a855f7', language: 'csharp',     filename: 'Program.cs',    starterCode: STARTER.csharp },
  { id: 'fastapi',     name: 'FastAPI',    iconText: '⚡', iconBg: '#0a3a2a', iconColor: '#34d399', language: 'python',     filename: 'fastapi_app.py',starterCode: STARTER.fastapi },
  { id: 'springboot',  name: 'Spring Boot',iconText: '🌿', iconBg: '#0f3a1f', iconColor: '#4ade80', language: 'java',       filename: 'Application.java', starterCode: STARTER.springboot },
  { id: 'tkinter',     name: 'Tkinter',    iconText: '🖌️', iconBg: '#1a2a3a', iconColor: '#94a3b8', language: 'python',     filename: 'tkinter_app.py',starterCode: STARTER.tkinter },
  { id: 'nodejs',      name: 'NodeJS',     iconText: '⬡',  iconBg: '#0a3a1a', iconColor: '#22c55e', language: 'javascript', filename: 'server.js',     starterCode: STARTER.nodejs },
  // ── Expandable extras ──────────────────────────────────────────
  { id: 'typescript',  name: 'TypeScript', iconText: 'TS', iconBg: '#1a2f5a', iconColor: '#3b82f6', language: 'typescript', filename: 'main.ts',       starterCode: STARTER.typescript },
  { id: 'go',          name: 'Go',         iconText: 'Go', iconBg: '#0a3a4a', iconColor: '#22d3ee', language: 'go',         filename: 'main.go',       starterCode: STARTER.go },
  { id: 'rust',        name: 'Rust',       iconText: '🦀', iconBg: '#3a1a0a', iconColor: '#f97316', language: 'rust',       filename: 'main.rs',       starterCode: STARTER.rust },
  { id: 'ruby',        name: 'Ruby',       iconText: '💎', iconBg: '#3a0a0a', iconColor: '#f87171', language: 'ruby',       filename: 'main.rb',       starterCode: STARTER.ruby },
  { id: 'kotlin',      name: 'Kotlin',     iconText: 'Kt', iconBg: '#2a1a4a', iconColor: '#a78bfa', language: 'kotlin',     filename: 'main.kt',       starterCode: STARTER.kotlin },
  { id: 'swift',       name: 'Swift',      iconText: '🐦', iconBg: '#3a1a0a', iconColor: '#fb923c', language: 'swift',      filename: 'main.swift',    starterCode: STARTER.swift },
  { id: 'sql',         name: 'SQL',        iconText: 'SQ', iconBg: '#3a0a0a', iconColor: '#f87171', language: 'sql',        filename: 'query.sql',     starterCode: STARTER.sql },
  { id: 'r',           name: 'R',          iconText: 'R',  iconBg: '#1a2a4a', iconColor: '#60a5fa', language: 'python',     filename: 'script.r',      starterCode: STARTER.r },
  { id: 'perl',        name: 'Perl',       iconText: '🐪', iconBg: '#2a2a3a', iconColor: '#94a3b8', language: 'ruby',       filename: 'script.pl',     starterCode: STARTER.perl },
  { id: 'scala',       name: 'Scala',      iconText: 'Sc', iconBg: '#3a0a0a', iconColor: '#f87171', language: 'java',       filename: 'Main.scala',    starterCode: STARTER.scala },
  { id: 'dart',        name: 'Dart',       iconText: '🎯', iconBg: '#0a2a4a', iconColor: '#38bdf8', language: 'javascript', filename: 'main.dart',     starterCode: STARTER.dart },
  { id: 'haskell',     name: 'Haskell',    iconText: 'λ',  iconBg: '#2a1a3a', iconColor: '#c084fc', language: 'python',     filename: 'Main.hs',       starterCode: STARTER.haskell },
  { id: 'elixir',      name: 'Elixir',     iconText: '💧', iconBg: '#2a1a3a', iconColor: '#a78bfa', language: 'ruby',       filename: 'hello.ex',      starterCode: STARTER.elixir },
  { id: 'julia',       name: 'Julia',      iconText: 'Ju', iconBg: '#1a2a1a', iconColor: '#4ade80', language: 'python',     filename: 'main.jl',       starterCode: STARTER.julia },
];

const WEB_LANGUAGES: TechItem[] = [
  // ── Initial 12 (visible by default) ────────────────────────────
  { id: 'html',         name: 'HTML',             iconText: '🌐', iconBg: '#3a1a0a', iconColor: '#fb923c', language: 'html',       filename: 'index.html',       starterCode: STARTER.html },
  { id: 'react',        name: 'React',            iconText: '⚛️',  iconBg: '#0a2a4a', iconColor: '#38bdf8', language: 'javascript', filename: 'App.jsx',          starterCode: STARTER.react },
  { id: 'vue',          name: 'Vue',              iconText: 'V',  iconBg: '#0a3a2a', iconColor: '#34d399', language: 'javascript', filename: 'App.vue.js',       starterCode: STARTER.vue },
  { id: 'angular',      name: 'Angular',          iconText: 'A',  iconBg: '#3a0a0a', iconColor: '#f87171', language: 'typescript', filename: 'app.component.ts', starterCode: STARTER.angular },
  { id: 'nextjs',       name: 'Next.js',          iconText: 'N',  iconBg: '#1a1a1a', iconColor: '#e5e5e5', language: 'typescript', filename: 'page.tsx',          starterCode: STARTER.nextjs },
  { id: 'svelte',       name: 'Svelte',           iconText: 'S',  iconBg: '#3a1a0a', iconColor: '#fb923c', language: 'javascript', filename: 'App.svelte.js',    starterCode: STARTER.svelte },
  { id: 'mui',          name: 'MUI',              iconText: 'M',  iconBg: '#0a1a3a', iconColor: '#60a5fa', language: 'javascript', filename: 'MuiApp.jsx',       starterCode: STARTER.mui },
  { id: 'chakra',       name: 'Chakra UI',        iconText: '⚡', iconBg: '#0a3a3a', iconColor: '#2dd4bf', language: 'javascript', filename: 'ChakraApp.jsx',    starterCode: STARTER.chakra },
  { id: 'shadcn',       name: 'shadcn',           iconText: '/',  iconBg: '#1a1a1a', iconColor: '#e5e5e5', language: 'typescript', filename: 'ShadcnPage.tsx',   starterCode: STARTER.shadcn },
  { id: 'mantine',      name: 'Mantine',          iconText: 'M',  iconBg: '#1a1a4a', iconColor: '#818cf8', language: 'javascript', filename: 'MantineApp.jsx',   starterCode: STARTER.mantine },
  { id: 'reactboot',    name: 'React Bootstrap',  iconText: 'RB', iconBg: '#1a1a4a', iconColor: '#818cf8', language: 'javascript', filename: 'BootstrapApp.jsx', starterCode: STARTER.reactBootstrap },
  { id: 'radix',        name: 'Radix UI',         iconText: 'R',  iconBg: '#1a1a1a', iconColor: '#e5e5e5', language: 'typescript', filename: 'RadixApp.tsx',     starterCode: STARTER.radix },
  // ── Expandable extras ──────────────────────────────────────────
  { id: 'css',          name: 'CSS',              iconText: '🎨', iconBg: '#0a1a3a', iconColor: '#3b82f6', language: 'css',        filename: 'styles.css',       starterCode: STARTER.css },
  { id: 'django',       name: 'Django',           iconText: 'Dj', iconBg: '#0a2a1a', iconColor: '#22c55e', language: 'python',     filename: 'views.py',         starterCode: STARTER.django },
  { id: 'flask',        name: 'Flask',            iconText: 'Fl', iconBg: '#1a1a2a', iconColor: '#94a3b8', language: 'python',     filename: 'flask_app.py',     starterCode: STARTER.flask },
  { id: 'express',      name: 'Express',          iconText: 'Ex', iconBg: '#1a1a1a', iconColor: '#e5e5e5', language: 'javascript', filename: 'express_server.js',starterCode: STARTER.express },
  { id: 'jquery',       name: 'jQuery',           iconText: '$',  iconBg: '#0a2a4a', iconColor: '#38bdf8', language: 'javascript', filename: 'jquery_app.js',    starterCode: STARTER.jquery },
  { id: 'bootstrap',    name: 'Bootstrap',        iconText: 'B',  iconBg: '#2a1a4a', iconColor: '#a78bfa', language: 'html',       filename: 'bootstrap.html',   starterCode: STARTER.bootstrap },
  { id: 'tailwind',     name: 'Tailwind CSS',     iconText: '🌊', iconBg: '#0a2a3a', iconColor: '#38bdf8', language: 'html',       filename: 'tailwind.html',    starterCode: STARTER.tailwind },
  { id: 'nuxtjs',       name: 'Nuxt.js',          iconText: 'Nx', iconBg: '#0a3a2a', iconColor: '#34d399', language: 'javascript', filename: 'NuxtPage.js',      starterCode: STARTER.nuxtjs },
  { id: 'gatsby',       name: 'Gatsby',           iconText: 'G',  iconBg: '#2a1a3a', iconColor: '#c084fc', language: 'javascript', filename: 'GatsbyPage.jsx',   starterCode: STARTER.gatsby },
  { id: 'rails',        name: 'Rails',            iconText: '🛤️',  iconBg: '#3a0a0a', iconColor: '#f87171', language: 'ruby',       filename: 'welcome_controller.rb', starterCode: STARTER.rails },
  { id: 'laravel',      name: 'Laravel',          iconText: 'La', iconBg: '#3a0a1a', iconColor: '#fb7185', language: 'php',        filename: 'WelcomeController.php',  starterCode: STARTER.laravel },
];

const DATABASES: TechItem[] = [
  { id: 'db-sql',        name: 'SQL',        iconText: 'SQ', iconBg: '#3a1a0a', iconColor: '#fb923c', language: 'sql', filename: 'query.sql',        starterCode: STARTER.sql },
  { id: 'db-mongodb',    name: 'MongoDB',    iconText: '🍃', iconBg: '#0a3a1a', iconColor: '#4ade80', language: 'sql', filename: 'mongodb_queries.js', starterCode: STARTER.mongodb },
  { id: 'db-postgresql', name: 'PostgreSQL', iconText: '🐘', iconBg: '#0a1a3a', iconColor: '#60a5fa', language: 'sql', filename: 'postgres.sql',     starterCode: STARTER.postgresql },
  { id: 'db-mysql',      name: 'MySQL',      iconText: '🐬', iconBg: '#0a2a4a', iconColor: '#38bdf8', language: 'sql', filename: 'mysql.sql',        starterCode: STARTER.mysql },
  { id: 'db-sqlite',     name: 'SQLite',     iconText: 'SL', iconBg: '#0a1a2a', iconColor: '#6ee7b7', language: 'sql', filename: 'sqlite.sql',       starterCode: STARTER.sqlite },
  { id: 'db-redis',      name: 'Redis',      iconText: '◆',  iconBg: '#3a0a0a', iconColor: '#f87171', language: 'sql', filename: 'redis_commands.txt', starterCode: STARTER.redis },
];

const CATEGORIES: TechCategory[] = [
  {
    id: 'programming',
    name: 'Programming Languages',
    labelColor: '#818cf8',        // indigo/purple to match screenshot
    items: PROGRAMMING_LANGUAGES,
    initialVisible: 12,
  },
  {
    id: 'web',
    name: 'Web Languages',
    labelColor: '#f87171',        // red to match screenshot
    items: WEB_LANGUAGES,
    initialVisible: 12,
  },
  {
    id: 'databases',
    name: 'Databases',
    labelColor: '#fbbf24',        // amber
    items: DATABASES,
    initialVisible: 6,
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function LanguageChooserModal({
  isOpen,
  onClose,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: TechItem) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Auto-focus search on open
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setExpandedCategories({});
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Filter categories by search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return CATEGORIES;

    const q = searchQuery.toLowerCase();
    return CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q) ||
          item.filename.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.items.length > 0);
  }, [searchQuery]);

  const toggleCategory = (catId: string) => {
    setExpandedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: 'fadeIn 0.2s ease-out' }}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative z-10 w-full max-w-[900px] max-h-[85vh] mt-[5vh] mx-4 flex flex-col rounded-xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #13151b 0%, #0e1015 100%)',
          border: '1px solid #242833',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03) inset',
          animation: 'modalSlideIn 0.25s ease-out',
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-20 p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-[#242833] transition-colors"
          title="Close (Esc)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="px-6 pt-6 pb-3 text-center shrink-0">
          <h2
            className="text-xl font-bold tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #818cf8, #60a5fa, #38bdf8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Choose a Language to Get Started
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Pick your preferred programming language, web stack, or database to begin coding
          </p>
        </div>

        {/* Search */}
        <div className="px-6 pb-4 shrink-0">
          <div className="flex items-center gap-2.5 bg-[#181b22] border border-[#2a2e3a] rounded-lg px-3.5 py-2.5 focus-within:border-[#3b4252] transition-colors">
            <Search className="w-4 h-4 text-zinc-500 shrink-0" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search languages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none w-full"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6 min-h-0">
          {filteredCategories.length === 0 ? (
            <div className="text-center text-zinc-500 py-12 text-sm">
              No languages found matching &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            filteredCategories.map((cat) => {
              const isExpanded = !!expandedCategories[cat.id] || !!searchQuery.trim();
              const visibleItems = isExpanded ? cat.items : cat.items.slice(0, cat.initialVisible);
              const hiddenCount = cat.items.length - cat.initialVisible;

              return (
                <div key={cat.id}>
                  {/* Category Label */}
                  <div className="mb-3">
                    <span
                      className="text-xs font-bold uppercase tracking-wider"
                      style={{ color: cat.labelColor }}
                    >
                      {cat.name}
                    </span>
                  </div>

                  {/* Tile Grid */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                    {visibleItems.map((item) => {
                      const isHovered = hoveredId === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            onSelect(item);
                            onClose();
                          }}
                          onMouseEnter={() => setHoveredId(item.id)}
                          onMouseLeave={() => setHoveredId(null)}
                          className={cn(
                            'group flex flex-col items-center gap-2 p-3.5 rounded-xl border transition-all duration-200 text-center cursor-pointer',
                            isHovered
                              ? 'bg-[#1a2040] border-[#4f5ecc] shadow-lg shadow-indigo-950/40 scale-[1.03]'
                              : 'bg-[#181b22] border-[#242833] hover:border-[#3b4252]'
                          )}
                        >
                          {/* Icon */}
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-base font-bold transition-transform duration-200 group-hover:scale-110"
                            style={{
                              backgroundColor: item.iconBg,
                              color: item.iconColor,
                              boxShadow: isHovered
                                ? `0 0 16px ${item.iconColor}30`
                                : 'none',
                            }}
                          >
                            <span className="leading-none">{item.iconText}</span>
                          </div>

                          {/* Name */}
                          <span
                            className={cn(
                              'text-[11px] font-medium leading-tight truncate w-full transition-colors',
                              isHovered ? 'text-white' : 'text-zinc-400'
                            )}
                          >
                            {item.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Show More / Less */}
                  {hiddenCount > 0 && !searchQuery.trim() && (
                    <div className="mt-3 flex justify-center">
                      <button
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-1 px-3 rounded-full hover:bg-[#181b22]"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            Show Less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            Show {hiddenCount} More
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}} />
    </div>
  );
}
