"use client"

import { useEffect, useRef, useState } from "react"
import { MapPinIcon, SearchIcon, XIcon } from "lucide-react"

interface LocationPickerProps {
  value: string
  onChange: (location: string, lat: number, lng: number) => void
}

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [search, setSearch] = useState("")
  const [searching, setSearching] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState(value || "")

  // Reverse geocode lat/lng → place name using Nominatim
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { "Accept-Language": "en" } }
      )
      const data = await res.json()
      const { city, town, village, state, country } = data.address || {}
      const place = city || town || village || state || ""
      return place && country ? `${place}, ${country}` : data.display_name?.split(",").slice(0, 2).join(",").trim() || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    } catch {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    }
  }

  // Search for a place using Nominatim
  const handleSearch = async () => {
    if (!search.trim() || !mapInstanceRef.current) return
    setSearching(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(search)}&format=json&limit=1`,
        { headers: { "Accept-Language": "en" } }
      )
      const results = await res.json()
      if (results.length > 0) {
        const { lat, lon, display_name } = results[0]
        const latNum = parseFloat(lat)
        const lngNum = parseFloat(lon)
        mapInstanceRef.current.setView([latNum, lngNum], 12)
        placeMarker(latNum, lngNum, display_name.split(",").slice(0, 2).join(",").trim())
      }
    } catch {}
    setSearching(false)
  }

  const placeMarker = (lat: number, lng: number, label: string) => {
    if (!mapInstanceRef.current) return
    const L = (window as any).L
    if (markerRef.current) markerRef.current.remove()
    markerRef.current = L.marker([lat, lng]).addTo(mapInstanceRef.current)
    setSelectedLabel(label)
    onChange(label, lat, lng)
  }

  // Init Leaflet map (dynamic import to avoid SSR issues)
  useEffect(() => {
    if (!showMap || !mapRef.current || mapInstanceRef.current) return

    const initMap = async () => {
      // Dynamically load Leaflet CSS
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link")
        link.id = "leaflet-css"
        link.rel = "stylesheet"
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        document.head.appendChild(link)
      }

      const L = await import("leaflet")
      ;(window as any).L = L.default || L

      // Fix default marker icons
      const LLeaflet = (window as any).L
      delete LLeaflet.Icon.Default.prototype._getIconUrl
      LLeaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      })

      const map = LLeaflet.map(mapRef.current!).setView([20, 0], 2)
      LLeaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map)

      map.on("click", async (e: any) => {
        const { lat, lng } = e.latlng
        const label = await reverseGeocode(lat, lng)
        placeMarker(lat, lng, label)
      })

      mapInstanceRef.current = map
    }

    initMap()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        markerRef.current = null
      }
    }
  }, [showMap])

  return (
    <div className="space-y-2">
      {/* Display selected location */}
      <div
        className="flex items-center gap-2 w-full bg-white/5 border border-white/20 text-white rounded-xl px-3 h-10 sm:h-12 cursor-pointer hover:bg-white/10 transition-colors"
        onClick={() => setShowMap(true)}
      >
        <MapPinIcon className="w-4 h-4 text-green-400 shrink-0" />
        <span className={`text-sm flex-1 truncate ${selectedLabel ? "text-white" : "text-white/40"}`}>
          {selectedLabel || "Click to select location on map"}
        </span>
        {selectedLabel && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); setSelectedLabel(""); onChange("", 0, 0) }}
            className="text-white/40 hover:text-white"
          >
            <XIcon className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Map modal */}
      {showMap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowMap(false)} />
          <div className="relative bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <MapPinIcon className="w-4 h-4 text-green-400" />
                <span className="text-white font-medium text-sm">Select Project Location</span>
              </div>
              <button onClick={() => setShowMap(false)} className="text-white/40 hover:text-white">
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Search bar */}
            <div className="flex gap-2 px-4 py-3 border-b border-white/10">
              <input
                type="text"
                placeholder="Search for a city or place..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                className="flex-1 bg-white/5 border border-white/20 text-white placeholder-white/40 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-white/40"
              />
              <button
                type="button"
                onClick={handleSearch}
                disabled={searching}
                className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-4 py-2 text-sm flex items-center gap-1 disabled:opacity-50"
              >
                <SearchIcon className="w-4 h-4" />
                {searching ? "..." : "Search"}
              </button>
            </div>

            {/* Map */}
            <div ref={mapRef} className="w-full h-80" />

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
              <p className="text-white/40 text-xs">
                {selectedLabel ? `📍 ${selectedLabel}` : "Click anywhere on the map to pin your location"}
              </p>
              <button
                type="button"
                onClick={() => setShowMap(false)}
                disabled={!selectedLabel}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white rounded-xl px-4 py-2 text-sm font-medium"
              >
                Confirm Location
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
