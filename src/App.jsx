import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDownUp, ArrowRight, Check, Clock3, Compass, Mail, MapPin, MessageCircle, Mountain, Navigation, Phone, Route, ShieldCheck, X } from 'lucide-react'
import { BRAND_NAME, vehicles as initialVehicles } from './data/vehicles.js'
import { getRoadRoute, hasGeoapifyKey, searchPlaces } from './services/geoapifyService.js'
import { calculateFare, formatINR } from './utils/fareCalculator.js'

function PlaceInput({ id, label, placeholder, icon: Icon, value, setValue, selected, setSelected, error }) {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [open, setOpen] = useState(false)
  const timer = useRef(null)
  const controller = useRef(null)
  const requestId = useRef(0)

  useEffect(() => () => { clearTimeout(timer.current); controller.current?.abort() }, [])
  const handleChange = (next) => {
    setValue(next); setSelected(null); setSuggestions([]); setSearchError('')
    clearTimeout(timer.current); controller.current?.abort()
    if (next.trim().length < 3) { setLoading(false); return }
    setLoading(true); setOpen(true)
    const thisRequest = ++requestId.current
    timer.current = setTimeout(async () => {
      const abort = new AbortController(); controller.current = abort
      try {
        const results = await searchPlaces(next.trim(), abort.signal)
        if (thisRequest === requestId.current) { setSuggestions(results); if (!results.length) setSearchError('No matching places found. Try a nearby landmark or town.') }
      } catch (e) { if (e.name !== 'AbortError' && thisRequest === requestId.current) setSearchError(e.message) }
      finally { if (thisRequest === requestId.current) setLoading(false) }
    }, 350)
  }
  return <div className="field-wrap">
    <label className="field-label" htmlFor={id}>{label}</label>
    <div className={`location-input ${error ? 'has-error' : ''}`}>
      <Icon size={18} aria-hidden="true" />
      <input id={id} value={value} placeholder={placeholder} autoComplete="off" aria-autocomplete="list" aria-expanded={open && suggestions.length > 0} aria-controls={`${id}-suggestions`} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 130)} onChange={(e) => handleChange(e.target.value)} />
      {loading && <span className="spinner" aria-label="Searching" />}
      {selected && <Check size={17} className="input-check" aria-label="Location selected" />}
    </div>
    {error && <p className="field-error">{error}</p>}
    {open && (suggestions.length > 0 || searchError) && <div className="suggestions" id={`${id}-suggestions`} role="listbox">
      {suggestions.map((place) => <button type="button" role="option" aria-selected="false" className="suggestion" key={place.placeId} onMouseDown={(e) => e.preventDefault()} onClick={() => { setValue(place.label); setSelected(place); setSuggestions([]); setSearchError(''); setOpen(false) }}><MapPin size={16} /><span>{place.label}</span></button>)}
      {searchError && !suggestions.length && <p className="suggestion-message">{searchError}</p>}
    </div>}
  </div>
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return null
  const hours = Math.floor(seconds / 3600), minutes = Math.round((seconds % 3600) / 60)
  return hours ? `${hours} hr ${minutes} min` : `${minutes} min`
}

