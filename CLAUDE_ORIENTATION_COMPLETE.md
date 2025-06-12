# Moonrise Tracker App - Complete Claude Orientation Guide

## 1. PROJECT OVERVIEW

### What the App Does
The Moonrise Tracker is a professional web application that calculates **nighttime moonrise events** with astronomical accuracy. It helps users find when the moon rises after sunset for optimal viewing and photography. The app filters out daytime moonrises to show only those visible during nighttime hours.

### Key Features
- **Smart Location Search**: ZIP codes, cities, addresses with real-time autocomplete
- **Professional Astronomy**: JPL-validated calculations (±1 arcminute accuracy)
- **Date Range Processing**: Default 3 months + custom ranges
- **Bedtime Feature**: Smart filtering based on user's bedtime preferences
- **Calendar Export**: ICS files compatible with Google Calendar, Apple Calendar, Outlook
- **Mobile Responsive**: Night sky theme with glassmorphism UI and starfield background

### Current Status: ✅ PRODUCTION READY
- All core features working perfectly
- Professional astronomical accuracy tested against almanac APIs
- Smart location autocomplete with dropdown suggestions
- Bedtime feature fully implemented and tested
- Calendar export with 20-minute events and 15-minute alerts
- Recently refactored for proper hosting practices (removed hardcoded backend URLs)
- **NEW**: Enhanced with beautiful starfield background and night sky astronomical theme

## 2. TECHNICAL ARCHITECTURE

### Tech Stack
**Frontend**: React 19.1.0 + Vite 6.3.5 + Tailwind CSS 4.1.8
**Backend**: Node.js + Express 4.19.2
**Astronomy**: astronomy-engine (JPL-validated) + SunCalc (fallback)
**APIs**: IPGeolocation API for location resolution

### File Structure
```
moonrise2/
├── package.json                    # Root-level scripts and dependencies
├── DEPLOYMENT.md                   # Comprehensive deployment guide
├── IMPLEMENTATION_SUMMARY.md       # Recent changes documentation
├── backend/
│   ├── server.js                   # Main Express server (1580+ lines)
│   ├── package.json                # Backend dependencies
│   └── .env                        # API keys (IPGEOLOCATION_API_KEY)
├── frontend/
│   ├── src/
│   │   ├── App.jsx                 # Main React component (660+ lines)
│   │   └── config/api.js           # API configuration utility
│   ├── dist/                       # Production build output
│   ├── public/assets/              # Static assets (moon images)
│   ├── .env                        # Frontend environment variables
│   ├── package.json                # Frontend dependencies
│   └── vite.config.js              # Build config with proxy
└── .gitignore                      # Enhanced exclusions
```

### Key API Endpoints
- `POST /api/astronomy-calculated` - **Primary moonrise calculation endpoint**
- `POST /api/location-search` - Smart autocomplete for locations
- `POST /api/astronomy` - Single-day astronomy data
- `GET /api/health` - Backend status check
- `GET /api/compare-all-libraries/:zipCode/:date` - Compare calculation methods

### Environment Configuration
**Development**:
- Backend: http://localhost:3001
- Frontend: http://localhost:5182 (with API proxy)

**Production**:
- Single server serves both frontend and API
- Environment auto-detection via `NODE_ENV`
- Static files served from `frontend/dist`

## 3. CURRENT WORKING FEATURES ✅

### Location System (Recently Enhanced)
- **Smart Autocomplete**: Real-time dropdown with location suggestions
- **ZIP Code Support**: Full/partial ZIP codes (7 → regional, 75205 → exact)
- **City Support**: "Austin", "Los Angeles, CA", international cities
- **Logic**: Numbers = ZIP codes, Letters = Cities
- **Debouncing**: 300ms delay, keyboard navigation (arrows, enter, escape)

### Astronomical Calculations
- **Primary**: Astronomy Engine (JPL-validated, ±1 arcminute accuracy)
- **Fallback**: SunCalc library for reliability
- **Accuracy**: Professional-grade, tested against almanac APIs
- **Data**: Moonrise, moonset, sunrise, sunset, moon phase, illumination

