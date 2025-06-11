const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // npm install node-fetch@2
const SunCalc = require('suncalc'); // npm install suncalc
const { find } = require('geo-tz'); // npm install geo-tz
const A = require('meeusjs'); // npm install meeusjs
const AstronomyEngine = require('astronomy-engine'); // npm install astronomy-engine
require('dotenv').config(); // npm install dotenv

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Your IPGeolocation API key (store in .env file)
const API_KEY = process.env.IPGEOLOCATION_API_KEY;

// Helper function to get lat/long from any location input (zip code, city, address, etc.)
const getLocationFromInput = async (locationInput) => {
    if (!API_KEY) {
        throw new Error('API key not configured');
    }

    if (!locationInput || !locationInput.trim()) {
        throw new Error('Location input is required');
    }

    let formattedLocation = locationInput.trim();
    
    // Handle different input formats
    if (/^\d{5}(-\d{4})?$/.test(formattedLocation)) {
        // US ZIP code - add country for better accuracy
        formattedLocation = `${formattedLocation}, US`;
    } else if (/^[a-zA-Z\s]+$/.test(formattedLocation) && !formattedLocation.includes(',')) {
        // Single word city name without state/country - keep as is to let API handle it
        // Examples: "Dallas", "Phoenix", "Miami"
        formattedLocation = formattedLocation;
    } else if (/^[a-zA-Z\s]+,\s*[a-zA-Z]{2}$/.test(formattedLocation)) {
        // City, State abbreviation (e.g., "Los Angeles, CA") - add US
        formattedLocation = `${formattedLocation}, US`;
    } else if (/^[a-zA-Z\s]+,\s*[a-zA-Z\s]+$/.test(formattedLocation) && 
               !formattedLocation.toLowerCase().includes('us') && 
               !formattedLocation.toLowerCase().includes('usa') && 
               !formattedLocation.toLowerCase().includes('united states')) {
        // City, State full name (e.g., "Austin, Texas") - add US if not already specified
        formattedLocation = `${formattedLocation}, US`;
    }
    // For addresses or international locations, use as-is

    console.log(`Location input: "${locationInput}" -> formatted: "${formattedLocation}"`);

    const url = `https://api.ipgeolocation.io/v2/astronomy?apiKey=${API_KEY}&location=${encodeURIComponent(formattedLocation)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Location lookup failed for "${formattedLocation}":`, errorText);
        throw new Error(`Location not found. Please check spelling and try: ZIP code (90210), City (Los Angeles), or City, State (Los Angeles, CA)`);
    }
    
    const data = await response.json();
    
    // Validate that we got location data
    if (!data.location || (!data.location.latitude && !data.location.longitude)) {
        throw new Error(`Invalid location data received for "${locationInput}"`);
    }
    
    return {
        latitude: parseFloat(data.location.latitude),
        longitude: parseFloat(data.location.longitude),
        city: data.location.city || data.location.location_string || locationInput,
        state: data.location.state_prov || '',
        country: data.location.country_name || 'Unknown',
        originalInput: locationInput,
        formattedLocation: formattedLocation
    };
};

// Backward compatibility alias
const getLocationFromZip = getLocationFromInput;

// Helper function to convert AstroTime to local time string
const astroTimeToLocalTime = (astroTime, lat, lng) => {
    if (!astroTime) return null;
    
    // Get timezone for the coordinates
    const timezones = find(lat, lng);
    const timezone = timezones[0];
    
    // Convert AstroTime to JavaScript Date
    const jsDate = astroTime.date;
    
    // Convert to local timezone string
    const localTimeString = jsDate.toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Handle 24:xx format
    const [hours, minutes] = localTimeString.split(':');
    const correctedHours = hours === '24' ? '00' : hours;
    
    return `${correctedHours}:${minutes}`;
};

// Helper function to get Astronomy Engine calculations
const getAstronomyEngineCalculations = (date, lat, lng) => {
    try {
        // Create observer location using correct API
        const observer = new AstronomyEngine.Observer(lat, lng, 0); // elevation in meters
        
        // Create AstroTime from date - but we need to be careful about local vs UTC date handling
        // The issue is likely that we're passing a Date that represents local midnight, 
        // but AstronomyEngine interprets it as UTC
        
        console.log(`Astronomy Engine: Input date: ${date.toISOString()}`);
        console.log(`Astronomy Engine: Local date string: ${date.toString()}`);
        
        // Create a date that represents local noon for the target date to avoid timezone issues
        const localDateString = date.toISOString().split('T')[0]; // Get YYYY-MM-DD
        const localNoon = new Date(localDateString + 'T12:00:00'); // Local noon
        
        console.log(`Astronomy Engine: Using search start time: ${localNoon.toISOString()}`);
        
        const astroTime = AstronomyEngine.MakeTime(localNoon);
        
        console.log(`Astronomy Engine: Calculating for ${localDateString} at ${lat}, ${lng}`);
        console.log(`AstroTime created:`, astroTime.toString());
        
        // Calculate sunrise and sunset (search within 1 day)
        // Direction: 1 = rise, -1 = set
        const sunrise = AstronomyEngine.SearchRiseSet(AstronomyEngine.Body.Sun, observer, 1, astroTime, 1.0);
        const sunset = AstronomyEngine.SearchRiseSet(AstronomyEngine.Body.Sun, observer, -1, astroTime, 1.0);
        
        // Calculate moonrise and moonset (search within 1 day)
        const moonrise = AstronomyEngine.SearchRiseSet(AstronomyEngine.Body.Moon, observer, 1, astroTime, 1.0);
        const moonset = AstronomyEngine.SearchRiseSet(AstronomyEngine.Body.Moon, observer, -1, astroTime, 1.0);
        
        console.log(`Astronomy Engine results:`, {
            sunrise: sunrise ? sunrise.toString() : 'null',
            sunset: sunset ? sunset.toString() : 'null', 
            moonrise: moonrise ? moonrise.toString() : 'null',
            moonset: moonset ? moonset.toString() : 'null'
        });
        
        // Calculate moon illumination
        const moonIllum = AstronomyEngine.Illumination(AstronomyEngine.Body.Moon, astroTime);
        console.log(`Moon illumination:`, moonIllum);
        
        return {
            sunrise: astroTimeToLocalTime(sunrise, lat, lng),
            sunset: astroTimeToLocalTime(sunset, lat, lng),
            moonrise: astroTimeToLocalTime(moonrise, lat, lng),
            moonset: astroTimeToLocalTime(moonset, lat, lng),
            moon_phase: moonIllum.phase_angle / 360, // Convert to 0-1 scale like SunCalc
            moon_illumination: (moonIllum.phase_fraction * 100).toFixed(1)
        };
    } catch (error) {
        console.error('Astronomy Engine calculation error:', error);
        console.error('Error stack:', error.stack);
        return null;
    }
};
        

// Helper function to format time from Date object to HH:MM format in local timezone
const formatTime = (date, lat, lng) => {
    if (!date || isNaN(date.getTime())) return null;
    
    // Get timezone for the coordinates
    const timezones = find(lat, lng);
    const timezone = timezones[0]; // Use first timezone (most accurate)
    
    // Use toLocaleTimeString with timezone to get local time
    const timeString = date.toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Handle 24:xx format by converting to 00:xx
    const [hours, minutes] = timeString.split(':');
    const correctedHours = hours === '24' ? '00' : hours;
    
    return `${correctedHours}:${minutes}`;
};

