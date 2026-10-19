import React from 'react';

interface Props {
  runtime: 'python' | 'node' | 'nodejs' | string;
  className?: string;
  showText?: boolean;
  version?: string;
}

export const RuntimeLogo: React.FC<Props> = ({
  runtime,
  className = 'w-4 h-4',
  showText = false,
  version
}) => {
  const isPy = runtime?.toLowerCase().includes('python') || runtime === 'py';
  const logoUrl = isPy
    ? 'https://raw.githubusercontent.com/devicons/devicon/master/icons/python/python-original.svg'
    : 'https://raw.githubusercontent.com/devicons/devicon/master/icons/nodejs/nodejs-original.svg';

  return (
    <div className="inline-flex items-center gap-1.5 shrink-0">
      <img
        src={logoUrl}
        alt={isPy ? 'Python' : 'Node.js'}
        className={`${className} object-contain shrink-0 drop-shadow-[0_0_4px_rgba(255,255,255,0.25)]`}
      />
      {showText && (
        <span className="font-mono text-xs font-semibold tracking-wide">
          {isPy ? 'Python' : 'Node.js'} {version || ''}
        </span>
      )}
    </div>
  );
};
