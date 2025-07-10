from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import rasterio
from rasterio.transform import rowcol
from pyproj import Transformer
from collections import deque
import traceback
import random
from concurrent.futures import ThreadPoolExecutor

app = Flask(__name__)
CORS(app)

# Load raster datasets
# landcover_dataset = rasterio.open('data/landcover.tif')
# elevation_dataset = rasterio.open('data/elevation.tif')

def load_raster(path):
    return rasterio.open(path)

with ThreadPoolExecutor() as executor:
    future1 = executor.submit(load_raster, 'data/landcover.tif')
    future2 = executor.submit(load_raster, 'data/elevation.tif')

    landcover_dataset = future1.result()
    elevation_dataset = future2.result()

# Coordinate transformers
lc_transformer = Transformer.from_crs("EPSG:4326", landcover_dataset.crs, always_xy=True)
el_transformer = Transformer.from_crs("EPSG:4326", elevation_dataset.crs, always_xy=True)

# Constants
BURNABLE_CODES = {0, 10, 20, 30, 40}

# Load arrays
landcover_array = landcover_dataset.read(1)
elevation_array = elevation_dataset.read(1)

@app.route('/')
def show_simulation_ui():
    lat = request.args.get('lat')
    lon = request.args.get('lon')
    return render_template('index.html', lat=lat, lon=lon)

@app.route('/simulate', methods=['POST'])
def simulate():
    data = request.get_json()
    lat = float(data.get('lat'))
    lon = float(data.get('lon'))
    hours = int(data.get('hours'))

    try:
        print("📥 Incoming request data:", data)

        visited = set()
        queue = deque()
        burned_pixels = []

        start = (lat, lon)
        queue.append((start, 0))
        visited.add(start)

        lat_step = 0.0003  # approx 30m
        lon_step = 0.0003

        while queue:
            (cur_lat, cur_lon), hour = queue.popleft()

            if hour > hours:
                continue

            burned_pixels.append([cur_lat, cur_lon])

            # Convert current (lat, lon) to both raster pixel locations
            x_lc, y_lc = lc_transformer.transform(cur_lon, cur_lat)
            row_lc, col_lc = rowcol(landcover_dataset.transform, x_lc, y_lc)

            x_el, y_el = el_transformer.transform(cur_lon, cur_lat)
            row_el, col_el = rowcol(elevation_dataset.transform, x_el, y_el)

            # Check bounds
            if not (0 <= row_lc < landcover_array.shape[0] and 0 <= col_lc < landcover_array.shape[1]):
                continue
            if not (0 <= row_el < elevation_array.shape[0] and 0 <= col_el < elevation_array.shape[1]):
                continue

            landcover_value = landcover_array[row_lc, col_lc]
            current_elevation = elevation_array[row_el, col_el]

            # Generate neighbors
            neighbors = []
            for dlat in [-lat_step, 0, lat_step]:
                for dlon in [-lon_step, 0, lon_step]:
                    if dlat == 0 and dlon == 0:
                        continue
                    nlat = cur_lat + dlat
                    nlon = cur_lon + dlon
                    neighbors.append((nlat, nlon))

            random.shuffle(neighbors)

            for nlat, nlon in neighbors:
                if (nlat, nlon) in visited:
                    continue

                x_lc_n, y_lc_n = lc_transformer.transform(nlon, nlat)
                r_lc_n, c_lc_n = rowcol(landcover_dataset.transform, x_lc_n, y_lc_n)

                x_el_n, y_el_n = el_transformer.transform(nlon, nlat)
                r_el_n, c_el_n = rowcol(elevation_dataset.transform, x_el_n, y_el_n)

                if not (0 <= r_lc_n < landcover_array.shape[0] and 0 <= c_lc_n < landcover_array.shape[1]):
                    continue
                if not (0 <= r_el_n < elevation_array.shape[0] and 0 <= c_el_n < elevation_array.shape[1]):
                    continue

                neighbor_lc = landcover_array[r_lc_n, c_lc_n]
                neighbor_el = elevation_array[r_el_n, c_el_n]

                if neighbor_lc in BURNABLE_CODES:
                    elevation_diff = neighbor_el - current_elevation
                    spread_chance = 0.45 + (elevation_diff * 0.0005)
                    spread_chance = max(0.05, min(spread_chance, 0.9))

                    if random.random() < spread_chance:
                        visited.add((nlat, nlon))
                        queue.append(((nlat, nlon), hour + 1))

            if len(burned_pixels) % 500 == 0:
                print(f"🔥 Burned so far: {len(burned_pixels)}")

        print(f"✅ Total burned: {len(burned_pixels)}")
        return jsonify({
            "burned_pixels": burned_pixels,
            "total_burned": len(burned_pixels),
            "hours_passed": hours
        })

    except Exception as e:
        print("❌ Error:", str(e))
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    
    

if __name__ == '__main__':
    app.run(debug=True)