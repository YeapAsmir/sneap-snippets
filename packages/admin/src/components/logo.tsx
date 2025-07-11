import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 120, className }) => {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      className={className}
    >
      <mask id="mask__marble" maskUnits="userSpaceOnUse" x="0" y="0" width="80" height="80">
        <rect width="80" height="80" rx="160" fill="white" />
      </mask>
      <g mask="url(#mask__marble)">
        <rect width="80" height="80" rx="2" fill="#9283DD" />
        <path
          filter="url(#prefix__filter0_f)"
          d="M32.414 59.35L50.376 70.5H72.5v-71H33.728L26.5 13.381l19.057 27.08L32.414 59.35z"
          fill="#F4B7B3"
          transform="translate(-2 2) rotate(-226 40 40) scale(1.5)"
        />
        <path
          filter="url(#prefix__filter0_f)"
          style={{ mixBlendMode: 'overlay' }}
          d="M22.216 24L0 46.75l14.108 38.129L78 86l-3.081-59.276-22.378 4.005 12.972 20.186-23.35 27.395L22.215 24z"
          fill="#F5E794"
          transform="translate(7 7) rotate(159 40 40) scale(1.5)"
        />
      </g>
      <defs>
        <filter id="prefix__filter0_f" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="7" result="effect1_foregroundBlur" />
        </filter>
      </defs>
    </svg>
  );
};

export default Logo;