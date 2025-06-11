const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // npm install node-fetch@2
require('dotenv').config(); // npm install dotenv

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Your IPGeolocation API key (store in .env file)
const API_KEY = process.env.IPGEOLOCATION_API_KEY;

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

// Endpoint to get astronomy data by zip code
app.post('/api/astronomy', async (req, res) => {
    try {
        const { zipCode } = req.body;

        if (!zipCode) {
            return res.status(400).json({ error: 'Zip code is required' });
        }

        if (!API_KEY) {
            return res.status(500).json({ error: 'API key not configured' });
        }

        console.log(`Fetching data for zip code: ${zipCode}`);

        // Format location - if it's a US zip code, add ", US" for accuracy
        let formattedLocation = zipCode.trim();
        if (/^\d{5}(-\d{4})?$/.test(formattedLocation)) {
            formattedLocation = `${formattedLocation}, US`;
            console.log(`US zip code detected, formatted as: ${formattedLocation}`);
        }

        // Get today's date
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

        // Use v2/astronomy endpoint with location parameter (same as working code)
        const astroUrl = `https://api.ipgeolocation.io/v2/astronomy?apiKey=${API_KEY}&location=${encodeURIComponent(formattedLocation)}&date=${today}`;
        console.log('API URL:', astroUrl);
        
        const astroResponse = await fetch(astroUrl);

        if (!astroResponse.ok) {
            const errorText = await astroResponse.text();
            console.error('API Error Response:', errorText);
            throw new Error(`Astronomy API failed: ${astroResponse.status} ${astroResponse.statusText}`);
        }

        const astroData = await astroResponse.json();
        console.log('Astronomy data:', astroData);

        // Return the data in the same format as before
        const result = {
            sunrise: astroData.astronomy.sunrise,
            sunset: astroData.astronomy.sunset,
            moonrise: astroData.astronomy.moonrise,
            moonset: astroData.astronomy.moonset,
            moon_phase: astroData.astronomy.moon_phase,
            moon_illumination: astroData.astronomy.moon_illumination_percentage,
            location: astroData.location.city || astroData.location.location_string || formattedLocation,
            lat: astroData.location.latitude,
            long: astroData.location.longitude,
            zipCode: zipCode
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

// Health check endpoint
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