### Date Range Processing
- **Default**: Next 3 months from today
- **Custom**: User-selectable date ranges (max 3 years)
- **Filtering**: Smart bedtime-based filtering (see Bedtime Feature below)
- **Performance**: ~500ms for 90-day calculations

### Bedtime Feature (✅ FULLY IMPLEMENTED)
- **Smart Filtering**: `sunset < moonrise < bedtime` (instead of sunrise)
- **Dropdown Options**: 9:00 PM - 5:00 AM in 30-minute increments
- **Default**: 11:00 PM (23:00) - recommended for most users
- **Backward Compatibility**: "Until Sunrise" option maintains original behavior
- **Logic**: Handles both same-day and next-day bedtimes correctly
- **Purpose**: Prevents 3-5 AM calendar alerts that wake users up
- **Backend Integration**: Fully implemented in filtering logic
- **Testing**: Verified with Austin, TX across multiple bedtime scenarios

### Calendar Export
- **Format**: ICS (iCalendar) files
- **Events**: 20-minute duration, 15-minute alerts
- **Data**: Moon phase info, illumination percentage, location
- **Compatible**: Google Calendar, Apple Calendar, Outlook
- **Personalized**: Respects user's bedtime preferences

### UI/UX Features
- **Responsive Design**: Works on desktop and mobile
- **Error Handling**: Graceful fallbacks and user-friendly messages
- **Real-time Search**: Live autocomplete with visual feedback
- **🌟 NEW: Astronomical Theme**: Night sky background with starfield effect
- **🌟 NEW: True Black Design**: Gradient from black to slate for astronomical feel

## 4. CODE PATTERNS & CONVENTIONS

### UI/UX Style Guide - CURRENT ASTRONOMICAL THEME
**Color Scheme**: Night sky with starfield background
- **Background**: `bg-gradient-to-tl from-black via-gray-900 to-slate-800`
- **Glass panels**: `bg-white/10 backdrop-blur-md border border-white/20`
- **Text colors**: `text-white`, `text-slate-300`, `text-slate-400`
- **Accents**: `text-blue-200`, `text-blue-400` for cosmic elements
- **Focus states**: `focus:ring-blue-400`

### Tailwind Patterns (CURRENT DESIGN)
```css
/* Primary containers */
bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20

/* Input fields */
px-4 py-2 rounded-lg bg-white/20 border border-slate-400/30 text-white placeholder-slate-300/60 focus:ring-2 focus:ring-blue-400

/* Buttons */
bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors border border-slate-500/30

/* Text hierarchy */
text-4xl font-bold text-white           # Main heading
text-2xl font-bold text-white           # Section heading  
text-sm font-medium text-white          # Labels
text-slate-300                          # Secondary text
text-slate-400 text-xs                  # Helper text
```

### Starfield Background (CURRENT IMPLEMENTATION)
- **40+ stars**: Positioned across 6 rows with scattered additional stars
- **Minimal animation**: Only 5 stars pulse to reduce computation
- **Colors**: White, blue-100, blue-200, slate tones for realistic variety
- **Opacity**: 40% for subtle background effect
- **Z-layering**: Starfield behind content, proper layering with glassmorphism

### React Patterns
- **State Management**: useState for local state, useRef for DOM references
- **API Calls**: Custom `apiFetch` utility from `config/api.js`
- **Error Handling**: Try-catch with user-friendly error messages
- **Loading States**: Boolean flags with spinner animations
- **Event Handling**: Debounced search, keyboard navigation

### Backend Patterns
- **Error Responses**: Consistent JSON format with helpful suggestions
- **Location Processing**: Flexible input handling (ZIP/city/address)
- **Astronomy Calculations**: Primary/fallback system for reliability
- **Environment Detection**: `NODE_ENV` for dev/production behavior

