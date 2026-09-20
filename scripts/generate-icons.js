import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const publicDir = path.resolve(process.cwd(), 'public');

// 1. Scalable SVG Favicon (512x512)
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1c1917"/>
      <stop offset="50%" stop-color="#0c0a09"/>
      <stop offset="100%" stop-color="#1c1917"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="35%" stop-color="#f59e0b"/>
      <stop offset="70%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Background with rounded corners -->
  <rect x="16" y="16" width="480" height="480" rx="108" fill="url(#bgGrad)" stroke="url(#goldGrad)" stroke-width="8" />

  <!-- Seven Concentric Subtle Rings representing the 7 Layers -->
  <g opacity="0.25" stroke="#f59e0b" fill="none">
    <circle cx="256" cy="256" r="60" stroke-width="1.5" stroke-dasharray="4 4" />
    <circle cx="256" cy="256" r="85" stroke-width="1.5" />
    <circle cx="256" cy="256" r="110" stroke-width="1.5" stroke-dasharray="6 4" />
    <circle cx="256" cy="256" r="135" stroke-width="1.5" />
    <circle cx="256" cy="256" r="160" stroke-width="2" stroke-dasharray="8 6" />
    <circle cx="256" cy="256" r="185" stroke-width="2" />
    <circle cx="256" cy="256" r="210" stroke-width="2.5" stroke-dasharray="10 8" />
  </g>

  <!-- Small lock icon top right badge -->
  <g transform="translate(370, 75) scale(0.9)" opacity="0.9">
    <rect x="0" y="14" width="32" height="24" rx="5" fill="url(#goldGrad)" />
    <path d="M7 14V8a9 9 0 0 1 18 0v6" fill="none" stroke="url(#goldGrad)" stroke-width="4" stroke-linecap="round" />
    <circle cx="16" cy="25" r="3" fill="#1c1917" />
  </g>

  <!-- Center Arabic Letter "ع" in Calligraphic Amiri Style -->
  <text 
    x="256" 
    y="345" 
    text-anchor="middle" 
    font-family="'Amiri', 'Traditional Arabic', 'Scheherazade New', serif" 
    font-size="280" 
    font-weight="bold" 
    fill="url(#goldGrad)"
    filter="url(#glow)">ع</text>

  <!-- Bottom Subtitle / Number 7 dots -->
  <g fill="#f59e0b" opacity="0.8">
    <circle cx="166" cy="425" r="4" />
    <circle cx="196" cy="425" r="4" />
    <circle cx="226" cy="425" r="4" />
    <circle cx="256" cy="425" r="5.5" fill="#fef08a" />
    <circle cx="286" cy="425" r="4" />
    <circle cx="316" cy="425" r="4" />
    <circle cx="346" cy="425" r="4" />
  </g>
