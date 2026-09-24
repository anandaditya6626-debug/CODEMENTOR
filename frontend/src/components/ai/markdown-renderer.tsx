'use client';

import React from 'react';

export function MarkdownRenderer({ content }: { content: string }) {
  // A simple markdown renderer
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  
  let inCodeBlock = false;
  let codeBlockContent = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${i}`} className="bg-zinc-800 p-3 rounded-md overflow-x-auto my-2 text-sm font-mono text-zinc-100">
            <code>{codeBlockContent}</code>
          </pre>
        );
        inCodeBlock = false;
        codeBlockContent = '';
      } else {
        inCodeBlock = true;
      }
      continue;
    }
    
    if (inCodeBlock) {
      codeBlockContent += line + '\n';
      continue;
    }
    
    if (line.trim() === '') {
      elements.push(<br key={`br-${i}`} />);
      continue;
    }
    
    if (line.startsWith('### ')) {
      elements.push(<h3 key={`h3-${i}`} className="text-lg font-semibold mt-4 mb-2">{formatInline(line.substring(4))}</h3>);
      continue;
    }
    
    if (line.startsWith('## ')) {
      elements.push(<h2 key={`h2-${i}`} className="text-xl font-bold mt-5 mb-3">{formatInline(line.substring(3))}</h2>);
      continue;
    }
    
    if (line.startsWith('# ')) {
      elements.push(<h1 key={`h1-${i}`} className="text-2xl font-bold mt-6 mb-4">{formatInline(line.substring(2))}</h1>);
      continue;
    }
    
    if (line.trim().startsWith('- ')) {
      elements.push(<li key={`li-${i}`} className="ml-4 list-disc my-1">{formatInline(line.trim().substring(2))}</li>);
      continue;
    }
    
    if (line.match(/^\d+\.\s/)) {
      const match = line.match(/^\d+\.\s/);
      const text = line.substring(match![0].length);
      elements.push(<li key={`li-${i}`} className="ml-4 list-decimal my-1">{formatInline(text)}</li>);
      continue;
    }
    
    elements.push(<p key={`p-${i}`} className="my-1">{formatInline(line)}</p>);
  }
  
  if (inCodeBlock) {
    elements.push(
      <pre key={`code-end`} className="bg-zinc-800 p-3 rounded-md overflow-x-auto my-2 text-sm font-mono text-zinc-100">
        <code>{codeBlockContent}</code>
      </pre>
    );
  }
  
  return <div className="text-zinc-200 text-sm leading-relaxed space-y-1">{elements}</div>;
}

function formatInline(text: string): React.ReactNode[] {
  // Handle bold, italic, and inline code
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-semibold text-white">{part.substring(2, part.length - 2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index} className="italic">{part.substring(1, part.length - 1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index} className="bg-zinc-800 text-indigo-300 px-1.5 py-0.5 rounded font-mono text-xs">{part.substring(1, part.length - 1)}</code>;
    }
    return <span key={index}>{part}</span>;
  });
}