// Helper function to convert UTC seconds to local time string
const utcSecondsToLocalTime = (utcSeconds, lat, lng, date) => {
    if (!utcSeconds || isNaN(utcSeconds)) return null;
    
    // Get timezone for the coordinates
    const timezones = find(lat, lng);
    const timezone = timezones[0];
    
    // Parse the date string properly to avoid timezone confusion
    const [year, month, day] = date.toISOString().split('T')[0].split('-').map(Number);
    
    // Create a UTC date for the specific day at 00:00 UTC
    const utcMidnight = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    
    // Add the UTC seconds from MeeusJs to get the actual UTC time
    const utcDateTime = new Date(utcMidnight.getTime() + (utcSeconds * 1000));
    
    // Convert to local timezone (this automatically handles DST)
    const localTimeString = utcDateTime.toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Handle 24:xx format
    const [hours, minutes] = localTimeString.split(':');
    const correctedHours = hours === '24' ? '00' : hours;
    
    return `${correctedHours}:${minutes}`;
};

// Helper function to get MeeusJs calculations
const getMeeusCalculations = (date, lat, lng) => {
    try {
        const jdo = new A.JulianDay(date);
        const coord = A.EclCoord.fromWgs84(lat, lng, 0); // assuming sea level
        
        // Solar calculations
        const solarTimes = A.Solar.times(jdo, coord);
        const sunrise = utcSecondsToLocalTime(solarTimes.rise, lat, lng, date);
        const sunset = utcSecondsToLocalTime(solarTimes.set, lat, lng, date);
        
        // Lunar calculations
        const moonTimes = A.Moon.times(jdo, coord);
        const moonrise = utcSecondsToLocalTime(moonTimes.rise, lat, lng, date);
        const moonset = utcSecondsToLocalTime(moonTimes.set, lat, lng, date);
        
        // Moon phase and illumination
        const moonPos = A.Moon.topocentricPosition(jdo, coord, true);
        const sunPos = A.Solar.apparentTopocentric(jdo, coord);
        const phaseAngle = A.MoonIllum.phaseAngleEq2(moonPos.eq, sunPos);
        const illuminated = A.MoonIllum.illuminated(phaseAngle);
        
        return {
            sunrise,
            sunset,
            moonrise,
            moonset,
            moon_phase: phaseAngle / (2 * Math.PI), // Convert to 0-1 scale like SunCalc
            moon_illumination: (illuminated * 100).toFixed(1)
        };
    } catch (error) {
        console.error('MeeusJs calculation error:', error);
        return null;
    }
};

// Helper function to convert time string to minutes for comparison
const timeToMinutes = (timeString) => {
    if (!timeString) return 0;
    const [hours, minutes] = timeString.split(":").map(Number);
    return hours * 60 + minutes;
};

// Helper function to check if moonrise occurs during nighttime
const isNighttimeMoonrise = (sunsetTime, moonriseTime, sunriseTime) => {
    if (!sunsetTime || !moonriseTime || !sunriseTime) return false;
    
    // Convert to comparable format (minutes since midnight)
    const toMinutes = (date) => date.getHours() * 60 + date.getMinutes();
    
    const sunset = toMinutes(sunsetTime);
    const moonrise = toMinutes(moonriseTime);
    const sunrise = toMinutes(sunriseTime); // This is next day's sunrise
    
    // Check if moonrise is between sunset and midnight, or between midnight and sunrise
    return (moonrise >= sunset) || (moonrise <= sunrise);
};

// Helper function to get moon phase name from phase value
const getMoonPhaseName = (phase) => {
    if (phase < 0.1 || phase > 0.9) return "New Moon";
    if (phase >= 0.1 && phase < 0.25) return "Waxing Crescent";
    if (phase >= 0.25 && phase < 0.35) return "First Quarter";
    if (phase >= 0.35 && phase < 0.5) return "Waxing Gibbous";
    if (phase >= 0.5 && phase < 0.65) return "Full Moon";
    if (phase >= 0.65 && phase < 0.75) return "Waning Gibbous";
    if (phase >= 0.75 && phase < 0.9) return "Last Quarter";
    return "Waning Crescent";
};

// New calculated astronomy endpoint
app.post('/api/astronomy-calculated', async (req, res) => {
    try {
        const { zipCode, location, fromDate, toDate, days = 30 } = req.body;

        // Accept either 'zipCode' (backward compatibility) or 'location' parameter
        const locationInput = location || zipCode;
        
        if (!locationInput) {
            return res.status(400).json({ 
                error: 'Location is required',
                examples: 'Try: "90210", "Los Angeles", "Austin, TX", or "1600 Pennsylvania Ave, Washington DC"'
            });
        }

        console.log(`Calculating astronomy data for location: "${locationInput}", days: ${days}`);

        // Get location coordinates from input (supports zip codes, cities, addresses, etc.)
        const locationData = await getLocationFromInput(locationInput);
        console.log(`Location found: ${locationData.city}, ${locationData.state} (${locationData.latitude}, ${locationData.longitude})`);

        // Calculate date range - handle timezone issues properly
        let startDate, endDate;
        if (fromDate && toDate) {
            // Parse dates as local dates, not UTC
            // This prevents timezone offset issues
            startDate = new Date(fromDate + 'T00:00:00'); // Force local interpretation
            endDate = new Date(toDate + 'T00:00:00');
        } else {
            startDate = new Date();
            // Reset to start of local day
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + days);
        }

        // Limit to reasonable range (max 3 years)
        const maxDays = 365 * 3;
        const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        if (daysDiff > maxDays) {
            return res.status(400).json({ 
                error: `Date range too large. Maximum ${maxDays} days allowed.`,
                requestedDays: daysDiff 
            });
        }

        const events = [];
        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            // Create dateString in local timezone format
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const day = String(currentDate.getDate()).padStart(2, '0');
            const dateString = `${year}-${month}-${day}`;
            
            console.log(`Processing date: ${dateString} (currentDate: ${currentDate.toString()})`);
            
            // Calculate all astronomical data for this date using Astronomy Engine (primary)
            const astronomyEngineData = getAstronomyEngineCalculations(currentDate, locationData.latitude, locationData.longitude);
            
            // Fallback to SunCalc if Astronomy Engine fails
            let astronomicalData = astronomyEngineData;
            let calculationMethod = 'Astronomy Engine (JPL-validated, VSOP87-based)';
            
            if (!astronomyEngineData) {
                console.warn(`Astronomy Engine failed for ${dateString}, falling back to SunCalc`);
                const sunTimes = SunCalc.getTimes(currentDate, locationData.latitude, locationData.longitude);
                const moonTimes = SunCalc.getMoonTimes(currentDate, locationData.latitude, locationData.longitude);
                const moonIllumination = SunCalc.getMoonIllumination(currentDate);
                
                astronomicalData = {
                    sunrise: formatTime(sunTimes.sunrise, locationData.latitude, locationData.longitude),
                    sunset: formatTime(sunTimes.sunset, locationData.latitude, locationData.longitude),
                    moonrise: formatTime(moonTimes.rise, locationData.latitude, locationData.longitude),
                    moonset: formatTime(moonTimes.set, locationData.latitude, locationData.longitude),
                    moon_phase: moonIllumination.phase,
                    moon_illumination: (moonIllumination.fraction * 100).toFixed(1)
                };
                calculationMethod = 'SunCalc (fallback)';
            }

            // Check if we have valid moonrise and sunset times
            if (astronomicalData && astronomicalData.sunset && astronomicalData.moonrise) {
                // Get next day's sunrise for proper nighttime calculation
                const nextDay = new Date(currentDate);
                nextDay.setDate(nextDay.getDate() + 1);
                
                let nextSunrise;
                const nextMeeusData = getMeeusCalculations(nextDay, locationData.latitude, locationData.longitude);
                if (nextMeeusData && nextMeeusData.sunrise) {
                    nextSunrise = nextMeeusData.sunrise;
                } else {
                    const nextSunTimes = SunCalc.getTimes(nextDay, locationData.latitude, locationData.longitude);
                    nextSunrise = formatTime(nextSunTimes.sunrise, locationData.latitude, locationData.longitude);
                }
                
                // Check if this is a nighttime moonrise
                const sunsetTime = new Date(`${dateString}T${astronomicalData.sunset}:00`);
                const moonriseTime = new Date(`${dateString}T${astronomicalData.moonrise}:00`);
                const sunriseTime = new Date(`${nextDay.toISOString().split('T')[0]}T${nextSunrise}:00`);
                
                if (isNighttimeMoonrise(sunsetTime, moonriseTime, sunriseTime)) {
                    events.push({
                        date: dateString,
                        moonrise: astronomicalData.moonrise,
                        moonset: astronomicalData.moonset,
                        sunset: astronomicalData.sunset,
                        sunrise: nextSunrise,
                        moon_phase: astronomicalData.moon_phase,
                        moon_illumination: astronomicalData.moon_illumination,
                        moon_phase_name: getMoonPhaseName(astronomicalData.moon_phase),
                        calculation_method: calculationMethod,
                        calculated: true
                    });
                }
            }

            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
        }

        const result = {
            location: locationData.city,
            lat: locationData.latitude,
            long: locationData.longitude,
            country: locationData.country,
            state: locationData.state,
            zipCode: zipCode || null, // Keep for backward compatibility
            locationInput: locationInput, // New field showing what was entered
            originalInput: locationData.originalInput,
            formattedLocation: locationData.formattedLocation,
            totalEvents: events.length,
            daysSearched: daysDiff,
            dateRange: {
                from: startDate.toISOString().split('T')[0],
                to: endDate.toISOString().split('T')[0]
            },
            calculationMethod: 'Astronomy Engine (JPL-validated, VSOP87-based) with SunCalc fallback',
            accuracy: 'Professional-grade precision (±1 arcminute), tested against JPL Horizons',
            events: events
        };

        console.log(`Found ${events.length} nighttime moonrise events in ${daysDiff} days for ${locationData.city}, ${locationData.state}`);
        res.json(result);

    } catch (error) {
        console.error('Error in calculated astronomy:', error.message);
        res.status(500).json({
            error: 'Failed to calculate astronomy data',
            details: error.message,
            suggestion: 'Please check your location input. Try: ZIP code (90210), City (Los Angeles), or City, State (Los Angeles, CA)'
        });
    }
});