</svg>`;

// 2. OpenGraph Card SVG (1200x630) for WhatsApp & Social Sharing
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="ogBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0c0a09"/>
      <stop offset="50%" stop-color="#1c1917"/>
      <stop offset="100%" stop-color="#090807"/>
    </linearGradient>
    <linearGradient id="ogGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="40%" stop-color="#fbbf24"/>
      <stop offset="80%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#292524" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#1c1917" stop-opacity="0.95"/>
    </linearGradient>
    <radialGradient id="radialGlow" cx="75%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.25"/>
      <stop offset="50%" stop-color="#d97706" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <filter id="ogShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000000" flood-opacity="0.7"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#ogBg)"/>
  <rect width="1200" height="630" fill="url(#radialGlow)"/>

  <!-- Subtle Decorative Outer Border -->
  <rect x="24" y="24" width="1152" height="582" rx="28" fill="none" stroke="#44403c" stroke-width="2" stroke-opacity="0.5"/>
  <rect x="30" y="30" width="1140" height="570" rx="24" fill="none" stroke="url(#ogGold)" stroke-width="1.5" stroke-opacity="0.3"/>

  <!-- Right Visual Logo Medallion (Arabic Letter ع) -->
  <g transform="translate(800, 115)">
    <!-- Medallion Base -->
    <circle cx="200" cy="200" r="185" fill="url(#cardGrad)" stroke="url(#ogGold)" stroke-width="5" filter="url(#ogShadow)"/>

    <!-- 7 Concentric Rings -->
    <g opacity="0.3" stroke="#fbbf24" fill="none">
      <circle cx="200" cy="200" r="45" stroke-width="1.5" stroke-dasharray="4 4" />
      <circle cx="200" cy="200" r="68" stroke-width="1.5" />
      <circle cx="200" cy="200" r="92" stroke-width="1.5" stroke-dasharray="6 4" />
      <circle cx="200" cy="200" r="115" stroke-width="1.5" />
      <circle cx="200" cy="200" r="138" stroke-width="2" stroke-dasharray="8 6" />
      <circle cx="200" cy="200" r="158" stroke-width="2" />
      <circle cx="200" cy="200" r="176" stroke-width="2.5" stroke-dasharray="10 8" />
    </g>

    <!-- Center Calligraphic ع -->
    <text x="200" y="270" text-anchor="middle" font-family="'Amiri', serif" font-size="220" font-weight="bold" fill="url(#ogGold)">ع</text>

    <!-- 7 Dots under letter -->
    <g fill="#f59e0b" opacity="0.9">
      <circle cx="125" cy="335" r="4" />
      <circle cx="150" cy="335" r="4" />
      <circle cx="175" cy="335" r="4" />
      <circle cx="200" cy="335" r="5.5" fill="#fef08a" />
      <circle cx="225" cy="335" r="4" />
      <circle cx="250" cy="335" r="4" />
      <circle cx="275" cy="335" r="4" />
    </g>
  </g>

  <!-- Left Content (Right-to-Left Arabic text arranged for 1200x630) -->
  <g transform="translate(80, 130)">
    <!-- Category Badge -->
    <rect x="0" y="0" width="310" height="38" rx="19" fill="#292524" stroke="#d97706" stroke-width="1.5"/>
    <circle cx="20" cy="19" r="6" fill="#fbbf24"/>
    <text x="38" y="24" font-family="'Cairo', sans-serif" font-size="16" font-weight="bold" fill="#fef08a">نظام التشفير العربي للطبقات السبع</text>

    <!-- Main Title -->
    <text x="0" y="110" font-family="'Cairo', sans-serif" font-size="64" font-weight="900" fill="#ffffff" letter-spacing="-0.5">
      التشفير العربي
    </text>

    <!-- Subtitle / Value Proposition -->
    <text x="0" y="165" font-family="'Cairo', sans-serif" font-size="24" font-weight="700" fill="url(#ogGold)">
      تشفير وفك تشفير النصوص العربية بدقة وخوارزميات متناظرة
    </text>

    <text x="0" y="225" font-family="'Cairo', sans-serif" font-size="19" font-weight="500" fill="#d6d3d1">
      • توليد كافة الاحتمالات الممكنة وفك التشفير مع خيار العكس
    </text>
    <text x="0" y="260" font-family="'Cairo', sans-serif" font-size="19" font-weight="500" fill="#d6d3d1">
      • مطابقة فورية مع معجم مفردات القرآن الكريم ومصحف قرآن توب
    </text>
    <text x="0" y="295" font-family="'Cairo', sans-serif" font-size="19" font-weight="500" fill="#d6d3d1">
      • الفحص اللغوي مع المعجم العربي الشامل والتقسيم النوراني
    </text>

    <!-- Platform Badges (Google + GitHub) -->
    <g transform="translate(0, 345)">
      <!-- GitHub Badge -->
      <rect x="0" y="0" width="230" height="46" rx="12" fill="#1c1917" stroke="#57534e" stroke-width="1.5"/>
      <text x="35" y="29" font-family="'Cairo', sans-serif" font-size="16" font-weight="bold" fill="#ffffff">GitHub / HMcode</text>

      <!-- Google AI Studio Badge -->
      <rect x="250" y="0" width="240" height="46" rx="12" fill="#1c1917" stroke="#d97706" stroke-width="1.5"/>
      <text x="275" y="29" font-family="'Cairo', sans-serif" font-size="16" font-weight="bold" fill="#fef08a">Google / HMcode7</text>
    </g>
  </g>
</svg>`;

async function run() {
  console.log('Generating favicon & OpenGraph assets...');
  
  // Save SVG files
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSvg);
  fs.writeFileSync(path.join(publicDir, 'og-image.svg'), ogSvg);
  console.log('Saved favicon.svg and og-image.svg');

  // Generate PNGs using sharp
  await sharp(Buffer.from(faviconSvg))
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));

  await sharp(Buffer.from(faviconSvg))
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'icon-192.png'));

  await sharp(Buffer.from(faviconSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-512.png'));

  await sharp(Buffer.from(faviconSvg))
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  await sharp(Buffer.from(ogSvg))
    .resize(1200, 630)
    .png()
    .toFile(path.join(publicDir, 'og-image.png'));

  console.log('All image assets successfully generated in /public:');
  console.log('- favicon.svg');
  console.log('- favicon.png (32x32)');
  console.log('- apple-touch-icon.png (180x180)');
  console.log('- icon-192.png (192x192)');
  console.log('- icon-512.png (512x512)');
  console.log('- og-image.png (1200x630)');
}

run().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
