"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { MapPinIcon, XIcon, LoaderIcon } from "lucide-react"

interface Suggestion {
  display_name: string
  lat: string
  lon: string
  type: string
  name: string
  address: {
    road?: string
    neighbourhood?: string
    suburb?: string
    city?: string
    town?: string
    village?: string
    hamlet?: string
    county?: string
    state?: string
    country?: string
    postcode?: string
  }
}

interface LocationPickerProps {
  value: string
  onChange: (location: string, lat: number, lng: number) => void
}

function getTypeIcon(type: string): string {
  if (["city", "town", "village", "hamlet"].includes(type)) return "🏙️"
  if (["administrative", "state", "region", "county"].includes(type)) return "🗺️"
  if (type === "country") return "🌍"
  if (["airport", "aerodrome"].includes(type)) return "✈️"
  if (["university", "school", "college"].includes(type)) return "🎓"
  if (["hospital", "clinic"].includes(type)) return "🏥"
  if (["park", "nature_reserve", "forest", "wood"].includes(type)) return "🌿"
  if (["beach", "bay", "lake", "river", "water"].includes(type)) return "💧"
  if (["mountain", "peak", "hill", "volcano"].includes(type)) return "⛰️"
  if (["restaurant", "cafe", "bar", "fast_food"].includes(type)) return "🍽️"
  if (["hotel", "hostel", "motel"].includes(type)) return "🏨"
  if (["museum", "gallery", "theatre"].includes(type)) return "🏛️"
  if (["station", "bus_stop", "subway"].includes(type)) return "🚉"
  return "📍"
}

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const debounceRef = useRef<any>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [inputValue, setInputValue] = useState(value || "")
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

  // Init Leaflet map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const initMap = async () => {
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link")
        link.id = "leaflet-css"
        link.rel = "stylesheet"
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        document.head.appendChild(link)
      }
      await new Promise(r => setTimeout(r, 100))

      const Lmod = await import("leaflet")
      const L = Lmod.default || (Lmod as any)
      ;(window as any)._L = L

      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      })

      const map = L.map(mapRef.current!, { zoomControl: true, scrollWheelZoom: true })
        .setView([20, 0], 2)

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      // Click on map → reverse geocode and pin
      map.on("click", async (e: any) => {
        const { lat, lng } = e.latlng
        const { label, fullName } = await reverseGeocode(lat, lng)
        pinLocation(lat, lng, fullName)
      })

      mapInstanceRef.current = map
      setMapLoaded(true)
    }

    initMap()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        markerRef.current = null
      }
    }
  }, [])

  // Reverse geocode → returns exact name + full display name
  const reverseGeocode = async (lat: number, lng: number): Promise<{ label: string; fullName: string }> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18`,
        { headers: { "Accept-Language": "en" } }
      )
      const data = await res.json()
      // Use full display_name for exact location
      const fullName = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      const label = fullName.split(",").slice(0, 4).join(",").trim()
      return { label, fullName }
    } catch {
      const fallback = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      return { label: fallback, fullName: fallback }
    }
  }

  // Pin location on map with popup showing name + coords
  const pinLocation = (lat: number, lng: number, label: string) => {
    const L = (window as any)._L
    if (!mapInstanceRef.current || !L) return

    if (markerRef.current) {
      markerRef.current.remove()
      markerRef.current = null
    }

    const popupContent = `
      <div style="font-family:sans-serif;min-width:180px">
        <b style="font-size:13px;color:#111">${label.split(",").slice(0, 2).join(",")}</b>
        <div style="margin-top:6px;padding:6px 8px;background:#f0fdf4;border-radius:6px;border:1px solid #bbf7d0">
          <div style="font-size:11px;color:#166534;font-weight:600">📍 Coordinates</div>
          <div style="font-size:11px;color:#15803d;margin-top:2px">Lat: ${lat.toFixed(6)}</div>
          <div style="font-size:11px;color:#15803d">Lng: ${lng.toFixed(6)}</div>
        </div>
      </div>
    `

    markerRef.current = L.marker([lat, lng])
      .addTo(mapInstanceRef.current)
      .bindPopup(popupContent, { maxWidth: 220 })
      .openPopup()

    mapInstanceRef.current.flyTo([lat, lng], 15, { duration: 1.2 })

    setInputValue(label.split(",").slice(0, 4).join(",").trim())
    setCoords({ lat, lng })
    onChange(label.split(",").slice(0, 4).join(",").trim(), lat, lng)
  }

  // Fetch suggestions — no featuretype filter so all place types show
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=8&addressdetails=1&namedetails=1`,
        { headers: { "Accept-Language": "en" } }
      )
      const data: Suggestion[] = await res.json()
      setSuggestions(data)
      setShowDropdown(data.length > 0)
      setActiveIdx(-1)
    } catch {
      setSuggestions([])
    }
    setLoading(false)
  }, [])

  const handleInput = (val: string) => {
    setInputValue(val)
    clearTimeout(debounceRef.current)
    if (!val.trim()) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 250)
  }

  // Select suggestion → use full display_name as exact location
  const handleSelect = (s: Suggestion) => {
    const lat = parseFloat(s.lat)
    const lng = parseFloat(s.lon)
    // Use full display_name trimmed to first 4 parts for exact location
    const exactName = s.display_name.split(",").slice(0, 4).join(",").trim()
    setShowDropdown(false)
    setSuggestions([])
    setActiveIdx(-1)
    pinLocation(lat, lng, s.display_name)
    inputRef.current?.blur()
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === "Enter" && activeIdx >= 0) { e.preventDefault(); handleSelect(suggestions[activeIdx]) }
    else if (e.key === "Escape") setShowDropdown(false)
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setShowDropdown(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleClear = () => {
    setInputValue("")
    setSuggestions([])
    setShowDropdown(false)
    setCoords(null)
    onChange("", 0, 0)
    if (markerRef.current && mapInstanceRef.current) {
      markerRef.current.remove()
      markerRef.current = null
      mapInstanceRef.current.setView([20, 0], 2)
    }
    inputRef.current?.focus()
  }

  return (
    <div className="space-y-2">
      {/* Search input */}
      <div className="relative" ref={dropdownRef}>
        <div className="relative flex items-center">
          <MapPinIcon className="absolute left-3 w-4 h-4 text-green-400 pointer-events-none z-10 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search exact location, landmark, address..."
            value={inputValue}
            onChange={e => handleInput(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            className="w-full bg-white/5 border border-white/20 text-white placeholder-white/40 rounded-xl pl-9 pr-10 py-2.5 text-sm focus:outline-none focus:border-green-500/60 focus:bg-white/10 transition-all h-10 sm:h-12"
          />
          <div className="absolute right-3">
            {loading
              ? <LoaderIcon className="w-4 h-4 text-white/40 animate-spin" />
              : inputValue
                ? <button type="button" onClick={handleClear} className="text-white/40 hover:text-white transition-colors"><XIcon className="w-4 h-4" /></button>
                : null
            }
          </div>
        </div>

        {/* Autocomplete dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800/98 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl z-[9999] overflow-hidden">
            <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between">
              <span className="text-white/40 text-xs">{suggestions.length} results found</span>
              <span className="text-white/30 text-xs">↑↓ navigate · Enter select</span>
            </div>

            {suggestions.map((s, i) => {
              const icon = getTypeIcon(s.type)
              const isActive = i === activeIdx
              // First part = exact name, rest = context
              const parts = s.display_name.split(",")
              const exactName = parts.slice(0, 2).join(",").trim()
              const context = parts.slice(2, 5).join(",").trim()
              const lat = parseFloat(s.lat).toFixed(5)
              const lng = parseFloat(s.lon).toFixed(5)

              return (
                <button
                  key={i}
                  type="button"
                  onMouseDown={() => handleSelect(s)}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={`w-full flex items-start gap-3 px-4 py-3 transition-colors text-left border-b border-white/5 last:border-0 ${
                    isActive ? "bg-green-500/15" : "hover:bg-white/8"
                  }`}
                >
                  <span className="text-base mt-0.5 shrink-0">{icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium leading-tight truncate">{exactName}</p>
                    <p className="text-white/40 text-xs mt-0.5 truncate">{context}</p>
                    <p className="text-green-400/60 text-xs mt-0.5">{lat}, {lng}</p>
                  </div>
                  {isActive && <span className="text-green-400 text-xs shrink-0 mt-0.5">↵</span>}
                </button>
              )
            })}

            <div className="px-4 py-2 border-t border-white/10">
              <span className="text-white/20 text-xs">© OpenStreetMap contributors</span>
            </div>
          </div>
        )}
      </div>

      {/* Coordinates display */}
      {coords && (
        <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2">
          <MapPinIcon className="w-3.5 h-3.5 text-green-400 shrink-0" />
          <div className="flex gap-4 text-xs">
            <span className="text-green-300">Lat: <span className="font-mono font-semibold">{coords.lat.toFixed(6)}</span></span>
            <span className="text-green-300">Lng: <span className="font-mono font-semibold">{coords.lng.toFixed(6)}</span></span>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10">
        {!mapLoaded && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-800/80">
            <div className="flex items-center gap-2 text-white/50 text-sm">
              <LoaderIcon className="w-4 h-4 animate-spin" />
              Loading map...
            </div>
          </div>
        )}
        <div ref={mapRef} className="w-full h-72 sm:h-96" />

        {mapLoaded && !coords && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[400] pointer-events-none">
            <div className="bg-black/60 backdrop-blur-sm text-white/70 text-xs px-3 py-1.5 rounded-full whitespace-nowrap">
              🗺️ Search above or click anywhere on the map
            </div>
          </div>
        )}

        {coords && (
          <div className="absolute top-3 right-3 z-[400] pointer-events-none">
            <div className="bg-black/70 backdrop-blur-sm border border-green-500/30 text-green-300 text-xs px-2.5 py-1.5 rounded-xl font-mono">
              {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
