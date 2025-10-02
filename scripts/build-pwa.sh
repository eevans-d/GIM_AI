#!/bin/bash

# PROMPT 22: FRONTEND & MOBILE PWA - BUILD SCRIPT
# Optimizes PWA for production deployment

set -e

echo "================================"
echo "GIM_AI PWA BUILD & OPTIMIZATION"
echo "================================"
echo ""

# Configuration
BUILD_DIR="${BUILD_DIR:-./frontend/dist}"
PWA_DIR="${PWA_DIR:-./frontend/pwa}"
ASSETS_DIR="${BUILD_DIR}/assets"
ICONS_DIR="${BUILD_DIR}/icons"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ============================================
# STEP 1: Pre-build validation
# ============================================

echo -e "${YELLOW}[1/8] Pre-build validation...${NC}"

# Check required files
REQUIRED_FILES=(
  "${PWA_DIR}/manifest.json"
  "${PWA_DIR}/service-worker.js"
  "${PWA_DIR}/push-notifications.js"
  "${PWA_DIR}/offline-handler.js"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo -e "${RED}✗ Missing required file: $file${NC}"
    exit 1
  fi
done

echo -e "${GREEN}✓ All required PWA files present${NC}"

# ============================================
# STEP 2: Clean build directory
# ============================================

echo -e "${YELLOW}[2/8] Cleaning build directory...${NC}"

if [ -d "$BUILD_DIR" ]; then
  rm -rf "$BUILD_DIR"
fi

mkdir -p "$BUILD_DIR"
mkdir -p "$ASSETS_DIR"
mkdir -p "$ICONS_DIR"

echo -e "${GREEN}✓ Build directory prepared${NC}"

# ============================================
# STEP 3: Install dependencies
# ============================================

echo -e "${YELLOW}[3/8] Installing build dependencies...${NC}"

if ! command -v terser &> /dev/null; then
  echo "Installing terser for JS minification..."
  npm install -g terser
fi

if ! command -v csso &> /dev/null; then
  echo "Installing csso-cli for CSS minification..."
  npm install -g csso-cli
fi

echo -e "${GREEN}✓ Build dependencies installed${NC}"

# ============================================
# STEP 4: Minify JavaScript
# ============================================

echo -e "${YELLOW}[4/8] Minifying JavaScript...${NC}"

JS_FILES=(
  "${PWA_DIR}/service-worker.js"
  "${PWA_DIR}/push-notifications.js"
  "${PWA_DIR}/offline-handler.js"
  "./frontend/utils/performance-optimizer.js"
  "./frontend/utils/responsive-utils.js"
)

total_original_size=0
total_minified_size=0

for js_file in "${JS_FILES[@]}"; do
  if [ -f "$js_file" ]; then
    filename=$(basename "$js_file")
    output_file="${BUILD_DIR}/${filename}"
    
    # Get original size
    original_size=$(stat -c%s "$js_file" 2>/dev/null || stat -f%z "$js_file" 2>/dev/null)
    total_original_size=$((total_original_size + original_size))
    
    # Minify
    terser "$js_file" \
      --compress \
      --mangle \
      --output "$output_file" \
      --comments false
    
    # Get minified size
    minified_size=$(stat -c%s "$output_file" 2>/dev/null || stat -f%z "$output_file" 2>/dev/null)
    total_minified_size=$((total_minified_size + minified_size))
    
    reduction=$(( (original_size - minified_size) * 100 / original_size ))
    
    echo "  ${filename}: $(( original_size / 1024 ))KB → $(( minified_size / 1024 ))KB (-${reduction}%)"
  fi
done

echo -e "${GREEN}✓ JavaScript minified: $(( total_original_size / 1024 ))KB → $(( total_minified_size / 1024 ))KB${NC}"

# ============================================
# STEP 5: Optimize manifest.json
# ============================================

echo -e "${YELLOW}[5/8] Optimizing manifest.json...${NC}"

# Copy and minify manifest (remove whitespace)
if command -v jq &> /dev/null; then
  jq -c '.' "${PWA_DIR}/manifest.json" > "${BUILD_DIR}/manifest.json"
  echo -e "${GREEN}✓ Manifest optimized with jq${NC}"
else
  # Fallback: just copy
  cp "${PWA_DIR}/manifest.json" "${BUILD_DIR}/manifest.json"
  echo -e "${YELLOW}⚠ jq not found, manifest copied without optimization${NC}"
fi

# ============================================
# STEP 6: Generate icon variants
# ============================================

echo -e "${YELLOW}[6/8] Generating icon variants...${NC}"

# Check if ImageMagick is installed
if command -v convert &> /dev/null; then
  # Source icon (should be 512x512)
  SOURCE_ICON="./frontend/assets/icon-512x512.png"
  
  if [ -f "$SOURCE_ICON" ]; then
    SIZES=(72 96 128 144 152 192 384 512)
    
    for size in "${SIZES[@]}"; do
      convert "$SOURCE_ICON" \
        -resize "${size}x${size}" \
        -strip \
        -quality 85 \
        "${ICONS_DIR}/icon-${size}x${size}.png"
      
      echo "  Generated: icon-${size}x${size}.png"
    done
    
    echo -e "${GREEN}✓ Icon variants generated${NC}"
  else
    echo -e "${YELLOW}⚠ Source icon not found: $SOURCE_ICON${NC}"
  fi
else
  echo -e "${YELLOW}⚠ ImageMagick not found, skipping icon generation${NC}"
fi

# ============================================
# STEP 7: Generate offline page
# ============================================

echo -e "${YELLOW}[7/8] Generating offline page...${NC}"

cat > "${BUILD_DIR}/offline.html" << 'EOF'
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sin Conexión - GIM_AI</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-align: center;
      padding: 20px;
    }
    .container {
      max-width: 400px;
    }
    .icon {
      font-size: 80px;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 28px;
      margin-bottom: 10px;
    }
    p {
      font-size: 16px;
      margin-bottom: 30px;
      opacity: 0.9;
    }
    .btn {
      background: white;
      color: #667eea;
      padding: 12px 32px;
      border-radius: 25px;
      text-decoration: none;
      display: inline-block;
      font-weight: 600;
      transition: transform 0.2s;
    }
    .btn:hover {
      transform: scale(1.05);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">📡</div>
    <h1>Sin Conexión</h1>
    <p>Parece que no tienes conexión a Internet. Por favor, verifica tu conexión e intenta nuevamente.</p>
    <a href="/" class="btn" onclick="location.reload(); return false;">Reintentar</a>
  </div>
  <script>
    // Auto-reload when back online
    window.addEventListener('online', () => {
      location.reload();
    });
  </script>
</body>
</html>
EOF

echo -e "${GREEN}✓ Offline page generated${NC}"

# ============================================
# STEP 8: Generate cache-busting hashes
# ============================================

echo -e "${YELLOW}[8/8] Generating cache-busting hashes...${NC}"

# Generate hash for service worker (force update)
if command -v md5sum &> /dev/null; then
  HASH=$(md5sum "${BUILD_DIR}/service-worker.js" | cut -d' ' -f1 | head -c 8)
elif command -v md5 &> /dev/null; then
  HASH=$(md5 -q "${BUILD_DIR}/service-worker.js" | head -c 8)
else
  HASH=$(date +%s)
fi

# Add version comment to service worker
echo "// Build: ${HASH} - $(date)" >> "${BUILD_DIR}/service-worker.js"

echo -e "${GREEN}✓ Cache-busting hash: ${HASH}${NC}"

# ============================================
# BUILD SUMMARY
# ============================================

echo ""
echo "================================"
echo -e "${GREEN}BUILD COMPLETED SUCCESSFULLY${NC}"
echo "================================"
echo ""
echo "Build directory: ${BUILD_DIR}"
echo "Service Worker: service-worker.js (${HASH})"
echo "Manifest: manifest.json"
echo "Offline page: offline.html"
echo ""

# Calculate total build size
BUILD_SIZE=$(du -sh "$BUILD_DIR" | cut -f1)
echo "Total build size: ${BUILD_SIZE}"

# Show next steps
echo ""
echo "Next steps:"
echo "1. Deploy ${BUILD_DIR} to your web server"
echo "2. Ensure HTTPS is enabled (required for PWA)"
echo "3. Register service worker in your main app"
echo "4. Test with Lighthouse PWA audit"
echo ""

# Generate deployment checklist
cat > "${BUILD_DIR}/DEPLOYMENT_CHECKLIST.md" << 'EOF'
# PWA Deployment Checklist

## Pre-Deployment

- [ ] HTTPS enabled on server
- [ ] Service worker registered in main app
- [ ] Manifest linked in HTML (`<link rel="manifest" href="/manifest.json">`)
- [ ] Meta tags present (viewport, theme-color)
- [ ] Icons uploaded to correct directories
- [ ] Offline page accessible at /offline.html

## Testing

- [ ] Lighthouse PWA audit score > 90
- [ ] Service worker installs correctly
- [ ] Offline functionality works
- [ ] Push notifications work (if enabled)
- [ ] App installs on mobile devices
- [ ] Icons display correctly in app drawer

## Performance

- [ ] First Contentful Paint < 2s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Time to Interactive < 3.5s
- [ ] Cumulative Layout Shift < 0.1

## Post-Deployment

- [ ] Monitor service worker updates
- [ ] Track installation metrics
- [ ] Monitor error rates
- [ ] Verify push notification delivery

## Security

- [ ] VAPID keys configured (for push)
- [ ] Content Security Policy configured
- [ ] CORS headers properly set
- [ ] API endpoints secured
EOF

echo -e "${GREEN}✓ Deployment checklist generated${NC}"
echo ""