### Naming Conventions
- **Components**: PascalCase (`MoonriseTracker`)
- **Functions**: camelCase (`fetchUpcomingMoonrises`, `getMoonPhaseName`)
- **Variables**: camelCase (`locationInput`, `moonriseData`)
- **Files**: kebab-case (`api.js`), PascalCase for components (`App.jsx`)
- **CSS Classes**: Tailwind utilities, BEM-style for custom classes

## 5. DEVELOPMENT ENVIRONMENT

### Prerequisites
```bash
Node.js >= 18.0.0
npm >= 8.0.0
```

### File Locations
- **Backend**: `/Users/bryanmadole/moonrise2/backend/`
- **Frontend**: `/Users/bryanmadole/moonrise2/frontend/`
- **Main Backend File**: `backend/server.js`
- **Main Frontend File**: `frontend/src/App.jsx`
- **API Config**: `frontend/src/config/api.js`

### Development Commands
```bash
# Start both frontend and backend
npm run dev

# Individual servers
npm run dev:backend    # Port 3001
npm run dev:frontend   # Port 5182

# Production build
npm run build

# Production server
NODE_ENV=production npm start
```

### Dependencies (Key Ones)
**Backend**: express, astronomy-engine, suncalc, geo-tz, node-fetch, cors, dotenv
**Frontend**: react, vite, tailwindcss, lucide-react

### Environment Variables
**Backend** (`.env`):
```env
IPGEOLOCATION_API_KEY=your_api_key  # Required for location search
PORT=3001                           # Server port
NODE_ENV=development               # Environment
```

**Frontend** (`.env`):
```env
VITE_API_URL=http://localhost:3001  # Development API URL
```

### Testing Endpoints
```bash
# Health check
curl http://localhost:3001/api/health

# Test location search
curl -X POST http://localhost:3001/api/location-search \
  -H "Content-Type: application/json" \
  -d '{"query":"75205"}'

# Test moonrise calculation
curl -X POST http://localhost:3001/api/astronomy-calculated \
  -H "Content-Type: application/json" \
  -d '{"location":"Austin, TX"}'

# Test bedtime feature
curl -X POST http://localhost:3001/api/astronomy-calculated \
  -H "Content-Type: application/json" \
  -d '{"location":"Austin, TX", "bedtime":"23:00"}'
```

### Current Working State
- ✅ Backend running on port 3001
- ✅ Frontend running on port 5182
- ✅ API proxy configured in Vite
- ✅ All astronomical calculations working
- ✅ Location autocomplete working
- ✅ Calendar export working
- ✅ **Bedtime feature fully implemented and tested**
- ✅ Production build tested and working
- ✅ No hardcoded URLs (recently fixed)
- ✅ **NEW: Beautiful starfield background with 40+ stars**
- ✅ **NEW: Night sky astronomical theme with true black gradient**

---

## 🎯 IMPLEMENTATION CHECKLIST

When implementing new features, follow this pattern:

### Frontend Changes
- [ ] Maintain current night sky theme and starfield background
- [ ] Keep glassmorphism aesthetic with backdrop-blur effects
- [ ] Preserve all existing text content and copy exactly
- [ ] Use current color palette (blacks, slates, blues for accents)
- [ ] Maintain responsive design and functionality
- [ ] Focus on Tailwind color class updates

### Backend Changes  
- [ ] Add appropriate API endpoints
- [ ] Include proper error handling and validation
- [ ] Maintain existing astronomical accuracy
- [ ] Add helpful error messages
- [ ] Update health check if needed

### Testing
- [ ] Test in development mode (ports 3001/5182)
- [ ] Test production build
- [ ] Verify API endpoints work
- [ ] Check mobile responsiveness
- [ ] Validate error handling

### Documentation
- [ ] Update this orientation guide if needed
- [ ] Add comments for complex logic
- [ ] Update API endpoint documentation

---

This orientation should give any new Claude instance complete context to jump right into development without asking basic questions about the project structure, tech stack, or current functionality.