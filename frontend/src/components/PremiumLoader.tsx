import React from 'react';

interface PremiumLoaderProps {
  text?: string;
}

export default function PremiumLoader({ text = 'Loading...' }: PremiumLoaderProps) {
  return (
    <div className="premium-loader-wrapper fade-in">
      <div className="premium-loader">
        <div className="premium-loader-circle"></div>
        <div className="premium-loader-circle"></div>
        <div className="premium-loader-circle"></div>
      </div>
      <div className="premium-loader-text">{text}</div>
    </div>
  );
}
