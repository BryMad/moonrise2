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
- **Mobile Responsive**: Glassmorphism UI with purple gradient theme (NEEDS REDESIGN)

### Current Status: ✅ PRODUCTION READY

- All core features working perfectly
- Professional astronomical accuracy tested against almanac APIs
- Smart location autocomplete with dropdown suggestions
- Bedtime feature fully implemented and tested
- Calendar export with 20-minute events and 15-minute alerts
- Recently refactored for proper hosting practices (removed hardcoded backend URLs)

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
- Frontend: http://localhost:5177 (with API proxy)

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

### Bedtime Feature (✅ NEWLY IMPLEMENTED)

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
- **Current Theme**: Glassmorphism with purple gradient theme (NEEDS REDESIGN - see task below)

## 4. CODE PATTERNS & CONVENTIONS

### UI/UX Style Guide

**⚠️ CURRENT THEME NEEDS COMPLETE REDESIGN - See CSS Redesign Task Below**
**Current Color Scheme**: Purple/indigo gradient background (`from-indigo-900 via-purple-900 to-pink-800`) - TO BE REPLACED
**Target Theme**: Subtle astronomical with black/white/cosmic colors and modern fonts

### Tailwind Patterns (TO BE UPDATED)

```css
/* ⚠️ THESE PATTERNS NEED REDESIGN - Currently purple theme */
/* Primary containers - NEEDS BLACK/WHITE REDESIGN */
bg-white/10 backdrop-blur-md rounded-lg p-6

/* Input fields - NEEDS ASTRONOMICAL STYLING */
px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:ring-2 focus:ring-purple-400

/* Buttons - NEEDS NIGHT SKY STYLING */
bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors

/* Text hierarchy - NEEDS MODERN FONTS WITH OPTIONAL TITLE FONT */
text-4xl font-bold text-white           # Main heading
text-2xl font-bold text-white           # Section heading
text-sm font-medium text-white          # Labels
text-purple-200                         # Secondary text - REMOVE PURPLE
text-purple-300 text-xs                 # Helper text - REMOVE PURPLE
```

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
npm run dev:frontend   # Port 5177

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
- ✅ Frontend running on port 5177
- ✅ API proxy configured in Vite
- ✅ All astronomical calculations working
- ✅ Location autocomplete working
- ✅ Calendar export working
- ✅ **Bedtime feature fully implemented and tested**
- ✅ Production build tested and working
- ✅ No hardcoded URLs (recently fixed)
- ⚠️ **URGENT**: CSS theme needs complete redesign (see task below)

---

## 🎯 NEW FEATURE IMPLEMENTATION REQUEST

### **REFINED TASK: Subtle Astronomical Theme Redesign**

**Current Issue**: Previous attempts have been either too purple-heavy or too vintage/retro. Need a balanced approach that maintains modern usability while adding subtle astronomical character.

### Design Philosophy

Create a **modern, clean interface** with **subtle nods to astronomy and night sky** themes. Think contemporary space apps (like NASA's modern interfaces) rather than vintage 70s sci-fi. Maintain the sophisticated glassmorphism aesthetic while shifting toward night sky colors.

### Feature Description

Refine the current design by:

- Keeping the modern glassmorphism UI structure
- Shifting color palette toward night sky/astronomical themes (blacks, whites, subtle cosmic accents)
- Adding a clean futuristic title font (NOT retro/calculator style)
- Maintaining excellent readability and contemporary feel
- **CRITICAL**: Preserve all existing copy/text content exactly as-is

### Requirements

#### Color Scheme (Subtle Shift)

- **Background**: Transition from purple gradient → deep night sky gradient (dark blues/blacks)
- **Glass panels**: Keep glassmorphism effect but with darker, more astronomical tones
- **Text**: Maintain excellent readability with clean whites/light colors
- **Accents**: Subtle cosmic colors allowed (moon silver, starlight blue, deep space teal)
- **Remove**: Bright purples/pinks, but keep the sophisticated modern feel

#### Typography (Minimal Changes)

- **Body text/UI**: Keep current modern, readable fonts (NO retro calculator fonts)
- **Title only**: Optionally use a clean, modern futuristic font like Microgramma/Eurostile style
  - Must be: Clean, readable, contemporary (not vintage/retro)
  - Style: Modern sci-fi (think SpaceX, NASA 2020s, not 1970s)
- **All other text**: Keep existing fonts for maximum readability

#### Visual Design (Evolutionary, Not Revolutionary)

- **Maintain**: Glassmorphism aesthetic, rounded corners, backdrop blur effects
- **Keep**: Current layout structure, spacing, component hierarchy
- **Enhance**: Subtle astronomical touches without becoming themed/gimmicky
- **Preserve**: Professional tool aesthetic, not a space game

#### Critical Requirements

- **DO NOT modify any text content, copy, or wording**
- **DO NOT change layout structure or component positioning**
- **DO NOT add space-themed imagery or decorative elements**
- **DO maintain responsive design and accessibility**
- **DO keep the sophisticated, professional tone**

### Integration Points

- **Preserve exactly**: All functionality, user flows, API integration
- **Maintain exactly**: Component structure, responsive behavior
- **Keep exactly**: All text content, explanatory copy, button labels
- **Update only**: Color values and potentially title font in `App.jsx`

### Success Criteria

- [ ] Subtle shift toward night sky/astronomical color palette
- [ ] Maintains modern, professional appearance (not themed/retro)
- [ ] Glassmorphism effects preserved and enhanced
- [ ] Excellent readability maintained or improved
- [ ] **Zero changes to any text content or copy**
- [ ] All existing functionality works identically
- [ ] Responsive design functions across all devices
- [ ] Feels like a sophisticated astronomy tool, not a space game
- [ ] Clean, contemporary aesthetic with subtle cosmic character

### Files to Modify

- `frontend/src/App.jsx` - Update color classes only (and optionally title font)
- **DO NOT modify**: Any text strings, labels, descriptions, or copy content
- **Focus on**: Tailwind color classes (`bg-`, `text-`, `border-`, etc.)

### Reference Aesthetic

Think: Modern NASA interfaces, SpaceX mission control, contemporary astronomy software, professional planetarium apps - clean, sophisticated, subtly cosmic, highly readable.

---

## 📋 IMPLEMENTATION CHECKLIST

When implementing new features, follow this pattern:

### Frontend Changes

- [ ] ⚠️ **PRIORITY**: Implement subtle astronomical theme (see refined task above)
- [ ] Maintain glassmorphism aesthetic with night sky color palette
- [ ] Preserve all existing text content and copy exactly
- [ ] Keep modern, readable fonts (except optionally title font)
- [ ] Maintain responsive design and functionality
- [ ] Focus only on color class updates in Tailwind CSS

### Backend Changes

- [ ] Add appropriate API endpoints
- [ ] Include proper error handling and validation
- [ ] Maintain existing astronomical accuracy
- [ ] Add helpful error messages
- [ ] Update health check if needed

### Testing

- [ ] Test in development mode (ports 3001/5177)
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
