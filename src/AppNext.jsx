import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDownUp, ArrowRight, Check, Clock3, Compass, Mail, MapPin, MessageCircle, Mountain, Navigation, Phone, Route, ShieldCheck, X } from 'lucide-react'
import { BRAND_NAME, vehicles } from './data/vehicles.js'
import { getRoadRoute, hasGeoapifyKey, searchPlaces } from './services/geoapifyService.js'
import { formatINR } from './utils/fareCalculator.js'

function PlaceInput({ id, label, placeholder, icon: Icon, value, onTextChange, selected, onSelect, error }) {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [open, setOpen] = useState(false)
  const timer = useRef(null)
  const controller = useRef(null)
  const requestNumber = useRef(0)
  useEffect(() => () => { clearTimeout(timer.current); controller.current?.abort() }, [])

  const changeText = (text) => {
    onTextChange(text); onSelect(null); setSuggestions([]); setMessage('')
    clearTimeout(timer.current); controller.current?.abort()
    if (text.trim().length < 3) { setLoading(false); return }
    setLoading(true); setOpen(true)
    const thisRequest = ++requestNumber.current
    timer.current = setTimeout(async () => {
      const abort = new AbortController(); controller.current = abort
      try {
        const found = await searchPlaces(text.trim(), abort.signal)
        if (thisRequest === requestNumber.current) {
          setSuggestions(found)
          if (!found.length) setMessage('No places found. Try a more specific town or landmark.')
        }
      } catch (err) {
        if (err.name !== 'AbortError' && thisRequest === requestNumber.current) setMessage(err.message)
      } finally { if (thisRequest === requestNumber.current) setLoading(false) }
    }, 350)
  }

  return <div className="field-wrap">
    <label className="field-label" htmlFor={id}>{label}</label>
    <div className={`location-input ${error ? 'has-error' : ''}`}>
      <Icon size={18} aria-hidden="true" />
      <input id={id} value={value} placeholder={placeholder} autoComplete="off" aria-autocomplete="list" aria-expanded={open && suggestions.length > 0} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 130)} onChange={(event) => changeText(event.target.value)} />
      {loading && <span className="spinner" aria-label="Searching" />}{selected && <Check size={17} className="input-check" aria-label="Location selected" />}
    </div>
    {error && <p className="field-error">{error}</p>}
    {open && (suggestions.length > 0 || message) && <div className="suggestions" role="listbox">
      {suggestions.map((place) => <button type="button" role="option" className="suggestion" key={place.placeId} onMouseDown={(event) => event.preventDefault()} onClick={() => { onTextChange(place.label); onSelect(place); setSuggestions([]); setMessage(''); setOpen(false) }}><MapPin size={16}/><span>{place.label}</span></button>)}
      {message && !suggestions.length && <p className="suggestion-message">{message}</p>}
    </div>}
  </div>
}

function durationText(seconds) {
  if (!Number.isFinite(seconds)) return null
  const hours = Math.floor(seconds / 3600), minutes = Math.round((seconds % 3600) / 60)
  return hours ? `${hours} hr ${minutes} min` : `${minutes} min`
}