// Endpoint to get multiple dates of moonrise data
app.post('/api/astronomy-multi', async (req, res) => {
    try {
        const { zipCode, days = 90 } = req.body; // Default to 90 days (3 months)

        if (!zipCode) {
            return res.status(400).json({ error: 'Zip code is required' });
        }

        if (!API_KEY) {
            return res.status(500).json({ error: 'API key not configured' });
        }

        console.log(`Fetching data for ${days} days starting from zip code: ${zipCode}`);

        // Format location
        let formattedLocation = zipCode.trim();
        if (/^\d{5}(-\d{4})?$/.test(formattedLocation)) {
            formattedLocation = `${formattedLocation}, US`;
        }

        const moonriseEvents = [];
        let locationInfo = null;

        // Fetch data for the specified number of days
        for (let i = 0; i < Math.min(days, 365); i++) { // Cap at 365 days
            const date = new Date();
            date.setDate(date.getDate() + i);
            const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD

            console.log(`Day ${i}: Fetching data for ${dateString}`);

            try {
                const astroUrl = `https://api.ipgeolocation.io/v2/astronomy?apiKey=${API_KEY}&location=${encodeURIComponent(formattedLocation)}&date=${dateString}`;
                const astroResponse = await fetch(astroUrl);

                if (!astroResponse.ok) {
                    console.warn(`Failed to fetch data for ${dateString}: ${astroResponse.status}`);
                    continue;
                }

                const astroData = await astroResponse.json();
                
                // Store location info from first successful response
                if (!locationInfo && astroData.location) {
                    locationInfo = astroData.location;
                }

                // Check if moonrise and sunset exist and are valid times
                if (astroData.astronomy.moonrise && 
                    astroData.astronomy.sunset && 
                    astroData.astronomy.moonrise !== "-:-" && 
                    astroData.astronomy.sunset !== "-:-") {
                    
                    // Parse times to check if moonrise is after sunset
                    const moonriseTime = new Date(`${dateString}T${astroData.astronomy.moonrise}:00`);
                    const sunsetTime = new Date(`${dateString}T${astroData.astronomy.sunset}:00`);
                    const midnight = new Date(`${dateString}T23:59:59`);
                    
                    // Only include moonrises after sunset and before midnight (watchable at night)
                    if (moonriseTime > sunsetTime && moonriseTime <= midnight) {
                        moonriseEvents.push({
                            date: dateString,
                            moonrise: astroData.astronomy.moonrise,
                            sunset: astroData.astronomy.sunset,
                            sunrise: astroData.astronomy.sunrise,
                            moonset: astroData.astronomy.moonset,
                            moon_phase: astroData.astronomy.moon_phase,
                            moon_illumination: astroData.astronomy.moon_illumination_percentage,
                            datetime: moonriseTime.toISOString()
                        });
                    }
                }

                // Small delay to be respectful to the API
                await new Promise(resolve => setTimeout(resolve, 100));

            } catch (error) {
                console.warn(`Error fetching data for ${dateString}:`, error.message);
                continue;
            }
        }

        const result = {
            location: locationInfo ? (locationInfo.city || locationInfo.location_string) : formattedLocation,
            lat: locationInfo?.latitude,
            long: locationInfo?.longitude,
            country: locationInfo?.country_name,
            state: locationInfo?.state_prov,
            zipCode: zipCode,
            totalEvents: moonriseEvents.length,
            daysSearched: Math.min(days, 365),
            events: moonriseEvents
        };

        res.json(result);

    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({
            error: 'Failed to fetch astronomy data',
            details: error.message
        });
    }
});

