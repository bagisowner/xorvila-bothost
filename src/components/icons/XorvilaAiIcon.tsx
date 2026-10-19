import React from 'react';

interface Props {
  className?: string;
}

export const XorvilaAiIcon: React.FC<Props> = ({ className = 'w-4 h-4' }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="xorvilaAiGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A855F7" />
          <stop offset="0.5" stopColor="#6366F1" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      {/* Outer Hexagonal Shield */}
      <path
        d="M12 2.5L20 7.1V16.9L12 21.5L4 16.9V7.1L12 2.5Z"
        stroke="url(#xorvilaAiGrad)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Central Neural 'X' Nexus */}
      <path
        d="M8.5 8.5L15.5 15.5M15.5 8.5L8.5 15.5"
        stroke="url(#xorvilaAiGrad)"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      {/* Central Core & Satellite Nodes */}
      <circle cx="12" cy="12" r="1.8" fill="#22D3EE" />
      <circle cx="8.5" cy="8.5" r="1" fill="#C084FC" />
      <circle cx="15.5" cy="15.5" r="1" fill="#22D3EE" />
      <circle cx="15.5" cy="8.5" r="1" fill="#C084FC" />
      <circle cx="8.5" cy="15.5" r="1" fill="#22D3EE" />
    </svg>
  );
};