export default function App() {
  const [pickupText, setPickupText] = useState(''), [destinationText, setDestinationText] = useState('')
  const [pickup, setPickup] = useState(null), [destination, setDestination] = useState(null)
  const [route, setRoute] = useState(null), [routeError, setRouteError] = useState(''), [routeLoading, setRouteLoading] = useState(false)
  const [selectedId, setSelectedId] = useState(''), [fieldErrors, setFieldErrors] = useState({}), [quickLoading, setQuickLoading] = useState('')
  const selectedCar = vehicles.find((car) => car.id === selectedId)
  const estimate = useMemo(() => route && selectedCar ? route.distanceKm * selectedCar.ratePerKm : null, [route, selectedCar])

  const invalidateRoute = () => { setRoute(null); setSelectedId(''); setRouteError('') }
  const editPickup = (text) => { setPickupText(text); setPickup(null); invalidateRoute(); setFieldErrors((prev) => ({ ...prev, pickup: '' })) }
  const editDestination = (text) => { setDestinationText(text); setDestination(null); invalidateRoute(); setFieldErrors((prev) => ({ ...prev, destination: '' })) }
  const swap = () => { invalidateRoute(); setPickupText(destinationText); setDestinationText(pickupText); setPickup(destination); setDestination(pickup) }
  const chooseQuickDestination = async (name) => {
    setQuickLoading(name); setRouteError('')
    try {
      const [place] = await searchPlaces(name)
      if (!place) throw new Error(`Could not find ${name}. Search for it in the destination field.`)
      setDestinationText(place.label); setDestination(place); invalidateRoute()
    } catch (err) { setRouteError(err.message) }
    finally { setQuickLoading('') }
  }
  const calculate = async (event) => {
    event.preventDefault(); setRouteError('')
    const errors = {}
    if (!pickupText.trim()) errors.pickup = 'Enter a pickup location.'
    else if (!pickup) errors.pickup = 'Choose a location from the suggestions.'
    if (!destinationText.trim()) errors.destination = 'Enter a destination.'
    else if (!destination) errors.destination = 'Choose a location from the suggestions.'
    setFieldErrors(errors)
    if (Object.keys(errors).length) return
    setRouteLoading(true); invalidateRoute()
    try { setRoute(await getRoadRoute(pickup, destination)) }
    catch (err) { setRouteError(err.message) }
    finally { setRouteLoading(false) }
  }
  const bookLink = selectedCar ? `https://wa.me/918745943464?text=${encodeURIComponent(`Hello, I would like to book ${selectedCar.name} for ${route.fromLabel} to ${route.toLabel}. The estimated fare shown is ${formatINR(estimate)}, excluding toll.`)}` : 'https://wa.me/918745943464'

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#top" aria-label={`${BRAND_NAME} home`}><span className="brand-mark"><Mountain size={21}/></span><span>{BRAND_NAME}<small>OUTSTATION TAXI FARES</small></span></a>
      <div className="header-actions"><div className="topbar-note"><ShieldCheck size={16}/> Clear trip estimates</div><a className="contact-link" href="tel:+918745943464"><Phone size={15}/> +91 87459 43464</a><a className="email-link" href="mailto:manishnotiyal92@gmail.com"><Mail size={15}/> manishnotiyal92@gmail.com</a><a className="whatsapp-link" href="https://wa.me/918745943464" target="_blank" rel="noreferrer"><MessageCircle size={15}/> WhatsApp</a></div>
    </header>
    <main id="top">
      <section className="hero"><div className="hero-content"><div className="eyebrow"><span/> NAUTIYAL TOURS AND TRAVELS</div><h1>Explore the hills.<br/><em>Travel with clarity.</em></h1><p>Plan your outstation journey with real road distance and transparent estimated fares.</p></div><div className="hero-art" aria-hidden="true"><div className="art-sun"/><div className="art-hill hill-back"/><div className="art-hill hill-front"/><div className="art-road"/><div className="art-car"><div className="art-window"/><i/><b/></div><div className="art-pin"><MapPin size={16}/></div></div></section>
      {!hasGeoapifyKey() && <div className="config-notice"><Compass size={17}/><span><strong>Connect location search</strong> Add your Geoapify key in <code>.env.local</code> to enable suggestions and routing.</span></div>}
      <section className="search-card" aria-labelledby="trip-heading">
        <div className="section-heading"><div><span className="step-label">01 / YOUR ROUTE</span><h2 id="trip-heading">Where are you headed?</h2></div><span className="india-chip"><MapPin size={14}/> Search across India</span></div>
        <form onSubmit={calculate} noValidate><div className="trip-fields">
          <PlaceInput id="pickup" label="PICKUP LOCATION" placeholder="Enter city, address or landmark" icon={MapPin} value={pickupText} onTextChange={editPickup} selected={pickup} onSelect={setPickup} error={fieldErrors.pickup}/>
          <button className="swap-button" type="button" onClick={swap} aria-label="Swap pickup and destination"><ArrowDownUp size={17}/></button>
          <PlaceInput id="destination" label="DESTINATION" placeholder="Where would you like to go?" icon={Navigation} value={destinationText} onTextChange={editDestination} selected={destination} onSelect={setDestination} error={fieldErrors.destination}/>
        </div>
        <div className="quick-destinations"><span>POPULAR UTTARAKHAND DESTINATIONS</span>{['Dehradun','Rishikesh','Haridwar','Mussoorie','Nainital','Haldwani'].map((name) => <button type="button" key={name} disabled={Boolean(quickLoading)} onClick={() => chooseQuickDestination(name)}>{quickLoading === name ? 'Searching…' : name}</button>)}</div>
        <div className="search-footer"><p><ShieldCheck size={15}/> Real road distance from Geoapify routing</p><button className="primary-button" type="submit" disabled={routeLoading}>{routeLoading ? <><span className="spinner light"/>Finding route…</> : <>Calculate fare <ArrowRight size={17}/></>}</button></div></form>
        {routeError && <div className="error-banner" role="alert"><span>{routeError}</span><button type="button" onClick={() => setRouteError('')} aria-label="Dismiss"><X size={16}/></button></div>}
      </section>
      {route && <section className="route-strip" aria-live="polite"><div className="route-stops"><div className="stop-dot"/><span>{route.fromLabel}</span><span className="route-line"/><div className="stop-dot end"/><span>{route.toLabel}</span></div><div className="route-metrics"><div><strong>{route.distanceKm.toFixed(2)} <small>km</small></strong><span>ACTUAL ROAD DISTANCE</span></div>{durationText(route.durationSeconds) && <div><strong><Clock3 size={15}/>{durationText(route.durationSeconds)}</strong><span>EST. DRIVE TIME</span></div>}</div></section>}
      <section className="vehicles-section"><div className="section-heading vehicle-heading"><div><span className="step-label">02 / CHOOSE YOUR CAR</span><h2>Pick your ride</h2><p>{route ? 'Estimated trip totals are shown below. Per-kilometre rates are not displayed.' : 'Enter pickup and destination to see car options and your estimated total.'}</p></div></div>
        {!route ? <div className="vehicles-locked"><Route size={18}/><span>Vehicle options and estimated prices appear after your route is calculated.</span></div> : <div className="vehicle-grid">{vehicles.map((car) => {
          const selected = selectedId === car.id
          return <article key={car.id} className={`vehicle-card ${selected ? 'selected' : ''}`}><div className="car-image"><img src={car.image} alt={`${car.name} photo`} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = '/cars/car-placeholder.svg'; event.currentTarget.alt = `${car.name} — local replaceable placeholder` }}/></div><div className="vehicle-info"><span className="category-chip">{car.category}</span><h3>{car.name}</h3><div className="rate-line"><span>ESTIMATED TRIP FARE · TOLL EXTRA</span><strong>{formatINR(route.distanceKm * car.ratePerKm)}</strong></div><button className={`select-button ${selected ? 'chosen' : ''}`} type="button" onClick={() => setSelectedId(car.id)}>{selected ? <><Check size={15}/> Selected</> : <>Choose car <ArrowRight size={15}/></>}</button></div></article>
        })}</div>}
      </section>
      {route && selectedCar && <section className="quote-section"><div className="quote-heading"><div><span className="step-label">03 / YOUR ESTIMATE</span><h2>Estimated fare</h2></div><span className="estimate-tag"><ShieldCheck size={14}/> ESTIMATE</span></div><div className="quote-body"><div className="quote-details"><div className="quote-row"><span>Route distance</span><strong>{route.distanceKm.toFixed(2)} km</strong></div><div className="quote-row"><span>Selected vehicle</span><strong>{selectedCar.name} · {selectedCar.category}</strong></div><div className="quote-row"><span>Estimated trip fare</span><strong>{formatINR(estimate)}</strong></div><p className="toll-help">Toll tax is not included. Pay toll separately at toll plazas during your journey. This is an estimate; confirm the final fare when booking.</p></div><div className="total-panel"><span className="total-kicker">ESTIMATED FARE · TOLL EXTRA</span><strong>{formatINR(estimate)}</strong><p>Estimated for {route.distanceKm.toFixed(2)} km in a {selectedCar.category}.</p><span className="quote-disclaimer"><ShieldCheck size={14}/> Final fare confirmed when you book</span><a className="primary-button booking-button" href={bookLink} target="_blank" rel="noreferrer"><MessageCircle size={16}/> Book on WhatsApp</a><a className="call-booking" href="tel:+918745943464"><Phone size={15}/> Call to book</a></div></div></section>}
      <footer className="footer"><span>© {new Date().getFullYear()} {BRAND_NAME}</span><span>Safar ki taiyaari, fare ki clarity.</span></footer>
    </main>
  </div>
}