export default function App() {
  const vehicles = initialVehicles
  const [pickup, setPickup] = useState(''); const [destination, setDestination] = useState('')
  const [pickupPlace, setPickupPlace] = useState(null); const [destinationPlace, setDestinationPlace] = useState(null)
  const [route, setRoute] = useState(null); const [routeError, setRouteError] = useState(''); const [routeLoading, setRouteLoading] = useState(false)
  const [selectedId, setSelectedId] = useState(''); const [tollText, setTollText] = useState('')
  const [shortcutLoading, setShortcutLoading] = useState('')
  const [formErrors, setFormErrors] = useState({})

  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedId)
  const tollAmount = tollText.trim() === '' ? null : Number(tollText)
  const fare = useMemo(() => route && selectedVehicle?.ratePerKm ? calculateFare({ distanceKm: route.distanceKm, ratePerKm: selectedVehicle.ratePerKm, tollAmount: Number.isFinite(tollAmount) && tollAmount >= 0 ? tollAmount : null }) : null, [route, selectedVehicle, tollAmount])

  const invalidateRoute = () => { setRoute(null); setRouteError(''); setSelectedId(''); setTollText('') }
  const changePickup = (value) => { setPickup(value); setPickupPlace(null); invalidateRoute(); setFormErrors((e) => ({ ...e, pickup: '' })) }
  const changeDestination = (value) => { setDestination(value); setDestinationPlace(null); invalidateRoute(); setFormErrors((e) => ({ ...e, destination: '' })) }
  const swapPlaces = () => {
    invalidateRoute(); setPickup(destination); setDestination(pickup); setPickupPlace(destinationPlace); setDestinationPlace(pickupPlace)
  }
  const calculateRoute = async (event) => {
    event.preventDefault(); setRouteError('')
    const errors = {}
    if (!pickup.trim()) errors.pickup = 'Enter a pickup location.'
    else if (!pickupPlace) errors.pickup = 'Choose a location from the suggestions.'
    if (!destination.trim()) errors.destination = 'Enter a destination.'
    else if (!destinationPlace) errors.destination = 'Choose a location from the suggestions.'
    setFormErrors(errors)
    if (Object.keys(errors).length) return
    setRouteLoading(true); setRoute(null); setSelectedId(''); setTollText('')
    try { setRoute(await getRoadRoute(pickupPlace, destinationPlace)) }
    catch (error) { setRouteError(error.message) }
    finally { setRouteLoading(false) }
  }
  const selectVehicle = (id) => { setSelectedId(id) }
  const selectShortcut = async (placeName) => {
    setShortcutLoading(placeName); setRouteError('')
    try {
      const [place] = await searchPlaces(placeName)
      if (!place) throw new Error(`Could not find ${placeName}. Please search and select it manually.`)
      setDestination(place.label); setDestinationPlace(place); invalidateRoute(); setFormErrors((e) => ({ ...e, destination: '' }))
    } catch (error) { setRouteError(error.message) }
    finally { setShortcutLoading('') }
  }

  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="#top" aria-label={`${BRAND_NAME} home`}><span className="brand-mark"><Mountain size={21} strokeWidth={2.4}/></span><span>{BRAND_NAME}<small>UTTARAKHAND • OUTSTATION TAXI FARES</small></span></a><div className="header-actions"><div className="topbar-note"><ShieldCheck size={16}/> Clear trip estimates</div><a className="contact-link" href="tel:+918745943464"><Phone size={15}/> +91 87459 43464</a><a className="email-link" href="mailto:manishnotiyal92@gmail.com"><Mail size={15}/> manishnotiyal92@gmail.com</a><a className="whatsapp-link" href="https://wa.me/918745943464" target="_blank" rel="noreferrer"><MessageCircle size={15}/> WhatsApp</a></div></header>
    <main id="top">
      <section className="hero"><div className="hero-content"><div className="eyebrow"><span/> UTTARAKHAND TOURS &amp; TRAVELS</div><h1>Explore the hills.<br/><em>Travel with clarity.</em></h1><p>Plan your Uttarakhand outstation journey with real road distance and transparent car-wise fares.</p></div><div className="hero-art" aria-hidden="true"><div className="art-sun"/><div className="art-hill hill-back"/><div className="art-hill hill-front"/><div className="art-road"/><div className="art-car"><div className="art-window"/><i/><b/></div><div className="art-pin"><MapPin size={16}/></div></div></section>
      {!hasGeoapifyKey() && <div className="config-notice"><Compass size={17}/><span><strong>Connect location search</strong> Add a Geoapify key in <code>.env.local</code> to enable address suggestions and road routing.</span></div>}
      <section className="search-card" aria-labelledby="trip-heading">
        <div className="section-heading"><div><span className="step-label">01 / YOUR ROUTE</span><h2 id="trip-heading">Where are you headed?</h2></div><span className="india-chip"><MapPin size={14}/> Search across India</span></div>
        <form onSubmit={calculateRoute} noValidate><div className="trip-fields">
          <PlaceInput id="pickup" label="PICKUP LOCATION" placeholder="Enter city, address or landmark" icon={MapPin} value={pickup} setValue={changePickup} selected={pickupPlace} setSelected={setPickupPlace} error={formErrors.pickup}/>
          <button className="swap-button" type="button" onClick={swapPlaces} aria-label="Swap pickup and destination"><ArrowDownUp size={17}/></button>
          <PlaceInput id="destination" label="DESTINATION" placeholder="Where would you like to go?" icon={Navigation} value={destination} setValue={changeDestination} selected={destinationPlace} setSelected={setDestinationPlace} error={formErrors.destination}/>
        </div><div className="quick-destinations"><span>POPULAR UTTARAKHAND DESTINATIONS</span>{['Dehradun', 'Rishikesh', 'Haridwar', 'Mussoorie', 'Nainital', 'Haldwani'].map((name) => <button type="button" key={name} disabled={Boolean(shortcutLoading)} onClick={() => selectShortcut(name)}>{shortcutLoading === name ? 'Searching…' : name}</button>)}</div><div className="search-footer"><p><ShieldCheck size={15}/> Road distance from Geoapify routing</p><button className="primary-button" type="submit" disabled={routeLoading}>{routeLoading ? <><span className="spinner light"/>Finding route…</> : <>Calculate fare <ArrowRight size={17}/></>}</button></div></form>
        {routeError && <div className="error-banner" role="alert"><span>{routeError}</span><button type="button" onClick={() => setRouteError('')} aria-label="Dismiss"><X size={16}/></button></div>}
      </section>
      {route && <section className="route-strip" aria-live="polite"><div className="route-stops"><div className="stop-dot"/><span>{route.fromLabel}</span><span className="route-line"/><div className="stop-dot end"/><span>{route.toLabel}</span></div><div className="route-metrics"><div><strong>{route.distanceKm.toFixed(2)} <small>km</small></strong><span>ROAD DISTANCE</span></div>{formatDuration(route.durationSeconds) && <div><strong><Clock3 size={15}/>{formatDuration(route.durationSeconds)}</strong><span>EST. DRIVE TIME</span></div>}</div></section>}

      <section className="vehicles-section"><div className="section-heading vehicle-heading"><div><span className="step-label">02 / CHOOSE YOUR CAR</span><h2>Pick your ride</h2><p>{route ? 'Rates are shown for this route. Choose a model to calculate your estimate.' : 'Enter your pickup and destination to see the cars and their rates.'}</p></div></div>
        {!route ? <div className="vehicles-locked"><Route size={18}/><span>Car rates appear after you enter your trip locations and calculate the route.</span></div> : <div className="vehicle-grid">{vehicles.map((vehicle) => {
          const selected = selectedId === vehicle.id, available = Number.isFinite(vehicle.ratePerKm) && vehicle.ratePerKm > 0
          return <article key={vehicle.id} className={`vehicle-card ${selected ? 'selected' : ''} ${!available ? 'unpriced' : ''}`}>
            <div className="car-image"><img src={vehicle.image} alt={`${vehicle.name} photo`} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/cars/car-placeholder.svg'; e.currentTarget.alt = `${vehicle.name} — local replaceable placeholder` }}/>{selected && <span className="selected-pill"><Check size={13}/> Selected</span>}</div>
            <div className="vehicle-info"><h3>{vehicle.name}</h3><div className="rate-line">{available ? <><strong>{formatINR(vehicle.ratePerKm)}</strong><span> / km</span></> : <span className="unconfigured">Rate unavailable</span>}</div>
              {selected && route && fare && <div className="card-fare"><span>Base fare</span><strong>{formatINR(fare.baseFare)}</strong></div>}
              <button type="button" className={`select-button ${selected ? 'chosen' : ''}`} disabled={!available || !route} onClick={() => selectVehicle(vehicle.id)}>{selected ? <><Check size={15}/> Selected</> : !available ? 'Rate needed' : !route ? 'Calculate route first' : <>Select car <ArrowRight size={15}/></>}</button>
            </div>
          </article>
        })}</div>}
        {route && vehicles.every((v) => !v.ratePerKm) && <div className="hint-bar"><Route size={16}/><span>Car rates are not set yet. Add your approved rates in <code>src/data/vehicles.js</code> before publishing.</span></div>}
      </section>

      {route && <section className="quote-section"><div className="quote-heading"><div><span className="step-label">03 / YOUR ESTIMATE</span><h2>Fare breakdown</h2></div><span className="estimate-tag"><ShieldCheck size={14}/> ESTIMATE</span></div>
        {!selectedVehicle ? <div className="quote-empty"><div className="empty-icon"><Route size={21}/></div><div><strong>Select a car to see your fare</strong><span>Choose a model with a configured rate above.</span></div></div> : <div className="quote-body"><div className="quote-details"><div className="quote-row"><span>Actual road distance</span><strong>{route.distanceKm.toFixed(2)} km</strong></div><div className="quote-row"><span>Selected car</span><strong>{selectedVehicle.name}</strong></div><div className="quote-row"><span>Rate per kilometre</span><strong>{formatINR(selectedVehicle.ratePerKm)} / km</strong></div><div className="quote-row"><span>Base fare <small>({route.distanceKm.toFixed(2)} km × {formatINR(selectedVehicle.ratePerKm)})</small></span><strong>{formatINR(fare.baseFare)}</strong></div>
          <div className="toll-row"><label htmlFor="toll">Toll tax <small>{tollAmount === null ? 'Excluded from base fare' : 'Manually entered estimate'}</small></label><div className="toll-input"><span>₹</span><input id="toll" type="number" min="0" step="0.01" inputMode="decimal" placeholder="Optional estimate" value={tollText} onChange={(e) => setTollText(e.target.value)} aria-describedby="toll-help"/><span>INR</span></div></div><p className="toll-help" id="toll-help">Toll is excluded from the per-km fare and paid separately at toll plazas during the journey. Enter an estimate here only if you want it included in the total estimate.</p>
          {tollText !== '' && (!Number.isFinite(tollAmount) || tollAmount < 0) && <p className="field-error">Enter a valid toll amount of ₹0 or more.</p>}
        </div><div className="total-panel">{fare.totalFare === null ? <><span className="total-kicker">BASE FARE</span><strong>{formatINR(fare.baseFare)}</strong><p>Toll not included yet. Enter or confirm the toll amount to see your estimated total.</p></> : <><span className="total-kicker">FINAL ESTIMATED FARE</span><strong>{formatINR(fare.totalFare)}</strong><p>{formatINR(fare.baseFare)} base fare + {formatINR(tollAmount)} toll tax</p></>}<span className="quote-disclaimer"><ShieldCheck size={14}/> Estimate based on the selected route and rate</span></div></div>}
      </section>}
      <footer className="footer"><span>© {new Date().getFullYear()} {BRAND_NAME}</span><span>Safar ki taiyaari, fare ki clarity.</span></footer>
    </main>
  </div>
}
