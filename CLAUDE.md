# Moonrise App - Development Context

## Project Overview
A React-based web application that calculates and displays upcoming moonrise times based on user location, date range, and bedtime preferences. The app helps users find moonrises that occur during nighttime hours (after sunset, before bedtime) for optimal viewing.

## Tech Stack
- **Frontend**: React with Tailwind CSS
- **Backend**: Node.js/Express
- **Astronomy Libraries**: Astronomy Engine, MeeusJs, SunCalc (fallback)
- **APIs**: Geoapify and IPGeolocation for location search

## Key Files
- `/frontend/src/App.jsx` - Main React component
- `/backend/server.js` - Express server with astronomy calculations
- Package.json files in both frontend/ and backend/ directories

## Design Theme
Space/moon/NASA aesthetic with black/white/grey color scheme:
- Headers use `text-blue-300` for celestial blue accent
- Buttons use grey backgrounds (`bg-slate-700`) with blue text (`text-blue-300`)

## Recent Fixes Completed (2025-06-24)

### UI Improvements
1. **Header styling**: Increased font size from `text-sm` to `text-lg` and changed color to `text-blue-300` for better distinction
2. **Button spacing**: Added divider and proper spacing above "Get Upcoming Moonrises" button
3. **Search dropdown cleanup**: Removed redundant "Found via [search input]" text and pin icon

### Critical Moon Phase Bug Fixes
**MAJOR FIX**: Moon phases were completely inverted in calculations
- **Root cause**: Astronomy Engine uses -180° to +180° phase angle convention, not 0° to 360°
- **Fixed phase angle conversion** in backend (line 170): `(moonIllum.phase_angle + 180) / 360`
- Fixed `getMoonPhaseName()` function in both frontend and backend
- Fixed `getMoonPhaseIcon()` function in frontend
- **Correct ranges now**:
  - 0.00-0.03 or 0.97-1.00 = New Moon 🌑
  - 0.03-0.22 = Waxing Crescent 🌒
  - 0.22-0.28 = First Quarter 🌓
  - 0.28-0.47 = Waxing Gibbous 🌔
  - 0.47-0.53 = Full Moon 🌕
  - 0.53-0.72 = Waning Gibbous 🌖
  - 0.72-0.78 = Last Quarter 🌗
  - 0.78-0.97 = Waning Crescent 🌘

**Impact**: 
- Events showing "New Moon • 100% illuminated" now correctly show "Full Moon • 100% illuminated"
- All moon phases now match astronomical almanacs
- Verified against July 2025 almanac data

## Development Commands
- Frontend: `cd frontend && npm start`
- Backend: `cd backend && npm start`
- Check package.json files for available scripts

## Architecture Notes
- Location search uses multiple APIs for better coverage
- Moon phase calculations use three astronomy libraries for accuracy
- Nighttime filtering ensures moonrises only show between sunset and bedtime
- All moon phases are included (no filtering by phase type)

## Current Status
App is functional with all major moon phase calculation bugs resolved. UI improvements completed for better visual hierarchy.

## Next Feature To Work On
[PLACEHOLDER - Add your next feature request here]

## Known Issues
None currently identified.

## Testing Notes
Always verify moon phase accuracy against astronomical almanacs when making calculation changes.