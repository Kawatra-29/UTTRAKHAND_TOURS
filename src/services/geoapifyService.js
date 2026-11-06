const BASE = 'https://api.geoapify.com/v1'
const key = import.meta.env.VITE_GEOAPIFY_API_KEY?.trim()

export function hasGeoapifyKey() { return Boolean(key && key !== 'your_geoapify_api_key_here') }

export async function searchPlaces(query, signal) {
  if (!hasGeoapifyKey()) throw new Error('Add your Geoapify API key to .env.local to search locations.')
  const params = new URLSearchParams({ text: query, format: 'geojson', filter: 'countrycode:in', limit: '10', apiKey: key })
  const response = await fetch(`${BASE}/geocode/autocomplete?${params}`, { signal })
  if (!response.ok) throw new Error(response.status === 429 ? 'Location search limit reached. Please wait and try again.' : 'Location search failed. Check your API key and connection.')
  const data = await response.json()
  return (data.features || []).map(({ properties: p, geometry: g }) => ({ label: p.formatted, lat: g.coordinates[1], lon: g.coordinates[0], placeId: p.place_id }))
}

export async function getRoadRoute(from, to) {
  if (!hasGeoapifyKey()) throw new Error('Add your Geoapify API key to .env.local to calculate a route.')
  if (from.placeId && to.placeId && from.placeId === to.placeId) throw new Error('Pickup and destination must be different places.')
  if (Math.abs(from.lat - to.lat) < 0.000001 && Math.abs(from.lon - to.lon) < 0.000001) throw new Error('Pickup and destination must be different places.')
  const params = new URLSearchParams({ waypoints: `${from.lat},${from.lon}|${to.lat},${to.lon}`, mode: 'drive', units: 'metric', apiKey: key })
  const response = await fetch(`${BASE}/routing?${params}`)
  if (!response.ok) throw new Error(response.status === 429 ? 'Routing limit reached. Please try again shortly.' : 'Could not calculate the road route. Check your API key and try again.')
  const data = await response.json()
  // GeoJSON routing responses put whole-route distance/time on feature properties.
  // Legs expose distance/time directly too; neither object uses a `summary` field.
  const properties = data.features?.[0]?.properties
  const legs = properties?.legs || []
  const distanceMeters = Number.isFinite(properties?.distance)
    ? properties.distance
    : legs.reduce((sum, leg) => sum + (Number.isFinite(leg.distance) ? leg.distance : 0), 0)
  const durationSeconds = Number.isFinite(properties?.time)
    ? properties.time
    : legs.reduce((sum, leg) => sum + (Number.isFinite(leg.time) ? leg.time : 0), 0)
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) throw new Error('No drivable route was found between these locations.')
  return { distanceKm: distanceMeters / 1000, durationSeconds: durationSeconds || undefined, fromLabel: from.label, toLabel: to.label }
}
