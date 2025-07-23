import React, { useState, useRef, useEffect } from "react";
import { Moon, Sun, Clock, MapPin, AlertCircle, Search, X } from "lucide-react";
import { apiFetch, logApiConfig } from "./config/api.js";

const MoonriseTracker = () => {
  const [locationInput, setLocationInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [moonriseData, setMoonriseData] = useState(null);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Log API configuration on mount for debugging
  useEffect(() => {
    logApiConfig();
  }, []);

  // Autocomplete search function
  const searchLocations = async (query) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);

    try {
      // Use backend location search with IPGeolocation API
      const backendResponse = await apiFetch("/api/location-search", {
        method: "POST",
        body: JSON.stringify({ query }),
      });

      if (backendResponse.ok) {
        const data = await backendResponse.json();
        if (data.suggestions && data.suggestions.length > 0) {
          setSuggestions(data.suggestions);
          setShowSuggestions(true);
          setIsSearching(false);
          return;
        }
      }

      // Fallback to manual entry if backend doesn't return results
      setSuggestions([
        {
          display_name: query,
          city: query,
          state: "",
          country: "",
          source: "manual",
        },
      ]);
      setShowSuggestions(true);
    } catch (err) {
      console.warn("Autocomplete search failed:", err);
      // Allow manual entry as fallback
      setSuggestions([
        {
          display_name: query,
          city: query,
          state: "",
          country: "",
          source: "manual",
        },
      ]);
      setShowSuggestions(true);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  const handleInputChange = (value) => {
    setLocationInput(value);
    setSelectedIndex(-1);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for search
    searchTimeoutRef.current = setTimeout(() => {
      searchLocations(value);
    }, 300); // 300ms delay
  };

  // Handle suggestion selection
  const selectSuggestion = (suggestion) => {
    setLocationInput(suggestion.display_name);
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);

    // Focus back on input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === "Enter") {
        fetchUpcomingMoonrises();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          selectSuggestion(suggestions[selectedIndex]);
        } else {
          fetchUpcomingMoonrises();
        }
        break;
      case "Escape":
        setSuggestions([]);
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
      default:
        break;
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) && inputRef.current && !inputRef.current.contains(event.target)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Clear search on cleanup
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Date range inputs with smart defaults (3 months from today)
  const today = new Date();
  const threeMonthsLater = new Date();
  threeMonthsLater.setMonth(today.getMonth() + 3);

  const [fromDate, setFromDate] = useState(today.toISOString().split("T")[0]);
  const [toDate, setToDate] = useState(threeMonthsLater.toISOString().split("T")[0]);
  const [useDefaultRange, setUseDefaultRange] = useState(true);

  // Bedtime state - default to 11:00 PM (23:00)
  const [bedtime, setBedtime] = useState("23:00");

  const generateICS = () => {
    if (!moonriseData || !moonriseData.events || moonriseData.events.length === 0) {
      setError("No moonrise data available to export");
      return;
    }

    const icsEvents = moonriseData.events
      .map((event, index) => {
        // Parse the moonrise time for the correct date
        const [hours, minutes] = event.moonrise.split(":").map(Number);

        // Create date manually to avoid timezone issues
        const [year, month, day] = event.date.split("-").map(Number);
        const startDate = new Date(year, month - 1, day, hours, minutes, 0, 0);

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
          `LOCATION:${moonriseData.location}${moonriseData.state ? `, ${moonriseData.state}` : ""}`,
          "BEGIN:VALARM",
          "TRIGGER:-PT15M",
          "ACTION:DISPLAY",
          "DESCRIPTION:Moonrise in 15 minutes! 🌙",
          "END:VALARM",
          "END:VEVENT",
        ].join("\r\n");
      })
      .join("\r\n");

    const locationName = `${moonriseData.location}${moonriseData.state ? `, ${moonriseData.state}` : ""}`;
    const icsContent = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Moonrise Tracker//Moonrise Calendar//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:Moonrise Times - ${locationName}`, `X-WR-CALDESC:Nighttime moonrise events for ${locationName}`, "X-WR-TIMEZONE:UTC", "REFRESH-INTERVAL;VALUE=DURATION:P1W", icsEvents, "END:VCALENDAR"].join("\r\n");

    return icsContent;
  };

  const downloadICS = () => {
    const icsContent = generateICS();
    if (!icsContent) return;

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);

    // Create safe filename from location
    const locationName = `${moonriseData.location}${moonriseData.state ? `-${moonriseData.state}` : ""}`;
    const safeLocationName = locationName.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "-");

    link.download = `moonrise-calendar-${safeLocationName}.ics`;
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
    if (phaseNum <= 0.03 || phaseNum >= 0.97) return "🌑"; // New Moon
    if (phaseNum > 0.03 && phaseNum < 0.22) return "🌒"; // Waxing Crescent
    if (phaseNum >= 0.22 && phaseNum < 0.28) return "🌓"; // First Quarter
    if (phaseNum >= 0.28 && phaseNum < 0.47) return "🌔"; // Waxing Gibbous
    if (phaseNum >= 0.47 && phaseNum < 0.53) return "🌕"; // Full Moon
    if (phaseNum >= 0.53 && phaseNum < 0.72) return "🌖"; // Waning Gibbous
    if (phaseNum >= 0.72 && phaseNum < 0.78) return "🌗"; // Last Quarter
    return "🌘"; // Waning Crescent
  };

  const getMoonPhaseName = (phase) => {
    const phaseNum = parseFloat(phase);
    if (phaseNum <= 0.03 || phaseNum >= 0.97) return "New Moon";
    if (phaseNum > 0.03 && phaseNum < 0.22) return "Waxing Crescent";
    if (phaseNum >= 0.22 && phaseNum < 0.28) return "First Quarter";
    if (phaseNum >= 0.28 && phaseNum < 0.47) return "Waxing Gibbous";
    if (phaseNum >= 0.47 && phaseNum < 0.53) return "Full Moon";
    if (phaseNum >= 0.53 && phaseNum < 0.72) return "Waning Gibbous";
    if (phaseNum >= 0.72 && phaseNum < 0.78) return "Last Quarter";
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
      const response = await apiFetch("/api/health");
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
    if (!locationInput.trim()) {
      setError("Please enter a location");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const requestBody = {
        location: locationInput.trim(),
        bedtime: bedtime, // Add bedtime to request
        // Keep zipCode for backward compatibility if it looks like a ZIP
        ...(/^\d{5}(-\d{4})?$/.test(locationInput.trim()) && { zipCode: locationInput.trim() }),
      };

      // Add date range if not using defaults
      if (!useDefaultRange) {
        requestBody.fromDate = fromDate;
        requestBody.toDate = toDate;
      }

      const response = await apiFetch("/api/astronomy-calculated", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setMoonriseData(data);
    } catch (err) {
      setError(err.message || "Failed to fetch moonrise data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tl from-black via-gray-900 to-slate-800 p-4 relative overflow-hidden">
      {/* Enhanced Starfield Background */}
      <div className="absolute inset-0 opacity-40">
        {/* Row 1 - Top */}
        <div className="absolute top-[5%] left-[10%] w-0.5 h-0.5 bg-white rounded-full"></div>
        <div className="absolute top-[8%] left-[25%] w-0.5 h-0.5 bg-blue-100 rounded-full"></div>
        <div className="absolute top-[12%] left-[45%] w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: "2s" }}></div>
        <div className="absolute top-[6%] left-[65%] w-0.5 h-0.5 bg-slate-200 rounded-full"></div>
        <div className="absolute top-[15%] left-[80%] w-0.5 h-0.5 bg-blue-200 rounded-full"></div>
        <div className="absolute top-[3%] left-[90%] w-0.5 h-0.5 bg-white rounded-full"></div>

        {/* Row 2 */}
        <div className="absolute top-[20%] left-[5%] w-0.5 h-0.5 bg-blue-100 rounded-full"></div>
        <div className="absolute top-[25%] left-[15%] w-0.5 h-0.5 bg-white rounded-full"></div>
        <div className="absolute top-[22%] left-[35%] w-0.5 h-0.5 bg-slate-300 rounded-full"></div>
        <div className="absolute top-[28%] left-[55%] w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: "4s" }}></div>
        <div className="absolute top-[24%] left-[75%] w-0.5 h-0.5 bg-blue-200 rounded-full"></div>
        <div className="absolute top-[18%] left-[88%] w-0.5 h-0.5 bg-white rounded-full"></div>
        <div className="absolute top-[26%] left-[95%] w-0.5 h-0.5 bg-slate-200 rounded-full"></div>

        {/* Row 3 */}
        <div className="absolute top-[35%] left-[8%] w-0.5 h-0.5 bg-white rounded-full"></div>
        <div className="absolute top-[38%] left-[20%] w-0.5 h-0.5 bg-blue-100 rounded-full"></div>
        <div className="absolute top-[32%] left-[40%] w-0.5 h-0.5 bg-slate-200 rounded-full"></div>
        <div className="absolute top-[42%] left-[60%] w-0.5 h-0.5 bg-white rounded-full"></div>
        <div className="absolute top-[36%] left-[78%] w-1 h-1 bg-blue-200 rounded-full animate-pulse" style={{ animationDelay: "6s" }}></div>
        <div className="absolute top-[40%] left-[92%] w-0.5 h-0.5 bg-white rounded-full"></div>

        {/* Row 4 */}
        <div className="absolute top-[48%] left-[12%] w-0.5 h-0.5 bg-blue-100 rounded-full"></div>
        <div className="absolute top-[52%] left-[28%] w-0.5 h-0.5 bg-white rounded-full"></div>
        <div className="absolute top-[45%] left-[48%] w-0.5 h-0.5 bg-slate-300 rounded-full"></div>
        <div className="absolute top-[55%] left-[68%] w-0.5 h-0.5 bg-blue-200 rounded-full"></div>
        <div className="absolute top-[50%] left-[85%] w-0.5 h-0.5 bg-white rounded-full"></div>

        {/* Row 5 */}
        <div className="absolute top-[62%] left-[6%] w-0.5 h-0.5 bg-white rounded-full"></div>
        <div className="absolute top-[65%] left-[22%] w-1 h-1 bg-slate-200 rounded-full animate-pulse" style={{ animationDelay: "8s" }}></div>
        <div className="absolute top-[68%] left-[42%] w-0.5 h-0.5 bg-blue-100 rounded-full"></div>
        <div className="absolute top-[63%] left-[58%] w-0.5 h-0.5 bg-white rounded-full"></div>
        <div className="absolute top-[70%] left-[75%] w-0.5 h-0.5 bg-blue-200 rounded-full"></div>
        <div className="absolute top-[66%] left-[90%] w-0.5 h-0.5 bg-slate-300 rounded-full"></div>

        {/* Row 6 - Bottom */}
        <div className="absolute top-[75%] left-[15%] w-0.5 h-0.5 bg-blue-100 rounded-full"></div>
        <div className="absolute top-[82%] left-[30%] w-0.5 h-0.5 bg-white rounded-full"></div>
        <div className="absolute top-[78%] left-[50%] w-0.5 h-0.5 bg-slate-200 rounded-full"></div>
        <div className="absolute top-[85%] left-[70%] w-0.5 h-0.5 bg-blue-200 rounded-full"></div>
        <div className="absolute top-[80%] left-[85%] w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: "1s" }}></div>

        {/* Additional scattered stars */}
        <div className="absolute top-[14%] left-[32%] w-0.5 h-0.5 bg-white rounded-full"></div>
        <div className="absolute top-[44%] left-[16%] w-0.5 h-0.5 bg-blue-100 rounded-full"></div>
        <div className="absolute top-[72%] left-[38%] w-0.5 h-0.5 bg-slate-300 rounded-full"></div>
        <div className="absolute top-[29%] left-[82%] w-0.5 h-0.5 bg-white rounded-full"></div>
        <div className="absolute top-[58%] left-[25%] w-0.5 h-0.5 bg-blue-200 rounded-full"></div>
        <div className="absolute top-[88%] left-[52%] w-0.5 h-0.5 bg-white rounded-full"></div>
        <div className="absolute top-[16%] left-[72%] w-0.5 h-0.5 bg-blue-100 rounded-full"></div>
        <div className="absolute top-[37%] left-[8%] w-0.5 h-0.5 bg-slate-200 rounded-full"></div>
        <div className="absolute top-[73%] left-[64%] w-0.5 h-0.5 bg-white rounded-full"></div>
        <div className="absolute top-[91%] left-[18%] w-0.5 h-0.5 bg-blue-200 rounded-full"></div>
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        <div className="text-center mb-8 px-2">
          <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
            <Moon className="w-6 h-6 md:w-8 md:h-8 text-blue-200 flex-shrink-0" />
            <h1 className="text-xl font-bold text-white break-words max-w-full">Moonrise Tracker</h1>
          </div>
          <p className="text-sm text-slate-300 px-4 leading-relaxed">Discover when the moon rises during night hours in your area!</p>
          <p className="text-sm text-slate-300 px-4 leading-relaxed">Enter your zip or city below to get moonrise times and an importable calendar.</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 mb-6 border border-white/20">
          <div className="space-y-4">
            <div className="relative">
              <div className="block text-lg font-medium text-blue-300 mb-2">
                <MapPin className="inline w-4 h-4 mr-1" />
                Location (enter ZIP Code or City)
              </div>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={locationInput}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full px-4 py-2 pr-10 rounded-lg bg-white/20 border border-slate-400/30 text-white placeholder-slate-300/60 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  placeholder="Numbers for ZIP codes, letters for cities..."
                  autoComplete="off"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                  {isSearching && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                  {locationInput && (
                    <button
                      onClick={() => {
                        setLocationInput("");
                        setSuggestions([]);
                        setShowSuggestions(false);
                        if (inputRef.current) inputRef.current.focus();
                      }}
                      className="text-white/60 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <Search className="w-4 h-4 text-white/60" />
                </div>

                {/* Autocomplete Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div ref={suggestionsRef} className="absolute top-full left-0 right-0 z-50 mt-1 bg-slate-800/95 backdrop-blur-md rounded-lg border border-slate-500/30 shadow-xl max-h-60 overflow-y-auto">
                    {suggestions.map((suggestion, index) => (
                      <div key={`${suggestion.display_name}-${index}`} onClick={() => selectSuggestion(suggestion)} className={`px-4 py-3 cursor-pointer transition-colors border-b border-slate-600/20 last:border-b-0 ${index === selectedIndex ? "bg-blue-500/20 text-blue-100" : "text-slate-200 hover:bg-slate-700/50"}`}>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{suggestion.display_name}</div>
                            {suggestion.city && suggestion.city !== suggestion.display_name && (
                              <div className="text-sm text-slate-400 truncate">
                                {suggestion.city}
                                {suggestion.state && `, ${suggestion.state}`}
                                {suggestion.country && `, ${suggestion.country}`}
                              </div>
                            )}
                          </div>
                          {suggestion.source === "geoapify" && <div className="text-xs text-blue-400 bg-blue-900/30 px-2 py-1 rounded">🌍</div>}
                          {suggestion.source === "ipgeolocation" && <div className="text-xs text-teal-400 bg-teal-900/30 px-2 py-1 rounded">📍</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {locationInput && /^\d+$/.test(locationInput.trim()) && <div className="mt-1 text-green-300">🔢 Searching ZIP codes for "{locationInput}"</div>}
                {locationInput && /^[a-zA-Z\s]+$/.test(locationInput.trim()) && <div className="mt-1 text-blue-300">🏙️ Searching cities for "{locationInput}"</div>}
              </div>
            </div>

            {/* Date Range Selection */}
            <div className="mt-10">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-white" />
                <span className="text-lg font-medium text-blue-300">Date Range</span>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-white cursor-pointer">
                  <input type="radio" checked={useDefaultRange} onChange={() => setUseDefaultRange(true)} className="text-blue-600 focus:ring-blue-400" />
                  <span className="text-sm">Next 30 days</span>
                </label>

                <label className="flex items-center gap-2 text-white cursor-pointer">
                  <input type="radio" checked={!useDefaultRange} onChange={() => setUseDefaultRange(false)} className="text-blue-600 focus:ring-blue-400" />
                  <span className="text-sm">Custom date range</span>
                </label>

                {!useDefaultRange && (
                  <div className="grid grid-cols-2 gap-3 mt-3 pl-6">
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">From</label>
                      <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg bg-white/20 border border-slate-400/30 text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">To</label>
                      <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg bg-white/20 border border-slate-400/30 text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bedtime Selection */}
            <div className="mt-10">
              <div className="flex items-center gap-2 mb-3">
                <Sun className="w-4 h-4 text-white" />
                <span className="text-lg font-medium text-blue-300">Your Bedtime</span>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-slate-300 leading-relaxed">To avoid late-night alerts, we'll only show moonrises that occur between sunset and your bedtime. This ensures you won't get calendar notifications at 3 AM when the moon rises!</p>

                <div className="w-full">
                  <select value={bedtime} onChange={(e) => setBedtime(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-white/20 border border-slate-400/30 text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent">
                    <option value="21:00" className="bg-slate-800 text-white">
                      9:00 PM
                    </option>
                    <option value="21:30" className="bg-slate-800 text-white">
                      9:30 PM
                    </option>
                    <option value="22:00" className="bg-slate-800 text-white">
                      10:00 PM
                    </option>
                    <option value="22:30" className="bg-slate-800 text-white">
                      10:30 PM
                    </option>
                    <option value="23:00" className="bg-slate-800 text-white">
                      11:00 PM (Default)
                    </option>
                    <option value="23:30" className="bg-slate-800 text-white">
                      11:30 PM
                    </option>
                    <option value="00:00" className="bg-slate-800 text-white">
                      12:00 AM (Midnight)
                    </option>
                    <option value="00:30" className="bg-slate-800 text-white">
                      12:30 AM
                    </option>
                    <option value="01:00" className="bg-slate-800 text-white">
                      1:00 AM
                    </option>
                    <option value="01:30" className="bg-slate-800 text-white">
                      1:30 AM
                    </option>
                    <option value="02:00" className="bg-slate-800 text-white">
                      2:00 AM
                    </option>
                    <option value="03:00" className="bg-slate-800 text-white">
                      3:00 AM
                    </option>
                    <option value="04:00" className="bg-slate-800 text-white">
                      4:00 AM
                    </option>
                    <option value="05:00" className="bg-slate-800 text-white">
                      5:00 AM
                    </option>
                    <option value="sunrise" className="bg-slate-800 text-white">
                      Until Sunrise (Original Behavior)
                    </option>
                  </select>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="my-8 border-t border-slate-600/30"></div>

            <button onClick={fetchUpcomingMoonrises} disabled={loading} className="w-full bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-blue-300 font-semibold py-4 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 border border-slate-500/30 shadow-lg hover:shadow-xl">
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
            <div className={`mt-4 p-4 rounded-lg flex items-center gap-2 border ${error.startsWith("✅") ? "bg-green-500/20 border-green-400/30 text-green-200" : "bg-red-500/20 border-red-400/30 text-red-200"}`}>
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>

        {moonriseData && (
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">{moonriseData.location}</h2>
              <p className="text-slate-300">{moonriseData.totalEvents} watchable moonrises found</p>
              <p className="text-slate-400 text-sm mb-2">
                {moonriseData.state && `${moonriseData.state}, `}
                {moonriseData.country} • {moonriseData.dateRange.from} to {moonriseData.dateRange.to}
              </p>
              {moonriseData.originalInput && moonriseData.originalInput !== moonriseData.location && <p className="text-slate-500 text-xs mb-2">📍 Searched for: "{moonriseData.originalInput}"</p>}
              <p className="text-slate-500 text-xs mb-4">
                {moonriseData.calculationMethod} • {moonriseData.accuracy}
              </p>

              <button onClick={downloadICS} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 mx-auto border border-blue-500/30">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Calendar (.ics)
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {moonriseData.events.map((event, index) => (
                <div key={index} className="flex items-center gap-4 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  <div className="text-4xl">{getMoonPhaseIcon(event.moon_phase)}</div>
                  <div className="flex-1">
                    <p className="text-white font-medium">
                      {formatDate(event.date)} - {formatTime(event.moonrise)}
                    </p>
                    <p className="text-purple-200 text-sm">
                      {getMoonPhaseName(event.moon_phase)} • {Math.abs(parseFloat(event.moon_illumination)).toFixed(0)}% illuminated
                    </p>
                    <p className="text-slate-400 text-xs">
                      Sunset: {formatTime(event.sunset)} • Moonrise: {formatTime(event.moonrise)}
                      {event.calculation_method && ` • ${event.calculation_method}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center text-purple-200 text-sm mt-4">
              <p>
                Coordinates: {moonriseData.lat}°, {moonriseData.long}°
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MoonriseTracker;
