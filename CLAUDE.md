# Moonrise Tracker - Project Guide for AI Assistants

## Project Overview
Moonrise Tracker is a professional astronomical web application that helps users track moonrise times during nighttime hours. It's designed for astronomy enthusiasts, photographers, and anyone interested in observing the moon when it rises after sunset.

## Tech Stack

### Backend (Node.js/Express)
- **Express.js** - Web framework
- **astronomy-engine** - JPL-validated astronomical calculations (primary)
- **suncalc** - Lightweight astronomical calculations (fallback)
- **meeusjs** - Jean Meeus astronomical algorithms
- **ipgeolocation.io API** - Geocoding service
- **geo-tz** - Timezone detection

### Frontend (React + Vite)
- **React 19.1.0** - UI library
- **Vite** - Build tool
- **Tailwind CSS v4** - Styling (using new @tailwindcss/vite plugin)
- **Lucide React** - Icon library

## Project Structure
```
moonrise2/
├── backend/
│   ├── server.js        # Express API server (port 3001 in dev)
│   └── package.json     # Backend dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx      # Main React component
│   │   ├── main.jsx     # React entry point
│   │   ├── index.css    # Tailwind imports
│   │   └── config/
│   │       └── api.js   # API configuration
│   ├── public/          # Static assets
│   ├── dist/            # Build output
│   └── vite.config.js   # Vite configuration
└── package.json         # Root package with build scripts
```

## Development Commands

### Start Development Servers
```bash
# Backend (port 3001)
cd backend && npm run dev

# Frontend (port 5177)
cd frontend && npm run dev
```

### Build for Production
```bash
# From root directory
npm run build  # Builds both backend and frontend
```

### Start Production Server
```bash
npm start  # Serves backend with built frontend
```

## Key API Endpoints
- `/api/astronomy-calculated` - Main endpoint for moonrise calculations
- `/api/location-search` - Location autocomplete
- `/api/health` - Health check

## Important Features
1. **Location Input**: Supports ZIP codes, city names, and addresses with smart autocomplete
2. **Astronomical Precision**: Multiple calculation engines with JPL-validated accuracy
3. **User Features**: Bedtime selection, date ranges, calendar export (.ics)
4. **Beautiful UI**: Dark theme with animated starfield background

## Development Notes
- Frontend dev server runs on port 5177
- Backend API runs on port 3001 in development
- In production, backend serves frontend from `/dist`
- Environment handling via dotenv
- CORS is configured for development

## Common Tasks

### Adding New Features
1. For UI changes, work in `frontend/src/App.jsx`
2. For API changes, modify `backend/server.js`
3. Always test with various location formats

### Testing
- Test with different location inputs (ZIP codes, cities, addresses)
- Verify moonrise calculations across different timezones
- Check calendar export functionality

### Deployment
- Configured for platforms like Render
- Build scripts handle both frontend and backend
- Static files served from backend in production

## Code Style
- React functional components with hooks
- Async/await for asynchronous operations
- Comprehensive error handling with user-friendly messages
- Timezone-aware date calculations

## Important Considerations
- Always handle timezone conversions properly
- Maintain astronomical calculation accuracy
- Keep the UI responsive and user-friendly
- Test edge cases (polar regions, date boundaries)