import React from 'react';

// Simple ANSI color code parser for terminal rendering
export interface AnsiToken {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}

export function parseAnsi(input: string): AnsiToken[] {
  if (!input) return [];

  // Match ANSI escape sequences
  const regex = /\x1b\[([0-9;]*)m/g;
  const tokens: AnsiToken[] = [];
  let lastIndex = 0;
  let currentClass = '';
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    const textBefore = input.slice(lastIndex, match.index);
    if (textBefore) {
      tokens.push({ text: textBefore, className: currentClass });
    }

    const codes = match[1].split(';').map(c => parseInt(c, 10) || 0);
    for (const code of codes) {
      if (code === 0) {
        currentClass = '';
      } else if (code === 1) {
        currentClass += ' font-bold';
      } else if (code === 30) {
        currentClass = 'text-zinc-500';
      } else if (code === 31) {
        currentClass = 'text-rose-400 font-medium';
      } else if (code === 32) {
        currentClass = 'text-emerald-400 font-medium';
      } else if (code === 33) {
        currentClass = 'text-amber-300 font-medium';
      } else if (code === 34) {
        currentClass = 'text-sky-400 font-medium';
      } else if (code === 35) {
        currentClass = 'text-purple-400 font-medium';
      } else if (code === 36) {
        currentClass = 'text-cyan-300 font-medium';
      } else if (code === 37) {
        currentClass = 'text-zinc-200';
      } else if (code === 90) {
        currentClass = 'text-zinc-500';
      }
    }

    lastIndex = regex.lastIndex;
  }

  const remaining = input.slice(lastIndex);
  if (remaining) {
    tokens.push({ text: remaining, className: currentClass });
  }

  return tokens;
}
