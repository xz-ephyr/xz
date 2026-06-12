import React from 'react';

interface ThinScrollbarProps {
  children: React.ReactNode;
  className?: string;
}

export const ThinScrollbar = ({ children, className = "" }: ThinScrollbarProps) => (
  <div className={`thin-scrollbar overflow-y-auto ${className}`}>
    {children}
  </div>
);
