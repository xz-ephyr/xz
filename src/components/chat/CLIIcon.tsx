import React from 'react';

interface CLIIconProps {
  cliId: string;
  size?: number;
  className?: string;
}

function OpenCodeIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="3" fill="#6366f1" />
      <path d="M5 5l3 3-3 3M11 5L8 8l3 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CodexIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" fill="#10a37f" />
      <path d="M5.5 8l2 2.5 3-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClaudeIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="4" fill="#d97706" />
      <circle cx="8" cy="8" r="3" fill="#fff" />
      <circle cx="8" cy="8" r="1.5" fill="#d97706" />
    </svg>
  );
}

function AiderIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="3" fill="#2563eb" />
      <path d="M4 8h8M8 4v8" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function AGYIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="3" fill="#ea4335" />
      <text x="8" y="11" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#fff">G</text>
    </svg>
  );
}

function DefaultCLIIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="3" fill="#a3a3a3" />
      <path d="M4 5l4 3-4 3M12 5l-4 3 4 3" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ICONS: Record<string, (size: number) => React.ReactElement> = {
  opencode: (s) => <OpenCodeIcon size={s} />,
  codex: (s) => <CodexIcon size={s} />,
  claude: (s) => <ClaudeIcon size={s} />,
  aider: (s) => <AiderIcon size={s} />,
  agy: (s) => <AGYIcon size={s} />,
};

export function CLIIcon({ cliId, size = 14, className = '' }: CLIIconProps) {
  const render = ICONS[cliId] || DefaultCLIIcon;
  return <span className={className}>{render(size)}</span>;
}