// Endpoint to get astronomy data by location (supports zip codes, cities, addresses)
app.post('/api/astronomy', async (req, res) => {
    try {
        const { zipCode, location } = req.body;

        // Accept either 'zipCode' (backward compatibility) or 'location' parameter
        const locationInput = location || zipCode;

        if (!locationInput) {
            return res.status(400).json({ 
                error: 'Location is required',
                examples: 'Try: "90210", "Los Angeles", "Austin, TX", or "1600 Pennsylvania Ave, Washington DC"'
            });
        }

        if (!API_KEY) {
            return res.status(500).json({ error: 'API key not configured' });
        }

        console.log(`Fetching data for location: "${locationInput}"`);

        // Get location data using our flexible input handler
        const locationData = await getLocationFromInput(locationInput);
        console.log(`Location resolved: ${locationData.city}, ${locationData.state} (${locationData.latitude}, ${locationData.longitude})`);

        // Get today's date
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

        // Use v2/astronomy endpoint with the formatted location
        const astroUrl = `https://api.ipgeolocation.io/v2/astronomy?apiKey=${API_KEY}&location=${encodeURIComponent(locationData.formattedLocation)}&date=${today}`;
        console.log('API URL:', astroUrl);
        
        const astroResponse = await fetch(astroUrl);

        if (!astroResponse.ok) {
            const errorText = await astroResponse.text();
            console.error('API Error Response:', errorText);
            throw new Error(`Astronomy API failed: ${astroResponse.status} ${astroResponse.statusText}`);
        }

        const astroData = await astroResponse.json();
        console.log('Astronomy data:', astroData);

        // Return the data with enhanced location information
        const result = {
            sunrise: astroData.astronomy.sunrise,
            sunset: astroData.astronomy.sunset,
            moonrise: astroData.astronomy.moonrise,
            moonset: astroData.astronomy.moonset,
            moon_phase: astroData.astronomy.moon_phase,
            moon_illumination: astroData.astronomy.moon_illumination_percentage,
            location: locationData.city,
            lat: locationData.latitude,
            long: locationData.longitude,
            state: locationData.state,
            country: locationData.country,
            zipCode: zipCode || null, // Keep for backward compatibility
            locationInput: locationInput,
            originalInput: locationData.originalInput,
            formattedLocation: locationData.formattedLocation
        };

        res.json(result);

    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({
            error: 'Failed to fetch astronomy data',
            details: error.message,
            suggestion: 'Please check your location input. Try: ZIP code (90210), City (Los Angeles), or City, State (Los Angeles, CA)'
        });
    }
});

