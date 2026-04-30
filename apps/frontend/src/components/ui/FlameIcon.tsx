import React from 'react';

export interface FlameIconProps {
  width?: number;
  height?: number;
  className?: string;
}

const FlameIcon: React.FC<FlameIconProps> = ({ 
  width = 52, 
  height = 64, 
  className 
}) => {
  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 52 64" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path 
        d="M26 4C26 4 14 20 14 34C14 41.7 19.5 48 26 50C32.5 48 38 41.7 38 34C38 20 26 4 26 4Z" 
        fill="#F5C010"
      />
      <path 
        d="M26 4C26 4 20 16 20 28C20 34 22.5 40 26 44C29.5 40 32 34 32 28C32 16 26 4 26 4Z" 
        fill="#FFE040"
      />
      <path 
        d="M18 28C18 28 10 38 12 46C13.5 52 19 56 26 58C33 56 38.5 52 40 46C42 38 34 28 34 28C34 28 32 36 26 40C20 36 18 28 18 28Z" 
        fill="#F28C1A"
      />
      <path 
        d="M22 38C22 38 20 44 24 50C24.8 51.2 25.4 52 26 52.5C26.6 52 27.2 51.2 28 50C32 44 30 38 30 38C30 38 28 42 26 44C24 42 22 38 22 38Z" 
        fill="#E8231A"
      />
    </svg>
  );
};

export default FlameIcon;
