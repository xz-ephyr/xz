import React from 'react';

interface ThinScrollbarProps {
  children: React.ReactNode;
  className?: string;
  direction?: 'vertical' | 'horizontal' | 'both';
}

export const ThinScrollbar = ({ children, className = '', direction = 'vertical' }: ThinScrollbarProps) => {
  const overflow = direction === 'both' ? 'overflow-auto'
    : direction === 'horizontal' ? 'overflow-x-auto'
    : 'overflow-y-auto';
  return <div className={`thin-scrollbar ${overflow} ${className}`}>{children}</div>;
};
