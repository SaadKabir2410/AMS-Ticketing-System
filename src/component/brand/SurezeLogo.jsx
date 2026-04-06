import React from "react";

export default function SurezeLogo({ className = "w-12 h-12" }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Background Glow */}
      <div className="absolute inset-0 bg-[#ec4899]/20 blur-xl rounded-full animate-pulse" />

      {/* SVG Icon */}
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 w-full h-full drop-shadow-2xl"
      >
        <defs>
          <linearGradient
            id="logo-gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <filter id="glass" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
          </filter>
        </defs>

        {/* Main Shape - Stylized 'S' and Shield hybrid */}
        <path
          d="M50 5L15 20V45C15 67.5 30 87.5 50 95C70 87.5 85 67.5 85 45V20L50 5Z"
          fill="url(#logo-gradient)"
          className="opacity-90"
        />

        {/* Inner Glass Detail */}
        <path
          d="M50 15L25 25V45C25 60 35 75 50 82C65 75 75 60 75 45V25L50 15Z"
          fill="white"
          fillOpacity="0.1"
          style={{ filter: "url(#glass)" }}
        />

        {/* Inner Accents */}
        <path
          d="M35 40C35 40 45 35 50 45C55 55 65 50 65 50"
          stroke="white"
          strokeWidth="6"
          strokeLinecap="round"
          className="opacity-80"
        />
        <circle cx="50" cy="50" r="3" fill="white" className="animate-pulse" />
      </svg>
    </div>
  );
}


