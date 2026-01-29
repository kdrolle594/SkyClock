 const sky = document.getElementById('sky');
        const sun = document.getElementById('sun');
        const moon = document.getElementById('moon');
        const timeDisplay = document.getElementById('time-display');
        const dateDisplay = document.getElementById('date-display');
        const locationDisplay = document.getElementById('location-display');
        const locationSearchContainer = document.getElementById('location-search-container');
        const locationInput = document.getElementById('location-input');
        const locationSuggestions = document.getElementById('location-suggestions');
        const searchButton = document.getElementById('search-button');
        const useCurrentLocationBtn = document.getElementById('use-current-location');
        const locationError = document.getElementById('location-error');

        // Location and weather state
        let currentLocation = {
            lat: null,
            lon: null,
            name: 'Loading...',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };

        // Weather state
        let currentWeather = {
            condition: 'clear',
            temperature: 20,
            description: '',
            windSpeed: 0,
            isWindy: false
        };

        // Create stars
        const stars = [];
        for (let i = 0; i < 100; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 70 + '%';
            star.style.animationDelay = Math.random() * 2 + 's';
            sky.appendChild(star);
            stars.push(star);
        }

        // Create rain drops
        const rainDrops = [];
        function createRainDrops() {
            for (let i = 0; i < 50; i++) {
                const drop = document.createElement('div');
                drop.className = 'rain-drop';
                drop.style.left = Math.random() * 100 + '%';
                drop.style.top = -Math.random() * 100 + '%';
                drop.style.animationDuration = (Math.random() * 0.5 + 0.5) + 's';
                drop.style.animationDelay = Math.random() * 2 + 's';
                sky.appendChild(drop);
                rainDrops.push(drop);
            }
        }
        createRainDrops();

        // Create snow flakes
        const snowFlakes = [];
        function createSnowFlakes() {
            for (let i = 0; i < 30; i++) {
                const flake = document.createElement('div');
                flake.className = 'snow-flake';
                flake.style.left = Math.random() * 100 + '%';
                flake.style.top = -Math.random() * 100 + '%';
                flake.style.animationDuration = (Math.random() * 3 + 2) + 's';
                flake.style.animationDelay = Math.random() * 3 + 's';
                sky.appendChild(flake);
                snowFlakes.push(flake);
            }
        }
        createSnowFlakes();

        // --- Replace or insert the helper + updated functions below ---

// Simple fetch wrapper that enforces timeout and checks response.ok
async function fetchJson(url, timeout = 10000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const resp = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        if (!resp.ok) {
            const text = await resp.text().catch(() => '');
            throw new Error(`HTTP ${resp.status} ${resp.statusText} - ${text}`);
        }
        return await resp.json();
    } catch (err) {
        clearTimeout(id);
        throw err;
    }
}

