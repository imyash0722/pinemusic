import React from 'react';

interface PineappleGuitarLogoProps {
  className?: string;
  size?: number;
}

export const PineappleGuitarLogo: React.FC<PineappleGuitarLogoProps> = ({
  className = "w-6 h-6",
  size = 28,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Crown / Top Foliage - Abstract Cubist Fronds */}
      <path
        d="M24 3L22 10L24 8.5L26 10L24 3Z"
        fill="#5c8d6d"
        stroke="#8fb99b"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M21 4.5L16 11L20 10.5L21 4.5Z"
        fill="#4a7558"
        stroke="#7ca989"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M27 4.5L32 11L28 10.5L27 4.5Z"
        fill="#4a7558"
        stroke="#7ca989"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M18 7L13 13L17 12.5L18 7Z"
        fill="#395943"
        stroke="#658c71"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path
        d="M30 7L35 13L31 12.5L30 7Z"
        fill="#395943"
        stroke="#658c71"
        strokeWidth="1"
        strokeLinejoin="round"
      />

      {/* Pineapple Torso - Abstract Faceted Diamond Silhouette */}
      <path
        d="M17 13C13 18 13 29 17 38C20 42 28 42 31 38C35 29 35 18 31 13C28 11 20 11 17 13Z"
        fill="#1c231e"
        stroke="#4a7558"
        strokeWidth="1.5"
      />

      {/* Facet lines on Pineapple Body (Matte geometric texture) */}
      <path
        d="M15 20L21 27M27 15L33 22M15 28L23 37M27 34L32 29"
        stroke="#334d3c"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d="M33 20L27 27M21 15L15 22M33 28L25 37M21 34L16 29"
        stroke="#334d3c"
        strokeWidth="1"
        strokeLinecap="round"
      />

      {/* Abstract Guitar Neck & Headstock (Slanted at ~38 deg across Pineapple) */}
      {/* Neck */}
      <line
        x1="10"
        y1="36"
        x2="38"
        y2="14"
        stroke="#d1a054"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* Frets */}
      <line x1="28" y1="20" x2="31" y2="24" stroke="#e8c282" strokeWidth="1" />
      <line x1="24" y1="23" x2="27" y2="27" stroke="#e8c282" strokeWidth="1" />
      <line x1="20" y1="26" x2="23" y2="30" stroke="#e8c282" strokeWidth="1" />
      
      {/* Headstock & Pegs */}
      <path
        d="M37 15L42 11L40 9L35 13Z"
        fill="#b8833b"
        stroke="#e8c282"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <circle cx="38" cy="10" r="0.8" fill="#f5dfb8" />
      <circle cx="41" cy="12" r="0.8" fill="#f5dfb8" />

      {/* Abstract Guitar Body (Cubist Geometric Curves & Cutaways) */}
      <path
        d="M12 32C9 35 10 40 14 42C18 44 23 42 24 38C25 35 22 33 20 33C17 33 14 29 12 32Z"
        fill="#261d15"
        stroke="#d1a054"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Guitar Soundhole / Pickup */}
      <circle cx="17.5" cy="36.5" r="2.2" fill="#0c0e12" stroke="#e8c282" strokeWidth="0.8" />

      {/* Abstract Strumming Arm / Pick Stroke */}
      <path
        d="M23 30C21 33 18 35 16 35"
        stroke="#8fb99b"
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* Sound / Rhythm Waves radiating from guitar */}
      <path
        d="M8 29C6 32 6 36 9 39"
        stroke="#658c71"
        strokeWidth="1"
        strokeLinecap="round"
        strokeDasharray="2 2"
      />
      <path
        d="M6 26C3 31 3 39 8 43"
        stroke="#4a7558"
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeDasharray="2 3"
      />
    </svg>
  );
};
