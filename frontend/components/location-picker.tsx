"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { MapPinIcon, SearchIcon, XIcon, LoaderIcon } from "lucide-react"

interface Suggestion {
  display_name: string
  lat: string
  lon: string
  address: {
    city?: string
    town?: string
    village?: string
    state?: string
    country?: string
  }
}

interface LocationPickerProps {
  value: string
  onChange: (location: string, lat: number, lng: number) => void
}

function formatLabel(s: Suggestion): string {
  const { city, town, village, state, country } = s.address || {}
  const place = city || town || village || ""
  if (place && state && country) return `${place}, ${state}, ${country}`
  if (place && country) return `${place}, ${country}`
  if (state && country) return `${state}, ${country}`
  return s.display_name.split(",").slice(0, 3).join(",").trim()
}

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const debounceRef = useRef<any>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [inputValue, setInputValue] = useState(value || "")
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [mapReady, setMapReady] = useState(false)

  // Fetch suggestions from Nominatim
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.trim().length < 2) { setSuggestions([]); setShowDropdown(false); return }
    setLoading(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1`,
        { headers: { "Accept-Language": "en" } }
      )
      const data: Suggestion[] = await res.json()
      setSuggestions(data)
      setShowDropdown(data.length > 0)
    } catch {
      setSuggestions([])
    }
    setLoading(false)
  }, [])

  // Debounce input
  const handleInput = (val: string) => {
    setInputValue(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300)
  }

  // Select a suggestion
  const handleSelect = (s: Suggestion) => {
    const label = formatLabel(s)
    const lat = parseFloat(s.lat)
    const lng = parseFloat(s.lon)
    setInputValue(label)
    setSuggestions([])
    setShowDropdown(false)
    onChange(label, lat, lng)
    // Pan map if open
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 12)
      placeMarker(lat, lng, label)
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Reverse geocode
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        { headers: { "Accept-Language": "en" } }
      )
      const data = await res.json()
      const { city, town, village, state, country } = data.address || {}
      const place = city || town || village || ""
      if (place && state && country) return `${place}, ${state}, ${country}`
      if (place && country) return `${place}, ${country}`
      return data.display_name?.split(",").slice(0, 3).join(",").trim() || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    } catch {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    }
  }

  const placeMarker = (lat: number, lng: number, label: string) => {
    if (!mapInstanceRef.current) return
    const L = (window as any)._L
    if (markerRef.current) markerRef.current.remove()
    markerRef.current = L.marker([lat, lng]).addTo(mapInstanceRef.current)
    setInputValue(label)
    onChange(label, lat, lng)
  }

  // Init map
  useEffect(() => {
    if (!showMap || !mapRef.current || mapInstanceRef.current) return

    const initMap = async () => {
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link")
        link.id = "leaflet-css"
        link.rel = "stylesheet"
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        document.head.appendChild(link)
      }
      const Lmod = await import("leaflet")
      const L = Lmod.default || Lmod
      ;(window as any)._L = L
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      })
      const map = L.map(mapRef.current!).setView([20, 0], 2)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map)
      map.on("click", async (e: any) => {
        const { lat, lng } = e.latlng
        const label = await reverseGeocode(lat, lng)
        placeMarker(lat, lng, label)
      })
      mapInstanceRef.current = map
      setMapReady(true)
    }
    initMap()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        markerRef.current = null
        setMapReady(false)
      }
    }
  }, [showMap])

  const handleClear = () => {
    setInputValue("")
    setSuggestions([])
    setShowDropdown(false)
    onChange("", 0, 0)
  }

  return (
    <div className="space-y-2">
      {/* Input with autocomplete */}
      <div className="relative" ref={dropdownRef}>
        <div className="relative flex items-center">
          <MapPinIcon className="absolute left-3 w-4 h-4 text-green-400 pointer-events-none z-10" />
          <input
            type="text"
            placeholder="Type a city, country or address..."
            value={inputValue}
            onChange={e => handleInput(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            className="w-full bg-white/5 border border-white/20 text-white placeholder-white/40 rounded-xl pl-9 pr-16 py-2.5 text-sm focus:outline-none focus:border-green-500/50 focus:bg-white/10 transition-all h-10 sm:h-12"
          />
          {/* Right icons */}
          <div className="absolute right-2 flex items-center gap-1">
            {loading && <LoaderIcon className="w-4 h-4 text-white/40 animate-spin" />}
            {inputValue && !loading && (
              <button type="button" onClick={handleClear} className="text-white/40 hover:text-white p-1">
                <XIcon className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowMap(true)}
              className="text-white/40 hover:text-green-400 p-1 transition-colors"
              title="Pick on map"
            >
              <SearchIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Autocomplete dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-white/15 rounded-xl shadow-2xl z-50 overflow-hidden">
            {suggestions.map((s, i) => {
              const label = formatLabel(s)
              const sub = s.display_name.split(",").slice(1, 4).join(",").trim()
              return (
                <button
                  key={i}
                  type="button"
                  onMouseDown={() => handleSelect(s)}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left border-b border-white/5 last:border-0"
                >
                  <MapPinIcon className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{label}</p>
                    <p className="text-white/40 text-xs truncate">{sub}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Map modal */}
      {showMap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowMap(false)} />
          <div className="relative bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <MapPinIcon className="w-4 h-4 text-green-400" />
                <span className="text-white font-medium text-sm">Pick Location on Map</span>
              </div>
              <button onClick={() => setShowMap(false)} className="text-white/40 hover:text-white">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <div ref={mapRef} className="w-full h-80" />
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
              <p className="text-white/40 text-xs">
                {inputValue ? `📍 ${inputValue}` : "Click anywhere on the map to pin your location"}
              </p>
              <button
                type="button"
                onClick={() => setShowMap(false)}
                disabled={!inputValue}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white rounded-xl px-4 py-2 text-sm font-medium"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
