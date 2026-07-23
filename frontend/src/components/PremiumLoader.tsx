

interface PremiumLoaderProps {
  text?: string;
}

export default function PremiumLoader({ text = 'Loading...' }: PremiumLoaderProps) {
  return (
    <div className="premium-loader-wrapper fade-in">
      <div className="data-flow-grid">
        <div className="data-cube"></div>
        <div className="data-cube"></div>
        <div className="data-cube"></div>
        <div className="data-cube"></div>
        <div className="data-cube"></div>
        <div className="data-cube"></div>
        <div className="data-cube"></div>
        <div className="data-cube"></div>
        <div className="data-cube"></div>
      </div>
      <div className="premium-loader-text">{text}</div>
    </div>
  );
}
