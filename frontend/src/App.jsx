import React, { useState } from "react";
import { Moon, Sun, Clock, MapPin, AlertCircle, Server } from "lucide-react";

const MoonriseTracker = () => {
  const [zipCode, setZipCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [moonriseData, setMoonriseData] = useState(null);
  const [backendUrl, setBackendUrl] = useState("http://localhost:3001");

  // Date range inputs with smart defaults (3 months from today)
  const today = new Date();
  const threeMonthsLater = new Date();
  threeMonthsLater.setMonth(today.getMonth() + 3);

  const [fromDate, setFromDate] = useState(today.toISOString().split("T")[0]);
  const [toDate, setToDate] = useState(threeMonthsLater.toISOString().split("T")[0]);
  const [useDefaultRange, setUseDefaultRange] = useState(true);

  const generateICS = () => {
    if (!moonriseData || !moonriseData.events || moonriseData.events.length === 0) {
      setError("No moonrise data available to export");
      return;
    }

    console.log("Generating ICS for events:", moonriseData.events.slice(0, 3)); // Debug first 3 events

    const icsEvents = moonriseData.events
      .map((event, index) => {
        // Parse the moonrise time for the correct date
        const [hours, minutes] = event.moonrise.split(":").map(Number);

        // Create date manually to avoid timezone issues
        const [year, month, day] = event.date.split("-").map(Number);
        const startDate = new Date(year, month - 1, day, hours, minutes, 0, 0);

        console.log(`Event ${index}: ${event.date} ${event.moonrise} -> ${startDate.toLocaleString()}`); // Debug

        // Create 20-minute event
        const endDate = new Date(startDate);
        endDate.setMinutes(endDate.getMinutes() + 20);

        // Format dates for ICS in local time, then convert to UTC string
        const formatICSDate = (date) => {
          return date
            .toISOString()
            .replace(/[-:]/g, "")
            .replace(/\.\d{3}/, "");
        };

        const phaseName = getMoonPhaseName(event.moon_phase);
        const illumination = Math.abs(parseFloat(event.moon_illumination)).toFixed(0);

        return [
          "BEGIN:VEVENT",
          `UID:moonrise-${event.date}-${index}@moonrisetracker.com`,
          `DTSTART:${formatICSDate(startDate)}`,
          `DTEND:${formatICSDate(endDate)}`,
          `SUMMARY:🌙 Moonrise - ${phaseName}`,
          `DESCRIPTION:Moonrise at ${formatTime(event.moonrise)} after sunset (${formatTime(event.sunset)})\\n\\nMoon Phase: ${phaseName}\\nIllumination: ${illumination}%\\nSunset: ${formatTime(event.sunset)}\\nSunrise: ${formatTime(event.sunrise)}\\n\\nDate: ${formatDate(event.date)}`,
          `LOCATION:${moonriseData.location}, ${moonriseData.state}`,
          "BEGIN:VALARM",
          "TRIGGER:-PT15M",
          "ACTION:DISPLAY",
          "DESCRIPTION:Moonrise in 15 minutes! 🌙",
          "END:VALARM",
          "END:VEVENT",
        ].join("\r\n");
      })
      .join("\r\n");

    const icsContent = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Moonrise Tracker//Moonrise Calendar//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:Moonrise Times - ${moonriseData.location}`, `X-WR-CALDESC:Nighttime moonrise events for ${moonriseData.location}, ${moonriseData.state}`, "X-WR-TIMEZONE:UTC", "REFRESH-INTERVAL;VALUE=DURATION:P1W", icsEvents, "END:VCALENDAR"].join(
      "\r\n"
    );

    return icsContent;
  };

  const downloadICS = () => {
    const icsContent = generateICS();
    if (!icsContent) return;

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `moonrise-calendar-${moonriseData.location.replace(/[^a-zA-Z0-9]/g, "-")}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const formatDate = (dateString) => {
    // Parse date string manually to avoid timezone issues
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return "N/A";
    const date = new Date(`2000-01-01 ${timeString}`);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getMoonPhaseIcon = (phase) => {
    const phaseNum = parseFloat(phase);
    if (phaseNum < 0.1 || phaseNum > 0.9) return "🌑"; // New Moon
    if (phaseNum >= 0.1 && phaseNum < 0.25) return "🌒"; // Waxing Crescent
    if (phaseNum >= 0.25 && phaseNum < 0.35) return "🌓"; // First Quarter
    if (phaseNum >= 0.35 && phaseNum < 0.5) return "🌔"; // Waxing Gibbous
    if (phaseNum >= 0.5 && phaseNum < 0.65) return "🌕"; // Full Moon
    if (phaseNum >= 0.65 && phaseNum < 0.75) return "🌖"; // Waning Gibbous
    if (phaseNum >= 0.75 && phaseNum < 0.9) return "🌗"; // Last Quarter
    return "🌘"; // Waning Crescent
  };

  const getMoonPhaseName = (phase) => {
    const phaseNum = parseFloat(phase);
    if (phaseNum < 0.1 || phaseNum > 0.9) return "New Moon";
    if (phaseNum >= 0.1 && phaseNum < 0.25) return "Waxing Crescent";
    if (phaseNum >= 0.25 && phaseNum < 0.35) return "First Quarter";
    if (phaseNum >= 0.35 && phaseNum < 0.5) return "Waxing Gibbous";
    if (phaseNum >= 0.5 && phaseNum < 0.65) return "Full Moon";
    if (phaseNum >= 0.65 && phaseNum < 0.75) return "Waning Gibbous";
    if (phaseNum >= 0.75 && phaseNum < 0.9) return "Last Quarter";
    return "Waning Crescent";
  };

  const timeToMinutes = (timeString) => {
    if (!timeString) return 0;
    const [hours, minutes] = timeString.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const isNighttimeMoonrise = (sunset, moonrise, sunrise) => {
    const sunsetMin = timeToMinutes(sunset);
    const moonriseMin = timeToMinutes(moonrise);
    const sunriseMin = timeToMinutes(sunrise) + 1440; // Add 24 hours for next day

    return sunsetMin <= moonriseMin && moonriseMin <= sunriseMin;
  };

  const testBackendConnection = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/health`);
      const data = await response.json();

      if (data.status === "OK") {
        setError(`✅ Backend connected! High-precision calculations ready`);
      } else {
        setError("❌ Backend responded but with issues");
      }
    } catch (err) {
      setError(`❌ Cannot connect to backend: ${err.message}`);
    }
  };

  const fetchUpcomingMoonrises = async () => {
    if (!zipCode.trim()) {
      setError("Please enter a zip code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const requestBody = {
        zipCode: zipCode.trim(),
      };

      // Add date range if not using defaults
      if (!useDefaultRange) {
        requestBody.fromDate = fromDate;
        requestBody.toDate = toDate;
      }

      const response = await fetch(`${backendUrl}/api/astronomy-calculated`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log("Moonrise data:", data); // Debug log
      setMoonriseData(data);
    } catch (err) {
      setError(err.message || "Failed to fetch moonrise data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Moon className="w-8 h-8 text-yellow-300" />
            <h1 className="text-4xl font-bold text-white">Nighttime Moonrise Tracker</h1>
          </div>
          <p className="text-purple-200">Discover when the moon rises during nighttime hours in your area</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 mb-6">
          <div className="space-y-4">
            <div>
              <div className="block text-sm font-medium text-white mb-2">
                <Server className="inline w-4 h-4 mr-1" />
                Backend URL
              </div>
              <div className="flex gap-2">
                <input type="text" value={backendUrl} onChange={(e) => setBackendUrl(e.target.value)} className="flex-1 px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:ring-2 focus:ring-purple-400 focus:border-transparent" placeholder="http://localhost:3001" />
                <button onClick={testBackendConnection} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                  Test
                </button>
              </div>
            </div>

            <div>
              <div className="block text-sm font-medium text-white mb-2">
                <MapPin className="inline w-4 h-4 mr-1" />
                US Zip Code
              </div>
              <input type="text" value={zipCode} onChange={(e) => setZipCode(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:ring-2 focus:ring-purple-400 focus:border-transparent" placeholder="Enter zip code (e.g., 90210)" onKeyDown={(e) => e.key === "Enter" && fetchUpcomingMoonrises()} />
            </div>

            {/* Date Range Selection */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-white" />
                <span className="text-sm font-medium text-white">Date Range</span>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-white cursor-pointer">
                  <input type="radio" checked={useDefaultRange} onChange={() => setUseDefaultRange(true)} className="text-purple-600 focus:ring-purple-400" />
                  <span className="text-sm">Next 3 months (recommended)</span>
                </label>

                <label className="flex items-center gap-2 text-white cursor-pointer">
                  <input type="radio" checked={!useDefaultRange} onChange={() => setUseDefaultRange(false)} className="text-purple-600 focus:ring-purple-400" />
                  <span className="text-sm">Custom date range</span>
                </label>

                {!useDefaultRange && (
                  <div className="grid grid-cols-2 gap-3 mt-3 pl-6">
                    <div>
                      <label className="block text-xs text-purple-200 mb-1">From</label>
                      <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg bg-white/20 border border-white/30 text-white focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-xs text-purple-200 mb-1">To</label>
                      <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg bg-white/20 border border-white/30 text-white focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button onClick={fetchUpcomingMoonrises} disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Calculating...
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4" />
                  Get Upcoming Moonrises
                </>
              )}
            </button>
          </div>

          {error && (
            <div className={`mt-4 p-4 rounded-lg flex items-center gap-2 ${error.startsWith("✅") ? "bg-green-500/20 border border-green-400/30 text-green-200" : "bg-red-500/20 border border-red-400/30 text-red-200"}`}>
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>

        {moonriseData && (
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">
                🌙 {moonriseData.location}
              </h2>
              <p className="text-purple-200">
                {moonriseData.totalEvents} watchable moonrises found
              </p>
              <p className="text-purple-300 text-sm mb-4">
                {moonriseData.state}, {moonriseData.country} • {moonriseData.dateRange.from} to {moonriseData.dateRange.to}
              </p>
              <p className="text-purple-400 text-xs mb-4">
                {moonriseData.calculationMethod} • {moonriseData.accuracy}
              </p>
              
              <button
                onClick={downloadICS}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 mx-auto"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Calendar (.ics)
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {moonriseData.events.map((event, index) => (
                <div key={index} className="flex items-center gap-4 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  <div className="text-4xl">
                    {getMoonPhaseIcon(event.moon_phase)}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">
                      {formatDate(event.date)} - {formatTime(event.moonrise)}
                    </p>
                    <p className="text-purple-200 text-sm">
                      {getMoonPhaseName(event.moon_phase)} • {Math.abs(parseFloat(event.moon_illumination)).toFixed(0)}% illuminated
                    </p>
                    <p className="text-purple-300 text-xs">
                      Sunset: {formatTime(event.sunset)} • Moonrise: {formatTime(event.moonrise)}
                      {event.calculation_method && ` • ${event.calculation_method}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 text-sm font-medium">Visible</p>
                    <p className="text-green-300 text-xs">After sunset</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center text-purple-200 text-sm mt-4">
              <p>Coordinates: {moonriseData.lat}°, {moonriseData.long}°</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MoonriseTracker;
