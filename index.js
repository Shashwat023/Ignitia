const express = require("express")
const app = express()
// const methodOverride = require("method-override");
const path = require("path")
const ejsMate = require("ejs-mate")
const { execFile } = require("child_process")
const axios = require("axios")

app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "views"))
app.use(express.urlencoded({ extended: true }))
// app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "/public")))
app.use("/media", express.static(path.join(__dirname, "media")));
app.use(express.json())
app.engine("ejs", ejsMate)

app.listen(8080, () => {
  console.log("server is listening")
})

app.get("/", (req, res) => {
  res.render("index", {
    title: "Home",
    currentPage: "home",
  })
})

app.get("/simulate", (req, res) => {
  res.render("simulate", {
    title: "Predict & Simulate",
    currentPage: "simulate",
  })
})

app.post("/simulate-fire", async (req, res) => {
  const { coords } = req.body
  if (!coords) return res.status(400).json({ message: "Coordinates are required." })

  const [lat, lon] = coords.split(",").map(Number)
  const year = new Date().getFullYear()

  const scriptPath = path.join(__dirname, "./py_files/extract_data.py")

  // STEP 1: Run extract_data.py
  execFile("python", [scriptPath, lat, lon, year], async (error, stdout, stderr) => {
    if (error) {
      console.error("❌ Python error:", error)
      return res.status(500).json({ message: "Python script error." })
    }

    try {
      const extractedData = JSON.parse(stdout) // This is GEE + weather data

      // STEP 2: Prepare model input (pick only needed keys)
      const modelInput = {
        lat: extractedData.lat,
        lon: extractedData.lon,
        elevation: extractedData.elevation,
        ndvi: extractedData.ndvi,
        lst: extractedData.lst,
        slope: extractedData.slope,
        aspect: extractedData.aspect,
        land_cover_type: extractedData.land_cover_type,
        relative_humidity: extractedData.relative_humidity,
        wind_speed: extractedData.wind_speed,
        month: new Date().getMonth() + 1, // Current month (1–12)
      }

      // STEP 3: Send to FastAPI model
      const fastapiResponse = await axios.post("http://localhost:8000/predict_point", modelInput)
      const prediction = fastapiResponse.data

      // STEP 4: Send back to frontend
      return res.json({
        success: true,
        data: extractedData,
        prediction: prediction,
      })
    } catch (err) {
      console.error("❌ Failed to parse/forward data:", err)
      return res.status(500).json({ message: "Failed to process prediction." })
    }
  })
})

app.get("/simulate_fire_redirect", (req, res) => {
  const { lat, lon } = req.query
  res.redirect(`/index.html?lat=${lat}&lon=${lon}`)
})

// ===== ADDITIONAL ROUTES FOR IGNITIA =====

// Sources page route
app.get("/sources", (req, res) => {
  res.render("sources", {
    title: "Sources",
    currentPage: "sources",
  })
})

// About page route
app.get("/about", (req, res) => {
  res.render("about", {
    title: "About",
    currentPage: "about",
  })
})
