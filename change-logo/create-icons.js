const fs = require('fs');

// Create 192x192 SVG icon
const icon192 = `<svg width="192" height="192" xmlns="http://www.w3.org/2000/svg">
  <rect width="192" height="192" fill="#3b82f6" rx="32"/>
  <text x="96" y="130" font-size="100" text-anchor="middle" fill="white" font-family="Arial">🛡️</text>
</svg>`;

// Create 512x512 SVG icon  
const icon512 = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#3b82f6" rx="85"/>
  <text x="256" y="350" font-size="280" text-anchor="middle" fill="white" font-family="Arial">🛡️</text>
</svg>`;

fs.writeFileSync('/home/ubuntu/change-logo/public/icon-192.svg', icon192);
fs.writeFileSync('/home/ubuntu/change-logo/public/icon-512.svg', icon512);

console.log('✅ SVG icons created successfully');
