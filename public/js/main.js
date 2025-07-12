// Mobile Navigation Toggle
document.addEventListener("DOMContentLoaded", () => {
  const navToggle = document.getElementById("nav-toggle")
  const navMenu = document.getElementById("nav-menu")

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      navMenu.classList.toggle("active")
    })

    // Close menu when clicking on a link
    const navLinks = document.querySelectorAll(".nav-link")
    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        navMenu.classList.remove("active")
      })
    })
  }

  // Simulation Timeline Controls
  const timeSlider = document.getElementById("time-slider")
  const simulationMap = document.getElementById("simulation-map")
  const currentTimeDisplay = document.getElementById("current-time")
  const playBtn = document.getElementById("play-btn")
  const pauseBtn = document.getElementById("pause-btn")
  const resetBtn = document.getElementById("reset-btn")

  if (timeSlider && simulationMap) {
    const timeLabels = ["1 Hour", "2 Hours", "3 Hours", "6 Hours", "12 Hours", "24 Hours"]
    const mapImages = [
      "/placeholder.svg?height=500&width=800&text=1h",
      "/placeholder.svg?height=500&width=800&text=3h",
      "/placeholder.svg?height=500&width=800&text=6h",
      "/placeholder.svg?height=500&width=800&text=12h",
      "/placeholder.svg?height=500&width=800&text=24h",
    ]

    let isPlaying = false
    let playInterval

    timeSlider.addEventListener("input", function () {
      const timeIndex = Number.parseInt(this.value)
      updateSimulation(timeIndex)
    })

    function updateSimulation(timeIndex) {
      if (simulationMap && currentTimeDisplay) {
        simulationMap.src = mapImages[timeIndex]
        currentTimeDisplay.textContent = timeLabels[timeIndex]
      }
    }

    if (playBtn) {
      playBtn.addEventListener("click", () => {
        if (!isPlaying) {
          isPlaying = true
          playInterval = setInterval(() => {
            let currentValue = Number.parseInt(timeSlider.value)
            if (currentValue < 5) {
              currentValue++
              timeSlider.value = currentValue
              updateSimulation(currentValue)
            } else {
              // Reset to beginning
              timeSlider.value = 0
              updateSimulation(0)
            }
          }, 2000) // Change every 2 seconds
        }
      })
    }

    if (pauseBtn) {
      pauseBtn.addEventListener("click", () => {
        isPlaying = false
        clearInterval(playInterval)
      })
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        isPlaying = false
        clearInterval(playInterval)
        timeSlider.value = 0
        updateSimulation(0)
      })
    }
  }

  // Download Page Filters
  const mapTypeFilter = document.getElementById("map-type")
  const regionFilter = document.getElementById("region-filter")

  if (mapTypeFilter || regionFilter) {
    function filterMaps() {
      const mapCards = document.querySelectorAll(".map-card")
      const selectedType = mapTypeFilter ? mapTypeFilter.value : "all"
      const selectedRegion = regionFilter ? regionFilter.value : "all"

      mapCards.forEach((card) => {
        const cardType = card.querySelector(".map-type-badge").textContent.toLowerCase()
        const cardRegion = card.querySelector(".map-details").textContent.toLowerCase()

        let showCard = true

        if (selectedType !== "all" && !cardType.includes(selectedType)) {
          showCard = false
        }

        if (selectedRegion !== "all" && !cardRegion.includes(selectedRegion)) {
          showCard = false
        }

        card.style.display = showCard ? "block" : "none"
      })
    }

    if (mapTypeFilter) {
      mapTypeFilter.addEventListener("change", filterMaps)
    }

    if (regionFilter) {
      regionFilter.addEventListener("change", filterMaps)
    }
  }

  // Form Validation
  const forms = document.querySelectorAll("form")
  forms.forEach((form) => {
    form.addEventListener("submit", (e) => {
      const requiredFields = form.querySelectorAll("[required]")
      let isValid = true

      requiredFields.forEach((field) => {
        if (!field.value.trim()) {
          isValid = false
          field.style.borderColor = "#FF5A5F"
        } else {
          field.style.borderColor = "#DDDDDD"
        }
      })

      if (!isValid) {
        e.preventDefault()
        alert("Please fill in all required fields.")
      }
    })
  })

  // Set minimum date to today for date inputs
  const dateInputs = document.querySelectorAll('input[type="date"]')
  const today = new Date().toISOString().split("T")[0]
  dateInputs.forEach((input) => {
    input.min = today
  })

  // Fire Analysis Functionality (Merged Predict + Simulate)
  const L = window.L // Declare the L variable

  const map = L.map("uttarakhand-map").setView([30.3165, 78.0322], 8)

  L.tileLayer("https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
    maxZoom: 20,
    subdomains: ["mt0", "mt1", "mt2", "mt3"],
    attribution: "Map data © Google",
  }).addTo(map)

  fetch("/js/uttrakhand.geojson")
    .then((response) => response.json())
    .then((data) => {
      const boundaryLayer = L.geoJSON(data)
      boundaryLayer.addTo(map)

      // Get bounds of the geojson
      const bounds = boundaryLayer.getBounds()

      // Fit map to the boundary
      map.fitBounds(bounds)

      // Restrict panning outside Uttarakhand
      map.setMaxBounds(bounds)
      // map.setMinZoom(map.getZoom()); // Optional: lock zoom out

      // Prevent dragging too far outside
      map.on("drag", () => {
        map.panInsideBounds(bounds, { animate: true })
      })
    })

  let fireMarker = null
  let fireCircle = null // ⚠️ Added for circle
  let selectedCoords = null

    map.on("mousemove", function (e) {
    const lat = e.latlng.lat.toFixed(5);
    const lng = e.latlng.lng.toFixed(5);
    document.getElementById("coordsDisplay").textContent = `Lat: ${lat}, Lng: ${lng}`;
  });


  // Map click handler
  map.on("click", (e) => {
    const { lat, lng } = e.latlng
    selectedCoords = `${lat},${lng}`

    // Remove existing marker
    if (fireMarker) {
      map.removeLayer(fireMarker)
    }

    // ⚠️ Remove existing circle
    if (fireCircle) {
      map.removeLayer(fireCircle)
    }

    // Add new fire marker
    const fireIcon = L.divIcon({
      className: "custom-fire-icon",
      html: "📍",
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    })

    fireMarker = L.marker([lat, lng], { icon: fireIcon }).addTo(map)

    // ⚠️ Add 30m radius circle
    fireCircle = L.circle([lat, lng], {
      radius: 30,
      color: "red",
      fillColor: "#f03",
      fillOpacity: 0.3,
    }).addTo(map)

    document.getElementById("ignition-coords").value = selectedCoords

    // Enable buttons
    const predictBtn = document.getElementById("predict-fire-btn")
    const simulateBtn = document.getElementById("simulate-fire-btn")

    if (predictBtn) {
      predictBtn.disabled = false
      predictBtn.classList.remove("btn-disabled")
    }

    if (simulateBtn) {
      simulateBtn.disabled = false
      simulateBtn.classList.remove("btn-disabled")
    }

    console.log("Point selected:", lat, lng)
  })

  // Predict Fire Risk Button Handler
  document.getElementById("predict-fire-btn").addEventListener("click", async () => {
    if (!selectedCoords) {
      alert("Please click on the map to select a point first.")
      return
    }

    const predictBtn = document.getElementById("predict-fire-btn")
    const originalText = predictBtn.textContent

    // Show loading state
    predictBtn.disabled = true
    predictBtn.classList.add("btn-loading")
    predictBtn.textContent = "Predicting..."

    try {
      const response = await fetch("/simulate-fire", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ coords: selectedCoords }),
      })

      const data = await response.json()

      if (data.success) {
        const envData = data.data
        const prediction = data.prediction

        // Update environmental data display
        updateEnvironmentalData(envData)

        // Show prediction results
        showPredictionResults(prediction)

        console.log("Environmental Data:", envData)
        console.log("Prediction:", prediction)
      } else {
        alert("Error: " + data.message)
      }
    } catch (err) {
      console.error("Prediction Error:", err)
      alert("Something went wrong while predicting fire risk.")
    } finally {
      // Reset button state
      predictBtn.disabled = false
      predictBtn.classList.remove("btn-loading")
      predictBtn.textContent = originalText
    }
  })

  // Simulate Fire Spread Button Handler
  document.getElementById("simulate-fire-btn").addEventListener("click", async () => {
    if (!selectedCoords) {
      alert("Please click on the map to select a point first.")
      return
    }

    const simulateBtn = document.getElementById("simulate-fire-btn")
    const originalText = simulateBtn.textContent

    // Show loading state
    simulateBtn.disabled = true
    simulateBtn.classList.add("btn-loading")
    simulateBtn.textContent = "Simulating..."

    try {
      // First get environmental data and prediction
      const response = await fetch("/simulate-fire", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ coords: selectedCoords }),
      })

      const data = await response.json()

      if (data.success) {
        const envData = data.data
        const prediction = data.prediction

        // Update environmental data display
        updateEnvironmentalData(envData)

        // Show prediction results
        showPredictionResults(prediction)

        // Show simulation results after a delay
        // setTimeout(() => {
        //   const simulationResults = document.getElementById("simulation-results")
        //   if (simulationResults) {
        //     simulationResults.style.display = "block"
        //     simulationResults.classList.add("fade-in")

        //     // Scroll to results
        //     simulationResults.scrollIntoView({
        //       behavior: "smooth",
        //       block: "start",
        //     })
        //   }
        // }, 1000)

        console.log("Simulation Data:", envData)
        console.log("Prediction:", prediction)
      } else {
        alert("Error: " + data.message)
      }
    } catch (err) {
      console.error("Simulation Error:", err)
      alert("Something went wrong while simulating fire spread.")
    } finally {
      // Reset button state
      simulateBtn.disabled = false
      simulateBtn.classList.remove("btn-loading")
      simulateBtn.textContent = originalText
    }
  })

  // Reset Analysis Button Handler
  document.getElementById("reset-analysis").addEventListener("click", () => {
    // Hide results
    const predictionResults = document.getElementById("prediction-results")
    const simulationResults = document.getElementById("simulation-results")

    if (predictionResults) predictionResults.style.display = "none"
    if (simulationResults) simulationResults.style.display = "none"

    // Clear marker
    if (fireMarker) {
      map.removeLayer(fireMarker)
      fireMarker = null
    }

    // Reset coordinates
    selectedCoords = null
    document.getElementById("ignition-coords").value = ""

    // Disable buttons
    const predictBtn = document.getElementById("predict-fire-btn")
    const simulateBtn = document.getElementById("simulate-fire-btn")

    if (predictBtn) {
      predictBtn.disabled = true
      predictBtn.classList.add("btn-disabled")
    }

    if (simulateBtn) {
      simulateBtn.disabled = true
      simulateBtn.classList.add("btn-disabled")
    }

    // Reset environmental data
    resetEnvironmentalData()

    // Scroll back to map
    document.getElementById("uttarakhand-map").scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  })

  // Helper function to update environmental data display
  function updateEnvironmentalData(envData) {
    document.getElementById("temp-value").textContent = `${Math.round(envData.lst || 0)}°C`
    document.getElementById("humidity-value").textContent = `${Math.round(envData.relative_humidity || 0)}%`
    document.getElementById("ndvi-value").textContent = (envData.ndvi || 0).toFixed(3)
    document.getElementById("elevation-value").textContent = `${Math.round(envData.elevation || 0)}m`
    document.getElementById("wind-speed-value").textContent = `${(envData.wind_speed || 0).toFixed(3)} km/h`
    document.getElementById("slope-value").textContent = `${Math.round(envData.slope || 0)}°`
  }

  // Helper function to show prediction results
  function showPredictionResults(prediction) {
    const predictionResults = document.getElementById("prediction-results")
    const confidenceValue = document.getElementById("confidence-value")
    const riskLabel = document.getElementById("risk-label")

    if (predictionResults && confidenceValue && riskLabel) {
      confidenceValue.textContent = (prediction.confidence || 0).toFixed(3)
      riskLabel.textContent = prediction.label || "UNKNOWN"

      // Add appropriate risk class
      riskLabel.className = "prediction-value risk-label"
      if (prediction.label === "NO FIRE") {
        riskLabel.classList.add("low-risk")
      } else if (prediction.label === "FIRE") {
        riskLabel.classList.add("high-risk")
      }

      predictionResults.style.display = "block"
      predictionResults.classList.add("fade-in")
    }
  }

  // Helper function to reset environmental data
  function resetEnvironmentalData() {
    document.getElementById("temp-value").textContent = "--°C"
    document.getElementById("humidity-value").textContent = "--%"
    document.getElementById("ndvi-value").textContent = "--"
    document.getElementById("elevation-value").textContent = "--m"
    document.getElementById("wind-speed-value").textContent = "-- km/h"
    document.getElementById("slope-value").textContent = "--°"
  }

  // Initialize with disabled buttons
  const predictBtn = document.getElementById("predict-fire-btn")
  const simulateBtn = document.getElementById("simulate-fire-btn")

  if (predictBtn) {
    predictBtn.disabled = true
    predictBtn.classList.add("btn-disabled")
  }

  if (simulateBtn) {
    simulateBtn.disabled = true
    simulateBtn.classList.add("btn-disabled")
  }
})

// ===== ADDITIONAL CODE FOR IGNITIA THEME =====

// Smooth scrolling for navigation links
document.addEventListener("DOMContentLoaded", () => {
  // Add smooth scrolling to hero button
  const heroButton = document.querySelector(".hero-actions .btn-primary")
  if (heroButton) {
    heroButton.addEventListener("click", (e) => {
      e.preventDefault()
      window.location.href = "/simulate"
    })
  }

  // Add loading animation to buttons
  const buttons = document.querySelectorAll(".btn")
  buttons.forEach((button) => {
    button.addEventListener("click", function () {
      if (!this.disabled && !this.classList.contains("btn-loading")) {
        this.style.transform = "scale(0.98)"
        setTimeout(() => {
          this.style.transform = ""
        }, 150)
      }
    })
  })

  // Add fade-in animation to cards on scroll
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1"
        entry.target.style.transform = "translateY(0)"
      }
    })
  }, observerOptions)

  // Observe info cards
  const infoCards = document.querySelectorAll(".info-card")
  infoCards.forEach((card) => {
    card.style.opacity = "0"
    card.style.transform = "translateY(20px)"
    card.style.transition = "opacity 0.6s ease, transform 0.6s ease"
    observer.observe(card)
  })
})