// Test endpoint to see raw API response
app.get('/api/test-raw/:zipCode', async (req, res) => {
    try {
        const { zipCode } = req.params;
        const API_KEY = process.env.IPGEOLOCATION_API_KEY;
        
        let formattedLocation = zipCode.trim();
        if (/^\d{5}(-\d{4})?$/.test(formattedLocation)) {
            formattedLocation = `${formattedLocation}, US`;
        }
        
        const today = new Date().toISOString().split('T')[0];
        const astroUrl = `https://api.ipgeolocation.io/v2/astronomy?apiKey=${API_KEY}&location=${encodeURIComponent(formattedLocation)}&date=${today}`;
        
        const response = await fetch(astroUrl);
        const data = await response.json();
        
        res.json({
            url: astroUrl,
            response: data,
            formatted_location: formattedLocation
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Test endpoint to compare calculated vs API results for any date
app.get('/api/test-calculation/:zipCode/:date', async (req, res) => {
    try {
        const { zipCode, date } = req.params;
        
        // Get both calculated and API data for the specified date
        const location = await getLocationFromZip(zipCode);
        const targetDate = new Date(date);
        const dateString = targetDate.toISOString().split('T')[0];
        
        // Calculated data
        const sunTimes = SunCalc.getTimes(targetDate, location.latitude, location.longitude);
        const moonTimes = SunCalc.getMoonTimes(targetDate, location.latitude, location.longitude);
        const moonIllumination = SunCalc.getMoonIllumination(targetDate);
        
        const calculated = {
            sunrise: formatTime(sunTimes.sunrise, location.latitude, location.longitude),
            sunset: formatTime(sunTimes.sunset, location.latitude, location.longitude),
            moonrise: formatTime(moonTimes.rise, location.latitude, location.longitude),
            moonset: formatTime(moonTimes.set, location.latitude, location.longitude),
            moon_phase: moonIllumination.phase,
            moon_illumination: (moonIllumination.fraction * 100).toFixed(1)
        };
        
        // API data (if available)
        let apiData = null;
        if (API_KEY) {
            try {
                let formattedLocation = zipCode.trim();
                if (/^\d{5}(-\d{4})?$/.test(formattedLocation)) {
                    formattedLocation = `${formattedLocation}, US`;
                }
                
                const astroUrl = `https://api.ipgeolocation.io/v2/astronomy?apiKey=${API_KEY}&location=${encodeURIComponent(formattedLocation)}&date=${dateString}`;
                const response = await fetch(astroUrl);
                
                if (response.ok) {
                    const data = await response.json();
                    apiData = {
                        sunrise: data.astronomy.sunrise,
                        sunset: data.astronomy.sunset,
                        moonrise: data.astronomy.moonrise,
                        moonset: data.astronomy.moonset,
                        moon_phase: data.astronomy.moon_phase,
                        moon_illumination: data.astronomy.moon_illumination_percentage
                    };
                }
            } catch (err) {
                console.warn('API comparison failed:', err.message);
            }
        }
        
        res.json({
            location: `${location.city}, ${location.state}`,
            coordinates: { lat: location.latitude, lng: location.longitude },
            date: dateString,
            calculated,
            api: apiData,
            comparison: apiData ? {
                sunrise_diff: apiData.sunrise && calculated.sunrise ? `${Math.abs(timeToMinutes(apiData.sunrise) - timeToMinutes(calculated.sunrise))} minutes` : 'One or both missing',
                sunset_diff: apiData.sunset && calculated.sunset ? `${Math.abs(timeToMinutes(apiData.sunset) - timeToMinutes(calculated.sunset))} minutes` : 'One or both missing',
                moonrise_diff: apiData.moonrise && calculated.moonrise ? `${Math.abs(timeToMinutes(apiData.moonrise) - timeToMinutes(calculated.moonrise))} minutes` : 'One or both missing'
            } : 'API data not available'
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Test endpoint for today (backward compatibility)
app.get('/api/test-calculation/:zipCode', async (req, res) => {
    try {
        const { zipCode } = req.params;
        
        // Get both calculated and API data for today
        const location = await getLocationFromZip(zipCode);
        const today = new Date();
        const dateString = today.toISOString().split('T')[0];
        
        // Calculated data
        const sunTimes = SunCalc.getTimes(today, location.latitude, location.longitude);
        const moonTimes = SunCalc.getMoonTimes(today, location.latitude, location.longitude);
        const moonIllumination = SunCalc.getMoonIllumination(today);
        
        const calculated = {
            sunrise: formatTime(sunTimes.sunrise, location.latitude, location.longitude),
            sunset: formatTime(sunTimes.sunset, location.latitude, location.longitude),
            moonrise: formatTime(moonTimes.rise, location.latitude, location.longitude),
            moonset: formatTime(moonTimes.set, location.latitude, location.longitude),
            moon_phase: moonIllumination.phase,
            moon_illumination: (moonIllumination.fraction * 100).toFixed(1)
        };
        
        // API data (if available)
        let apiData = null;
        if (API_KEY) {
            try {
                let formattedLocation = zipCode.trim();
                if (/^\d{5}(-\d{4})?$/.test(formattedLocation)) {
                    formattedLocation = `${formattedLocation}, US`;
                }
                
                const astroUrl = `https://api.ipgeolocation.io/v2/astronomy?apiKey=${API_KEY}&location=${encodeURIComponent(formattedLocation)}&date=${dateString}`;
                const response = await fetch(astroUrl);
                
                if (response.ok) {
                    const data = await response.json();
                    apiData = {
                        sunrise: data.astronomy.sunrise,
                        sunset: data.astronomy.sunset,
                        moonrise: data.astronomy.moonrise,
                        moonset: data.astronomy.moonset,
                        moon_phase: data.astronomy.moon_phase,
                        moon_illumination: data.astronomy.moon_illumination_percentage
                    };
                }
            } catch (err) {
                console.warn('API comparison failed:', err.message);
            }
        }
        
        res.json({
            location: `${location.city}, ${location.state}`,
            coordinates: { lat: location.latitude, lng: location.longitude },
            date: dateString,
            calculated,
            api: apiData,
            comparison: apiData ? {
                sunrise_diff: apiData.sunrise && calculated.sunrise ? `${Math.abs(timeToMinutes(apiData.sunrise) - timeToMinutes(calculated.sunrise))} minutes` : 'One or both missing',
                sunset_diff: apiData.sunset && calculated.sunset ? `${Math.abs(timeToMinutes(apiData.sunset) - timeToMinutes(calculated.sunset))} minutes` : 'One or both missing',
                moonrise_diff: apiData.moonrise && calculated.moonrise ? `${Math.abs(timeToMinutes(apiData.moonrise) - timeToMinutes(calculated.moonrise))} minutes` : 'One or both missing'
            } : 'API data not available'
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Enhanced astronomy endpoint with detailed calculation methods
app.post('/api/astronomy-calculated-detailed', async (req, res) => {
    try {
        const { zipCode, fromDate, toDate, days = 30 } = req.body;

        if (!zipCode) {
            return res.status(400).json({ error: 'Zip code is required' });
        }

        console.log(`Calculating detailed astronomy data for ${zipCode}, days: ${days}`);

        // Get location coordinates from zip code (single API call)
        const location = await getLocationFromZip(zipCode);
        console.log(`Location found: ${location.city}, ${location.state} (${location.latitude}, ${location.longitude})`);

        // Calculate date range - handle timezone issues properly
        let startDate, endDate;
        if (fromDate && toDate) {
            // Parse dates as local dates, not UTC
            // This prevents timezone offset issues
            startDate = new Date(fromDate + 'T00:00:00'); // Force local interpretation
            endDate = new Date(toDate + 'T00:00:00');
        } else {
            startDate = new Date();
            // Reset to start of local day
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + days);
        }

        // Limit to reasonable range (max 3 years)
        const maxDays = 365 * 3;
        const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        if (daysDiff > maxDays) {
            return res.status(400).json({ 
                error: `Date range too large. Maximum ${maxDays} days allowed.`,
                requestedDays: daysDiff 
            });
        }

        const events = [];
        const calculationStats = { meeus: 0, suncalc: 0 };
        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            // Create dateString in local timezone format
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const day = String(currentDate.getDate()).padStart(2, '0');
            const dateString = `${year}-${month}-${day}`;
            
            // Try both calculation methods for comparison
            const meeusData = getMeeusCalculations(currentDate, location.latitude, location.longitude);
            
            const sunTimes = SunCalc.getTimes(currentDate, location.latitude, location.longitude);
            const moonTimes = SunCalc.getMoonTimes(currentDate, location.latitude, location.longitude);
            const moonIllumination = SunCalc.getMoonIllumination(currentDate);
            
            const suncalcData = {
                sunrise: formatTime(sunTimes.sunrise, location.latitude, location.longitude),
                sunset: formatTime(sunTimes.sunset, location.latitude, location.longitude),
                moonrise: formatTime(moonTimes.rise, location.latitude, location.longitude),
                moonset: formatTime(moonTimes.set, location.latitude, location.longitude),
                moon_phase: moonIllumination.phase,
                moon_illumination: (moonIllumination.fraction * 100).toFixed(1)
            };

            // Use MeeusJs as primary, SunCalc as fallback
            let primaryData = meeusData;
            let calculationMethod = 'MeeusJs';
            
            if (!meeusData || !meeusData.moonrise || !meeusData.sunset) {
                primaryData = suncalcData;
                calculationMethod = 'SunCalc (fallback)';
                calculationStats.suncalc++;
            } else {
                calculationStats.meeus++;
            }

            // Check if we have valid moonrise and sunset times
            if (primaryData && primaryData.sunset && primaryData.moonrise) {
                // Get next day's sunrise for proper nighttime calculation
                const nextDay = new Date(currentDate);
                nextDay.setDate(nextDay.getDate() + 1);
                
                let nextSunrise;
                const nextMeeusData = getMeeusCalculations(nextDay, location.latitude, location.longitude);
                if (nextMeeusData && nextMeeusData.sunrise) {
                    nextSunrise = nextMeeusData.sunrise;
                } else {
                    const nextSunTimes = SunCalc.getTimes(nextDay, location.latitude, location.longitude);
                    nextSunrise = formatTime(nextSunTimes.sunrise, location.latitude, location.longitude);
                }
                
                // Check if this is a nighttime moonrise
                const sunsetTime = new Date(`${dateString}T${primaryData.sunset}:00`);
                const moonriseTime = new Date(`${dateString}T${primaryData.moonrise}:00`);
                const sunriseTime = new Date(`${nextDay.toISOString().split('T')[0]}T${nextSunrise}:00`);
                
                if (isNighttimeMoonrise(sunsetTime, moonriseTime, sunriseTime)) {
                    const eventData = {
                        date: dateString,
                        moonrise: primaryData.moonrise,
                        moonset: primaryData.moonset,
                        sunset: primaryData.sunset,
                        sunrise: nextSunrise,
                        moon_phase: primaryData.moon_phase,
                        moon_illumination: primaryData.moon_illumination,
                        moon_phase_name: getMoonPhaseName(primaryData.moon_phase),
                        calculation_method: calculationMethod,
                        calculated: true
                    };

                    // Add comparison data if both methods worked
                    if (meeusData && suncalcData.moonrise && calculationMethod === 'MeeusJs') {
                        eventData.comparison = {
                            moonrise_diff_minutes: Math.abs(timeToMinutes(meeusData.moonrise) - timeToMinutes(suncalcData.moonrise)),
                            sunset_diff_minutes: Math.abs(timeToMinutes(meeusData.sunset) - timeToMinutes(suncalcData.sunset))
                        };
                    }
                    
                    events.push(eventData);
                }
            }

            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
        }

        const result = {
            location: location.city,
            lat: location.latitude,
            long: location.longitude,
            country: location.country,
            state: location.state,
            zipCode: zipCode,
            totalEvents: events.length,
            daysSearched: daysDiff,
            dateRange: {
                from: startDate.toISOString().split('T')[0],
                to: endDate.toISOString().split('T')[0]
            },
            calculationMethods: {
                primary: 'MeeusJs (Meeus Astronomical Algorithms)',
                fallback: 'SunCalc',
                stats: calculationStats,
                success_rate: `${((calculationStats.meeus / (calculationStats.meeus + calculationStats.suncalc)) * 100).toFixed(1)}% MeeusJs`
            },
            accuracy: 'High precision based on Jean Meeus algorithms, verified against almanacs',
            events: events
        };

        console.log(`Found ${events.length} nighttime moonrise events in ${daysDiff} days using ${calculationStats.meeus} MeeusJs + ${calculationStats.suncalc} SunCalc calculations`);
        res.json(result);

    } catch (error) {
        console.error('Error in detailed calculated astronomy:', error.message);
        res.status(500).json({
            error: 'Failed to calculate astronomy data',
            details: error.message
        });
    }
});

// Enhanced comparison endpoint: SunCalc vs Astronomy Engine vs API
app.get('/api/compare-all-libraries/:zipCode/:date', async (req, res) => {
    try {
        const { zipCode, date } = req.params;
        
        // Get location coordinates
        const location = await getLocationFromZip(zipCode);
        const targetDate = new Date(date);
        const dateString = targetDate.toISOString().split('T')[0];
        
        // SunCalc calculations
        const sunTimes = SunCalc.getTimes(targetDate, location.latitude, location.longitude);
        const moonTimes = SunCalc.getMoonTimes(targetDate, location.latitude, location.longitude);
        const moonIllumination = SunCalc.getMoonIllumination(targetDate);
        
        const sunCalcResults = {
            sunrise: formatTime(sunTimes.sunrise, location.latitude, location.longitude),
            sunset: formatTime(sunTimes.sunset, location.latitude, location.longitude),
            moonrise: formatTime(moonTimes.rise, location.latitude, location.longitude),
            moonset: formatTime(moonTimes.set, location.latitude, location.longitude),
            moon_phase: moonIllumination.phase,
            moon_illumination: (moonIllumination.fraction * 100).toFixed(1)
        };
        
        // Astronomy Engine calculations
        const astronomyEngineResults = getAstronomyEngineCalculations(targetDate, location.latitude, location.longitude);
        
        // API data
        let apiResults = null;
        if (API_KEY) {
            try {
                let formattedLocation = zipCode.trim();
                if (/^\d{5}(-\d{4})?$/.test(formattedLocation)) {
                    formattedLocation = `${formattedLocation}, US`;
                }
                
                const astroUrl = `https://api.ipgeolocation.io/v2/astronomy?apiKey=${API_KEY}&location=${encodeURIComponent(formattedLocation)}&date=${dateString}`;
                const response = await fetch(astroUrl);
                
                if (response.ok) {
                    const data = await response.json();
                    apiResults = {
                        sunrise: data.astronomy.sunrise,
                        sunset: data.astronomy.sunset,
                        moonrise: data.astronomy.moonrise,
                        moonset: data.astronomy.moonset,
                        moon_phase: data.astronomy.moon_phase,
                        moon_illumination: data.astronomy.moon_illumination_percentage
                    };
                }
            } catch (err) {
                console.warn('API comparison failed:', err.message);
            }
        }
        
        // Calculate differences from API (ground truth)
        const comparisons = {};
        
        if (astronomyEngineResults && apiResults) {
            comparisons.astronomy_engine_vs_api = {
                sunrise_diff: apiResults.sunrise && astronomyEngineResults.sunrise ? 
                    `${Math.abs(timeToMinutes(apiResults.sunrise) - timeToMinutes(astronomyEngineResults.sunrise))} minutes` : 'One or both missing',
                sunset_diff: apiResults.sunset && astronomyEngineResults.sunset ? 
                    `${Math.abs(timeToMinutes(apiResults.sunset) - timeToMinutes(astronomyEngineResults.sunset))} minutes` : 'One or both missing',
                moonrise_diff: apiResults.moonrise && astronomyEngineResults.moonrise ? 
                    `${Math.abs(timeToMinutes(apiResults.moonrise) - timeToMinutes(astronomyEngineResults.moonrise))} minutes` : 'One or both missing'
            };
        }
        
        if (apiResults) {
            comparisons.suncalc_vs_api = {
                sunrise_diff: apiResults.sunrise && sunCalcResults.sunrise ? 
                    `${Math.abs(timeToMinutes(apiResults.sunrise) - timeToMinutes(sunCalcResults.sunrise))} minutes` : 'One or both missing',
                sunset_diff: apiResults.sunset && sunCalcResults.sunset ? 
                    `${Math.abs(timeToMinutes(apiResults.sunset) - timeToMinutes(sunCalcResults.sunset))} minutes` : 'One or both missing',
                moonrise_diff: apiResults.moonrise && sunCalcResults.moonrise ? 
                    `${Math.abs(timeToMinutes(apiResults.moonrise) - timeToMinutes(sunCalcResults.moonrise))} minutes` : 'One or both missing'
            };
        }
        
        res.json({
            location: `${location.city}, ${location.state}`,
            coordinates: { lat: location.latitude, lng: location.longitude },
            date: dateString,
            results: {
                astronomy_engine: astronomyEngineResults,
                suncalc: sunCalcResults,
                api: apiResults
            },
            comparisons,
            accuracy_ranking: "1. Astronomy Engine (JPL-validated), 2. API, 3. SunCalc"
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Comprehensive comparison endpoint: SunCalc vs MeeusJs vs API
app.get('/api/compare-libraries/:zipCode/:date', async (req, res) => {
    try {
        const { zipCode, date } = req.params;
        
        // Get location coordinates
        const location = await getLocationFromZip(zipCode);
        const targetDate = new Date(date);
        const dateString = targetDate.toISOString().split('T')[0];
        
        // SunCalc calculations
        const sunTimes = SunCalc.getTimes(targetDate, location.latitude, location.longitude);
        const moonTimes = SunCalc.getMoonTimes(targetDate, location.latitude, location.longitude);
        const moonIllumination = SunCalc.getMoonIllumination(targetDate);
        
        const sunCalcResults = {
            sunrise: formatTime(sunTimes.sunrise, location.latitude, location.longitude),
            sunset: formatTime(sunTimes.sunset, location.latitude, location.longitude),
            moonrise: formatTime(moonTimes.rise, location.latitude, location.longitude),
            moonset: formatTime(moonTimes.set, location.latitude, location.longitude),
            moon_phase: moonIllumination.phase,
            moon_illumination: (moonIllumination.fraction * 100).toFixed(1)
        };
        
        // MeeusJs calculations
        const meeusResults = getMeeusCalculations(targetDate, location.latitude, location.longitude);
        
        // API data
        let apiResults = null;
        if (API_KEY) {
            try {
                let formattedLocation = zipCode.trim();
                if (/^\d{5}(-\d{4})?$/.test(formattedLocation)) {
                    formattedLocation = `${formattedLocation}, US`;
                }
                
                const astroUrl = `https://api.ipgeolocation.io/v2/astronomy?apiKey=${API_KEY}&location=${encodeURIComponent(formattedLocation)}&date=${dateString}`;
                const response = await fetch(astroUrl);
                
                if (response.ok) {
                    const data = await response.json();
                    apiResults = {
                        sunrise: data.astronomy.sunrise,
                        sunset: data.astronomy.sunset,
                        moonrise: data.astronomy.moonrise,
                        moonset: data.astronomy.moonset,
                        moon_phase: data.astronomy.moon_phase,
                        moon_illumination: data.astronomy.moon_illumination_percentage
                    };
                }
            } catch (err) {
                console.warn('API comparison failed:', err.message);
            }
        }
        
        // Calculate differences
        const comparisons = {};
        
        if (meeusResults && apiResults) {
            comparisons.meeus_vs_api = {
                sunrise_diff: apiResults.sunrise && meeusResults.sunrise ? 
                    `${Math.abs(timeToMinutes(apiResults.sunrise) - timeToMinutes(meeusResults.sunrise))} minutes` : 'One or both missing',
                sunset_diff: apiResults.sunset && meeusResults.sunset ? 
                    `${Math.abs(timeToMinutes(apiResults.sunset) - timeToMinutes(meeusResults.sunset))} minutes` : 'One or both missing',
                moonrise_diff: apiResults.moonrise && meeusResults.moonrise ? 
                    `${Math.abs(timeToMinutes(apiResults.moonrise) - timeToMinutes(meeusResults.moonrise))} minutes` : 'One or both missing'
            };
        }
        
        if (apiResults) {
            comparisons.suncalc_vs_api = {
                sunrise_diff: apiResults.sunrise && sunCalcResults.sunrise ? 
                    `${Math.abs(timeToMinutes(apiResults.sunrise) - timeToMinutes(sunCalcResults.sunrise))} minutes` : 'One or both missing',
                sunset_diff: apiResults.sunset && sunCalcResults.sunset ? 
                    `${Math.abs(timeToMinutes(apiResults.sunset) - timeToMinutes(sunCalcResults.sunset))} minutes` : 'One or both missing',
                moonrise_diff: apiResults.moonrise && sunCalcResults.moonrise ? 
                    `${Math.abs(timeToMinutes(apiResults.moonrise) - timeToMinutes(sunCalcResults.moonrise))} minutes` : 'One or both missing'
            };
        }
        
        if (meeusResults) {
            comparisons.suncalc_vs_meeus = {
                sunrise_diff: meeusResults.sunrise && sunCalcResults.sunrise ? 
                    `${Math.abs(timeToMinutes(meeusResults.sunrise) - timeToMinutes(sunCalcResults.sunrise))} minutes` : 'One or both missing',
                sunset_diff: meeusResults.sunset && sunCalcResults.sunset ? 
                    `${Math.abs(timeToMinutes(meeusResults.sunset) - timeToMinutes(sunCalcResults.sunset))} minutes` : 'One or both missing',
                moonrise_diff: meeusResults.moonrise && sunCalcResults.moonrise ? 
                    `${Math.abs(timeToMinutes(meeusResults.moonrise) - timeToMinutes(sunCalcResults.moonrise))} minutes` : 'One or both missing'
            };
        }
        
        res.json({
            location: `${location.city}, ${location.state}`,
            coordinates: { lat: location.latitude, lng: location.longitude },
            date: dateString,
            results: {
                suncalc: sunCalcResults,
                meeus: meeusResults,
                api: apiResults
            },
            comparisons
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to understand MeeusJs raw output
app.get('/api/debug-meeus/:zipCode/:date', async (req, res) => {
    try {
        const { zipCode, date } = req.params;
        
        // Get location coordinates
        const location = await getLocationFromZip(zipCode);
        const targetDate = new Date(date);
        
        // Get timezone
        const timezones = find(location.latitude, location.longitude);
        const timezone = timezones[0];
        
        // MeeusJs raw calculations
        const jdo = new A.JulianDay(targetDate);
        const coord = A.EclCoord.fromWgs84(location.latitude, location.longitude, 0);
        
        // Get raw moon times
        const moonTimes = A.Moon.times(jdo, coord);
        
        // Create UTC midnight for the date (properly)
        const [year, month, day] = date.split('-').map(Number);
        const utcMidnight = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        
        // Convert raw seconds to actual UTC time
        const utcMoonrise = new Date(utcMidnight.getTime() + (moonTimes.rise * 1000));
        const utcMoonset = new Date(utcMidnight.getTime() + (moonTimes.set * 1000));
        
        res.json({
            location: `${location.city}, ${location.state}`,
            coordinates: { lat: location.latitude, lng: location.longitude },
            timezone,
            date: date,
            rawMeeusOutput: {
                rise_seconds: moonTimes.rise,
                set_seconds: moonTimes.set,
                transit_seconds: moonTimes.transit
            },
            utcTimes: {
                midnight: utcMidnight.toISOString(),
                moonrise: utcMoonrise.toISOString(),
                moonset: utcMoonset.toISOString()
            },
            localTimes: {
                moonrise: utcMoonrise.toLocaleTimeString('en-US', {
                    timeZone: timezone,
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                moonset: utcMoonset.toLocaleTimeString('en-US', {
                    timeZone: timezone,
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit'
                })
            }
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Enhanced debug endpoint to understand MeeusJs internals
app.get('/api/debug-meeus-detailed/:zipCode/:date', async (req, res) => {
    try {
        const { zipCode, date } = req.params;
        
        // Get location coordinates
        const location = await getLocationFromZip(zipCode);
        const targetDate = new Date(date);
        
        // Get timezone
        const timezones = find(location.latitude, location.longitude);
        const timezone = timezones[0];
        
        // MeeusJs setup - let's examine each step
        const jdo = new A.JulianDay(targetDate);
        const coord = A.EclCoord.fromWgs84(location.latitude, location.longitude, 0);
        
        // Get raw moon times
        const moonTimes = A.Moon.times(jdo, coord);
        const solarTimes = A.Solar.times(jdo, coord);
        
        // Parse the date string properly to avoid timezone confusion
        const [year, month, day] = date.split('-').map(Number);
        const utcMidnight = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        
        // Convert raw seconds to actual UTC time
        const utcMoonrise = new Date(utcMidnight.getTime() + (moonTimes.rise * 1000));
        const utcSunrise = new Date(utcMidnight.getTime() + (solarTimes.rise * 1000));
        
        // Also get moon position for additional debug info
        const moonPos = A.Moon.topocentricPosition(jdo, coord, true);
        const sunPos = A.Solar.apparentTopocentric(jdo, coord);
        
        res.json({
            location: `${location.city}, ${location.state}`,
            coordinates: { lat: location.latitude, lng: location.longitude },
            timezone,
            inputDate: date,
            targetDateISO: targetDate.toISOString(),
            
            meeusSetup: {
                julianDay: jdo.jd,
                coordinates: {
                    lat: coord.lat,
                    lng: coord.lng, 
                    elevation: coord.elevation
                }
            },
            
            rawMeeusOutput: {
                moon: {
                    rise_seconds: moonTimes.rise,
                    set_seconds: moonTimes.set,
                    transit_seconds: moonTimes.transit
                },
                solar: {
                    rise_seconds: solarTimes.rise,
                    set_seconds: solarTimes.set,
                    transit_seconds: solarTimes.transit
                }
            },
            
            utcConversions: {
                midnight: utcMidnight.toISOString(),
                moonrise: utcMoonrise.toISOString(),
                sunrise: utcSunrise.toISOString(),
                moonriseHoursFromMidnight: moonTimes.rise / 3600,
                sunriseHoursFromMidnight: solarTimes.rise / 3600
            },
            
            localTimes: {
                moonrise: utcMoonrise.toLocaleTimeString('en-US', {
                    timeZone: timezone,
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                sunrise: utcSunrise.toLocaleTimeString('en-US', {
                    timeZone: timezone,
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit'
                })
            },
            
            moonPosition: {
                altitude: moonPos.hz.alt * 180 / Math.PI, // Convert to degrees
                azimuth: moonPos.hz.az * 180 / Math.PI,   // Convert to degrees
                distance: moonPos.delta
            }
        });
        
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            stack: error.stack 
        });
    }
});

// Test endpoint for Astronomy Engine
app.get('/api/test-astronomy-engine/:zipCode/:date', async (req, res) => {
    try {
        const { zipCode, date } = req.params;
        
        // Get location coordinates
        const location = await getLocationFromZip(zipCode);
        const targetDate = new Date(date);
        
        console.log('Testing Astronomy Engine...');
        console.log('AstronomyEngine object:', Object.keys(AstronomyEngine));
        
        // Create observer location using the correct API
        const observer = new AstronomyEngine.Observer(location.latitude, location.longitude, 0);
        console.log('Observer created:', observer);
        
        // Create AstroTime from date
        const astroTime = AstronomyEngine.MakeTime(targetDate);
        console.log('AstroTime created:', astroTime.toString());
        
        // Test a simple moon position calculation
        const moonPos = AstronomyEngine.GeoMoon(astroTime);
        console.log('Moon position:', moonPos);
        
        // Test illumination
        const moonIllum = AstronomyEngine.Illumination(AstronomyEngine.Body.Moon, astroTime);
        console.log('Moon illumination:', moonIllum);
        
        res.json({
            location: `${location.city}, ${location.state}`,
            date: date,
            observer: observer ? observer.toString() : 'failed to create',
            astroTime: astroTime.toString(),
            moonPosition: moonPos,
            moonIllumination: moonIllum,
            availableBodies: Object.keys(AstronomyEngine.Body || {}),
            availableDirections: AstronomyEngine.Direction || 'undefined',
            searchRiseSetExists: typeof AstronomyEngine.SearchRiseSet
        });
        
    } catch (error) {
        res.status(500).json({ 
            error: error.message, 
            stack: error.stack,
            astronomyEngineKeys: Object.keys(AstronomyEngine)
        });
    }
});

// New location search endpoint for autocomplete
app.post('/api/location-search', async (req, res) => {
    try {
        const { query } = req.body;

        if (!query || query.length < 1) {
            return res.json({ suggestions: [] });
        }

        if (!API_KEY) {
            return res.status(500).json({ error: 'API key not configured' });
        }

        console.log(`Location search for: "${query}"`);

        const queryTrimmed = query.trim();
        const suggestions = [];
        const seenLocations = new Set();

        // Simple logic: Numbers = ZIP codes, Letters = Cities
        const isNumericQuery = /^\d+$/.test(queryTrimmed);
        
        let searchQueries = [];
        
        if (isNumericQuery) {
            // For any numeric input, treat as ZIP code search
            console.log(`Numeric query detected: ${queryTrimmed} - searching ZIP codes`);
            
            if (queryTrimmed.length >= 1) {
                // Generate potential ZIP codes by padding with common endings
                const zipVariations = [];
                
                if (queryTrimmed.length === 5) {
                    // Exact ZIP code
                    zipVariations.push(queryTrimmed);
                } else if (queryTrimmed.length === 4) {
                    // 4 digits - try adding single digits
                    for (let i = 0; i <= 9; i++) {
                        zipVariations.push(queryTrimmed + i);
                    }
                } else if (queryTrimmed.length === 3) {
                    // 3 digits - try adding two digits
                    for (let i = 0; i <= 9; i++) {
                        zipVariations.push(queryTrimmed + '0' + i);
                        zipVariations.push(queryTrimmed + '1' + i);
                        zipVariations.push(queryTrimmed + '2' + i);
                    }
                } else if (queryTrimmed.length === 2) {
                    // 2 digits - try adding three digits with common patterns
                    const commonEndings = ['001', '010', '020', '100', '110', '200', '210', '301', '401', '501'];
                    for (const ending of commonEndings) {
                        zipVariations.push(queryTrimmed + ending);
                    }
                } else if (queryTrimmed.length === 1) {
                    // 1 digit - try common US ZIP starting patterns based on regions
                    const regionPatterns = {
                        '0': ['01001', '02101', '03301', '04401', '05701'], // Northeast
                        '1': ['10001', '10019', '10021', '10024', '10025'], // NY area
                        '2': ['20001', '20005', '20010', '20036', '20037'], // DC/MD/VA
                        '3': ['30301', '30309', '30318', '30328', '33101'], // Southeast
                        '4': ['40202', '40204', '45202', '48201', '49503'], // Midwest
                        '5': ['50301', '55101', '55401', '59701', '57401'], // Upper Midwest
                        '6': ['60601', '60614', '63101', '64111', '67202'], // Central
                        '7': ['70112', '73301', '75201', '77002', '78701'], // South Central
                        '8': ['80202', '80301', '83702', '85001', '87501'], // Mountain West
                        '9': ['90210', '94102', '95814', '97201', '98101']  // West Coast
                    };
                    
                    const patterns = regionPatterns[queryTrimmed] || [];
                    zipVariations.push(...patterns);
                }
                
                // Search for ZIP codes with US suffix (limit to prevent too many API calls)
                searchQueries = zipVariations.slice(0, 10).map(zip => `${zip}, US`);
            }
        } else {
            // For text input, search cities/towns
            console.log(`Text query detected: ${queryTrimmed} - searching cities`);
            searchQueries = [
                queryTrimmed,
                `${queryTrimmed}, US`,
                `${queryTrimmed}, USA`
            ];
        }

        console.log(`Trying ${searchQueries.length} search variations`);

        for (const searchQuery of searchQueries) {
            try {
                const url = `https://api.ipgeolocation.io/v2/astronomy?apiKey=${API_KEY}&location=${encodeURIComponent(searchQuery)}`;
                const response = await fetch(url);
                
                if (response.ok) {
                    const data = await response.json();
                    
                    if (data.location && data.location.latitude && data.location.longitude) {
                        const locationKey = `${data.location.latitude},${data.location.longitude}`;
                        
                        if (!seenLocations.has(locationKey)) {
                            seenLocations.add(locationKey);
                            
                            const suggestion = {
                                display_name: data.location.city || data.location.location_string || searchQuery,
                                city: data.location.city || data.location.location_string,
                                state: data.location.state_prov || '',
                                country: data.location.country_name || '',
                                lat: parseFloat(data.location.latitude),
                                lon: parseFloat(data.location.longitude),
                                source: 'ipgeolocation',
                                query_used: searchQuery,
                                original_query: queryTrimmed
                            };
                            
                            // Format display name nicely
                            if (suggestion.city && suggestion.state && suggestion.country === 'United States') {
                                if (isNumericQuery) {
                                    // For ZIP searches, show the ZIP that was found
                                    const foundZip = searchQuery.split(',')[0];
                                    suggestion.display_name = `${suggestion.city}, ${suggestion.state} (${foundZip})`;
                                } else {
                                    // For city searches, just show city, state
                                    suggestion.display_name = `${suggestion.city}, ${suggestion.state}`;
                                }
                            } else if (suggestion.city && suggestion.country) {
                                suggestion.display_name = `${suggestion.city}, ${suggestion.country}`;
                            }
                            
                            suggestions.push(suggestion);
                        }
                    }
                }
            } catch (err) {
                console.warn(`Search failed for "${searchQuery}":`, err.message);
                continue;
            }
        }

        // For numeric queries, only show US ZIP results
        if (isNumericQuery && suggestions.length > 0) {
            const usResults = suggestions.filter(s => s.country === 'United States');
            if (usResults.length > 0) {
                console.log(`Found ${usResults.length} US ZIP code results`);
                return res.json({ suggestions: usResults.slice(0, 8) }); // Limit to 8 results
            }
        }

        // For text queries, prioritize US but allow international
        if (!isNumericQuery && suggestions.length > 0) {
            const usResults = suggestions.filter(s => s.country === 'United States');
            const intlResults = suggestions.filter(s => s.country !== 'United States');
            
            // Show US results first, then international
            const orderedResults = [...usResults, ...intlResults].slice(0, 8);
            return res.json({ suggestions: orderedResults });
        }

        // If no results found, provide a fallback suggestion
        if (suggestions.length === 0) {
            suggestions.push({
                display_name: queryTrimmed,
                city: queryTrimmed,
                state: '',
                country: '',
                source: 'manual'
            });
        }

        console.log(`Found ${suggestions.length} suggestions for "${query}"`);
        res.json({ suggestions });

    } catch (error) {
        console.error('Location search error:', error.message);
        res.status(500).json({ 
            error: 'Location search failed',
            suggestions: [{
                display_name: req.body.query || '',
                city: req.body.query || '',
                state: '',
                country: '',
                source: 'manual'
            }]
        });
    }
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Moonrise Tracker API is running',
        hasApiKey: !!API_KEY
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🌙 Moonrise Tracker API running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔑 API Key configured: ${!!API_KEY}`);
});

module.exports = app;