async function fetchWeather(lat, lon) {
    try {
        // Correct forecast URL: use current_weather=true and proper unit names
        const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&current_weather=true&temperature_unit=fahrenheit&windspeed_unit=mph&timezone=auto`;

        const data = await fetchJson(forecastUrl, 10000);

        if (!data.current_weather) {
            throw new Error('No current_weather returned from Open-Meteo');
        }

        const cw = data.current_weather;
        // Open-Meteo current_weather fields: temperature, windspeed, weathercode, is_day
        currentWeather.temperature = Math.round(cw.temperature);
        currentWeather.windSpeed = Math.round(cw.windspeed);
        currentWeather.isWindy = currentWeather.windSpeed > 15; // Windy if > 15 mph

        // Update timezone from API response (fallback to existing if missing)
        currentLocation.timezone = data.timezone || currentLocation.timezone;

        // Map weather codes to conditions
        currentWeather.condition = mapWeatherCode(cw.weathercode);

        console.log('Weather fetched:', { currentWeather, timezone: currentLocation.timezone });

        // Update wind effects
        updateWindEffects();
    } catch (error) {
        console.error('Could not fetch weather, using default clear sky:', error);
        currentWeather.condition = 'clear';
        currentWeather.temperature = currentWeather.temperature || 20;
        currentWeather.windSpeed = 0;
        currentWeather.isWindy = false;
    }
}

// Select a location from search results (improved validation)
async function selectLocation(result) {
    // Validate that the location has all required data
    if (result.latitude == null || result.longitude == null || !result.name || !result.country) {
        showLocationError('Invalid location data. Please try another location.');
        return;
    }

    currentLocation.lat = result.latitude;
    currentLocation.lon = result.longitude;
    currentLocation.name = `${result.name}${result.admin1 ? ', ' + result.admin1 : ''}${result.country ? ', ' + result.country : ''}`;

    // Update input field
    locationInput.value = currentLocation.name;

    try {
        // Fetch weather for this location
        await fetchWeather(currentLocation.lat, currentLocation.lon);

        // Verify that timezone was successfully retrieved
        if (!currentLocation.timezone) {
            showLocationError('Could not retrieve timezone for this location.');
            return;
        }

        // Update display
        locationDisplay.textContent = `📍 ${currentLocation.name}`;
        hideLocationError();
        toggleLocationSearch();
    } catch (error) {
        showLocationError('Could not retrieve weather data for this location.');
        console.error('Weather fetch error:', error);
    }
}

// Reverse geocode coordinates to location name (use /v1/reverse)
async function reverseGeocode(lat, lon) {
    try {
        const url = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&count=1&language=en&format=json`;
        const data = await fetchJson(url, 10000);

        if (data.results && data.results.length > 0) {
            const result = data.results[0];
            currentLocation.name = `${result.name}${result.admin1 ? ', ' + result.admin1 : ''}${result.country ? ', ' + result.country : ''}`;
        } else {
            currentLocation.name = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
        }

        locationDisplay.textContent = `📍 ${currentLocation.name}`;
    } catch (error) {
        currentLocation.name = 'Unknown Location';
        locationDisplay.textContent = `📍 ${currentLocation.name}`;
        console.error('Reverse geocode error:', error);
    }
}

        // Get location from browser geolocation
        async function getCurrentLocation() {
            try {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject);
                });

                currentLocation.lat = position.coords.latitude;
                currentLocation.lon = position.coords.longitude;
                
                // Get location name from reverse geocoding
                await reverseGeocode(currentLocation.lat, currentLocation.lon);
                
                // Fetch weather for this location
                await fetchWeather(currentLocation.lat, currentLocation.lon);
                
                hideLocationError();
            } catch (error) {
                showLocationError('Could not get your location. Please search manually.');
                console.error('Geolocation error:', error);
            }
        }

        // Search for a location by name
        async function searchLocation(query) {
            try {
                // If the query has commas, extract just the first part (city name)
                // This handles cases like "Seattle, Washington, United States"
                const searchQuery = query.includes(',') ? query.split(',')[0].trim() : query;
                
                // Using Open-Meteo geocoding API
                const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=10&language=en&format=json`);
                const data = await response.json();

                if (!data.results || data.results.length === 0) {
                    showLocationError('Location not found. Please try a simpler search (e.g., just the city name).');
                    return;
                }

                // Find first valid result with complete data
                // If original query had commas, try to match more specifically
                let validResult;
                if (query.includes(',')) {
                    // Try to find a result that matches the full query better
                    const queryParts = query.split(',').map(p => p.trim().toLowerCase());
                    validResult = data.results.find(result => {
                        const hasCoordinates = result.latitude != null && result.longitude != null;
                        const hasCountry = result.country != null && result.country.length > 0;
                        const hasName = result.name != null && result.name.length > 0;
                        
                        if (!hasCoordinates || !hasCountry || !hasName) return false;
                        
                        // Check if result matches query parts
                        const resultParts = [
                            result.name?.toLowerCase(),
                            result.admin1?.toLowerCase(),
                            result.admin2?.toLowerCase(),
                            result.country?.toLowerCase()
                        ].filter(Boolean);
                        
                        // At least match the first part (city name)
                        return resultParts.some(part => part.includes(queryParts[0]));
                    });
                }
                
                // If no specific match or no commas in query, use first valid result
                if (!validResult) {
                    validResult = data.results.find(result => {
                        const hasCoordinates = result.latitude != null && result.longitude != null;
                        const hasCountry = result.country != null && result.country.length > 0;
                        const hasName = result.name != null && result.name.length > 0;
                        return hasCoordinates && hasCountry && hasName;
                    });
                }

                if (!validResult) {
                    showLocationError('No valid location found. Please try a simpler search (e.g., just the city name).');
                    return;
                }

                await selectLocation(validResult);
            } catch (error) {
                showLocationError('Error searching location. Please try again.');
                console.error('Search error:', error);
            }
        }

        // Get location suggestions as user types
        let searchTimeout;
        async function getLocationSuggestions(query) {
            if (query.length < 2) {
                hideSuggestions();
                return;
            }

            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(async () => {
                try {
                    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=en&format=json`);
                    const data = await response.json();

                    if (!data.results || data.results.length === 0) {
                        hideSuggestions();
                        return;
                    }

                    // Filter to only include valid locations with all required data
                    const validResults = data.results.filter(result => {
                        // Must have coordinates
                        const hasCoordinates = result.latitude != null && result.longitude != null;
                        // Must have a country (ensures it's a real, recognized location)
                        const hasCountry = result.country != null && result.country.length > 0;
                        // Must have a name
                        const hasName = result.name != null && result.name.length > 0;
                        
                        return hasCoordinates && hasCountry && hasName;
                    }).slice(0, 5); // Limit to 5 results after filtering

                    if (validResults.length === 0) {
                        hideSuggestions();
                        return;
                    }

                    displaySuggestions(validResults);
                } catch (error) {
                    console.error('Suggestions error:', error);
                    hideSuggestions();
                }
            }, 300); // Debounce for 300ms
        }

        // Display location suggestions
        function displaySuggestions(results) {
            locationSuggestions.innerHTML = '';
            
            results.forEach(result => {
                const suggestionDiv = document.createElement('div');
                suggestionDiv.className = 'location-suggestion';
                
                const nameDiv = document.createElement('div');
                nameDiv.className = 'suggestion-name';
                nameDiv.textContent = result.name;
                
                const detailsDiv = document.createElement('div');
                detailsDiv.className = 'suggestion-details';
                const details = [];
                if (result.admin1) details.push(result.admin1);
                if (result.country) details.push(result.country);
                detailsDiv.textContent = details.join(', ');
                
                suggestionDiv.appendChild(nameDiv);
                suggestionDiv.appendChild(detailsDiv);
                
                suggestionDiv.addEventListener('click', async () => {
                    await selectLocation(result);
                    hideSuggestions();
                });
                
                locationSuggestions.appendChild(suggestionDiv);
            });
            
            locationSuggestions.classList.add('active');
        }

        // Hide suggestions
        function hideSuggestions() {
            locationSuggestions.classList.remove('active');
            locationSuggestions.innerHTML = '';
        }
        

        // UI functions
        function toggleLocationSearch() {
            locationSearchContainer.classList.toggle('active');
        }

        function showLocationError(message) {
            locationError.textContent = message;
            locationError.style.display = 'block';
        }

        function hideLocationError() {
            locationError.style.display = 'none';
        }

        // Event listeners
        locationDisplay.addEventListener('click', toggleLocationSearch);

        // Input event for autocomplete
        locationInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            getLocationSuggestions(query);
        });

        // Focus event - show suggestions if there's text
        locationInput.addEventListener('focus', (e) => {
            const query = e.target.value.trim();
            if (query.length >= 2) {
                getLocationSuggestions(query);
            }
        });

        searchButton.addEventListener('click', () => {
            const query = locationInput.value.trim();
            if (query) {
                searchLocation(query);
                hideSuggestions();
            }
        });

        locationInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = locationInput.value.trim();
                if (query) {
                    searchLocation(query);
                    hideSuggestions();
                }
            }
        });

        // Close suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!locationSearchContainer.contains(e.target) && !locationDisplay.contains(e.target)) {
                locationSearchContainer.classList.remove('active');
                hideSuggestions();
            }
        });

        useCurrentLocationBtn.addEventListener('click', getCurrentLocation);

        // Map WMO weather codes to conditions
        function mapWeatherCode(code) {
            if (code === 0) return 'clear';
            if (code === 1 || code === 2) return 'partly-cloudy';
            if (code === 3) return 'cloudy';
            if (code === 45 || code === 48) return 'foggy';
            if (code >= 51 && code <= 57) return 'drizzle';
            if (code >= 61 && code <= 67) return 'rainy';
            if (code >= 71 && code <= 77) return 'snowy';
            if (code >= 80 && code <= 82) return 'rainy';
            if (code === 85 || code === 86) return 'snowy';
            if (code === 95 || code === 96 || code === 99) return 'stormy';
            return 'cloudy';
        }

        // Initialize weather
        getCurrentLocation();
        // Refresh weather every 10 minutes
        setInterval(() => {
            if (currentLocation.lat && currentLocation.lon) {
                fetchWeather(currentLocation.lat, currentLocation.lon);
            }
        }, 600000);

        // Update wind effects
        function updateWindEffects() {
            const clouds = document.querySelectorAll('.cloud');
            const windMultiplier = Math.max(1, currentWeather.windSpeed / 15);
            
            clouds.forEach((cloud, index) => {
                const baseSpeed = index === 0 ? 60 : 80;
                const newSpeed = baseSpeed / windMultiplier;
                cloud.style.animationDuration = `${newSpeed}s`;
            });

            // Add wind indicator if windy
            updateWindIndicator();
        }

        // Create wind indicator
        function updateWindIndicator() {
            let windIndicator = document.getElementById('wind-indicator');
            
            if (!windIndicator) {
                windIndicator = document.createElement('div');
                windIndicator.id = 'wind-indicator';
                windIndicator.style.position = 'absolute';
                windIndicator.style.top = '120px';
                windIndicator.style.left = '50%';
                windIndicator.style.transform = 'translateX(-50%)';
                windIndicator.style.fontSize = '18px';
                windIndicator.style.color = 'white';
                windIndicator.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
                windIndicator.style.zIndex = '10';
                windIndicator.style.opacity = '0';
                windIndicator.style.transition = 'opacity 1s ease';
                sky.appendChild(windIndicator);
            }

            if (currentWeather.isWindy) {
                windIndicator.textContent = `💨 Wind: ${currentWeather.windSpeed} mph`;
                windIndicator.style.opacity = '1';
            } else {
                windIndicator.style.opacity = '0';
            }
        }

        function updateClock() {
            // Get time in the location's timezone
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-US', {
                timeZone: currentLocation.timezone,
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            timeDisplay.textContent = timeString;

            // Get the hours/minutes/seconds in the location's timezone for calculations
            const locationTime = new Date(now.toLocaleString('en-US', { timeZone: currentLocation.timezone }));
            const hours = locationTime.getHours();
            const minutes = locationTime.getMinutes();
            const seconds = locationTime.getSeconds();

            // Format date
            const dateString = now.toLocaleDateString('en-US', {
                timeZone: currentLocation.timezone,
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            dateDisplay.textContent = dateString;

            // Calculate time as a percentage of the day (0 to 1)
            const totalSeconds = hours * 3600 + minutes * 60 + seconds;
            const dayPercentage = totalSeconds / 86400; // 86400 seconds in a day

            // Calculate position along an arc
            // Arc goes from left (sunrise ~6am) to right (sunset ~6pm)
            const angle = Math.PI * dayPercentage; // 0 to PI over 24 hours
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight + 190;
            const radius = window.innerHeight * 1.2;

            const sunX = centerX + radius * Math.cos(Math.PI - angle) - 40;
            const sunY = centerY - radius * Math.sin(Math.PI - angle) - 40;

            const moonX = centerX + radius * Math.cos(-angle) - 35;
            const moonY = centerY - radius * Math.sin(-angle) - 35;

            // Determine if it's day or night (6am to 6pm is day)
            const isDay = hours >= 6 && hours < 18;

            // Update sky color based on time AND weather
            let skyColor;
            const weather = currentWeather.condition;

            if (isDay) {
                if (hours >= 6 && hours < 7) {
                    // Dawn
                    skyColor = getSkyColorForWeather('dawn', weather);
                } else if (hours >= 7 && hours < 17) {
                    // Day
                    skyColor = getSkyColorForWeather('day', weather);
                } else {
                    // Sunset
                    skyColor = getSkyColorForWeather('sunset', weather);
                }
            } else {
                if (hours >= 19 && hours < 21) {
                    // Dusk
                    skyColor = getSkyColorForWeather('dusk', weather);
                } else {
                    // Night
                    skyColor = getSkyColorForWeather('night', weather);
                }
            }

            sky.style.background = skyColor;

            // Show/hide sun and moon based on weather
            if (isDay) {
                // Adjust sun visibility based on weather
                const sunOpacity = getSunOpacity(weather);
                sun.style.opacity = sunOpacity;
                sun.style.left = sunX + 'px';
                sun.style.top = sunY + 'px';
                moon.style.opacity = '0';
            } else {
                const moonOpacity = getMoonOpacity(weather);
                moon.style.opacity = moonOpacity;
                moon.style.left = moonX + 'px';
                moon.style.top = moonY + 'px';
                sun.style.opacity = '0';
            }

            // Show/hide stars at night
            const starOpacity = isDay ? 0 : (weather === 'clear' ? 1 : 0.3);
            stars.forEach(star => {
                star.style.opacity = starOpacity * (0.5 + Math.random() * 0.5);
            });

            // Update cloud opacity based on weather
            const clouds = document.querySelectorAll('.cloud');
            const cloudOpacity = getCloudOpacity(weather, isDay);
            clouds.forEach(cloud => {
                cloud.style.opacity = cloudOpacity;
            });

            // Update weather particles (rain/snow)
            updateWeatherParticles(weather);
        }

        function updateWeatherParticles(weather) {
            // Show rain for rainy/drizzle/stormy weather
            const showRain = weather === 'rainy' || weather === 'drizzle' || weather === 'stormy';
            rainDrops.forEach(drop => {
                drop.style.opacity = showRain ? (weather === 'drizzle' ? 0.3 : 0.6) : 0;
            });

            // Show snow for snowy weather
            const showSnow = weather === 'snowy';
            snowFlakes.forEach(flake => {
                flake.style.opacity = showSnow ? 0.8 : 0;
            });
        }

        function getSkyColorForWeather(timeOfDay, weather) {
            const skyColors = {
                'clear': {
                    'dawn': 'linear-gradient(to bottom, #FF6B6B, #FFD93D, #6BCB77)',
                    'day': 'linear-gradient(to bottom, #87CEEB, #87CEEB, #B0E0E6)',
                    'sunset': 'linear-gradient(to bottom, #FF6B6B, #FF8E53, #FE6B8B)',
                    'dusk': 'linear-gradient(to bottom, #2C3E50, #34495E, #5D6D7E)',
                    'night': 'linear-gradient(to bottom, #0B1026, #1A1A2E, #16213E)'
                },
                'partly-cloudy': {
                    'dawn': 'linear-gradient(to bottom, #FF8E7A, #FFC777, #7AB88F)',
                    'day': 'linear-gradient(to bottom, #9DB4C0, #B8D4E0, #C9DDE6)',
                    'sunset': 'linear-gradient(to bottom, #E07A7A, #E0A080, #E08BA0)',
                    'dusk': 'linear-gradient(to bottom, #3D4E5E, #475968, #667888)',
                    'night': 'linear-gradient(to bottom, #1A2436, #2A2A3E, #26314E)'
                },
                'cloudy': {
                    'dawn': 'linear-gradient(to bottom, #8B9AA3, #A0AFB8, #B5C4CD)',
                    'day': 'linear-gradient(to bottom, #A8B8C0, #BCC9D1, #D0DDE5)',
                    'sunset': 'linear-gradient(to bottom, #9A8A8A, #AA9A9A, #BAAAAA)',
                    'dusk': 'linear-gradient(to bottom, #4D5D6D, #5D6D7D, #6D7D8D)',
                    'night': 'linear-gradient(to bottom, #2A3444, #3A3A4E, #3A4458)'
                },
                'drizzle': {
                    'dawn': 'linear-gradient(to bottom, #7D8D9D, #8D9DAD, #9DADBD)',
                    'day': 'linear-gradient(to bottom, #8899AA, #99AABB, #AABBCC)',
                    'sunset': 'linear-gradient(to bottom, #8A7A8A, #9A8A9A, #AA9AAA)',
                    'dusk': 'linear-gradient(to bottom, #4D5D6D, #5D6D7D, #6D7D8D)',
                    'night': 'linear-gradient(to bottom, #2A3A4A, #3A4A5A, #3A4A6A)'
                },
                'rainy': {
                    'dawn': 'linear-gradient(to bottom, #6D7D8D, #7D8D9D, #8D9DAD)',
                    'day': 'linear-gradient(to bottom, #778899, #8899AA, #99AABB)',
                    'sunset': 'linear-gradient(to bottom, #7A6A7A, #8A7A8A, #9A8A9A)',
                    'dusk': 'linear-gradient(to bottom, #3D4D5D, #4D5D6D, #5D6D7D)',
                    'night': 'linear-gradient(to bottom, #1A2A3A, #2A3A4A, #2A3A5A)'
                },
                'stormy': {
                    'dawn': 'linear-gradient(to bottom, #4A5A6A, #5A6A7A, #6A7A8A)',
                    'day': 'linear-gradient(to bottom, #556677, #667788, #778899)',
                    'sunset': 'linear-gradient(to bottom, #5A4A5A, #6A5A6A, #7A6A7A)',
                    'dusk': 'linear-gradient(to bottom, #2D3D4D, #3D4D5D, #4D5D6D)',
                    'night': 'linear-gradient(to bottom, #0A1A2A, #1A2A3A, #1A2A4A)'
                },
                'snowy': {
                    'dawn': 'linear-gradient(to bottom, #D0D8E0, #E0E8F0, #F0F8FF)',
                    'day': 'linear-gradient(to bottom, #E8F0F8, #F0F8FF, #F8FFFF)',
                    'sunset': 'linear-gradient(to bottom, #D8C8D8, #E8D8E8, #F8E8F8)',
                    'dusk': 'linear-gradient(to bottom, #A8B8C8, #B8C8D8, #C8D8E8)',
                    'night': 'linear-gradient(to bottom, #3A4A5A, #4A5A6A, #5A6A7A)'
                },
                'foggy': {
                    'dawn': 'linear-gradient(to bottom, #B8C0C8, #C8D0D8, #D8E0E8)',
                    'day': 'linear-gradient(to bottom, #C8D0D8, #D8E0E8, #E8F0F8)',
                    'sunset': 'linear-gradient(to bottom, #C0B0C0, #D0C0D0, #E0D0E0)',
                    'dusk': 'linear-gradient(to bottom, #889098, #98A0A8, #A8B0B8)',
                    'night': 'linear-gradient(to bottom, #3A4248, #4A5258, #5A6268)'
                }
            };

            return skyColors[weather]?.[timeOfDay] || skyColors['clear'][timeOfDay];
        }

        function getSunOpacity(weather) {
            const opacityMap = {
                'clear': 1,
                'partly-cloudy': 0.8,
                'cloudy': 0.3,
                'drizzle': 0.25,
                'rainy': 0.2,
                'stormy': 0.1,
                'snowy': 0.4,
                'foggy': 0.3
            };
            return opacityMap[weather] || 1;
        }

        function getMoonOpacity(weather) {
            const opacityMap = {
                'clear': 1,
                'partly-cloudy': 0.7,
                'cloudy': 0.3,
                'drizzle': 0.25,
                'rainy': 0.2,
                'stormy': 0.1,
                'snowy': 0.5,
                'foggy': 0.2
            };
            return opacityMap[weather] || 1;
        }

        function getCloudOpacity(weather, isDay) {
            const baseOpacity = isDay ? 0.7 : 0.2;
            const opacityMultiplier = {
                'clear': 0.5,
                'partly-cloudy': 1,
                'cloudy': 1.5,
                'drizzle': 1.6,
                'rainy': 1.8,
                'stormy': 2,
                'snowy': 1.3,
                'foggy': 1.6
            };
            return Math.min(baseOpacity * (opacityMultiplier[weather] || 1), 1);
        }

        // Update clock every second
        updateClock();
        setInterval(updateClock, 1000);

        // Update on window resize
        window.addEventListener('resize', updateClock);