import { useEffect, useRef, useState } from 'react'
import { ArrowDownUp, ArrowRight, Check, Clock3, Compass, Mail, MapPin, MessageCircle, Mountain, Navigation, Phone, Route, ShieldCheck, X } from 'lucide-react'
import { BRAND_NAME } from './data/vehicles.js'
import { getRoadRoute, hasGeoapifyKey, searchPlaces } from './services/geoapifyService.js'

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

const vehicleCategories = [
  { id: 'sedan', name: 'Sedan', models: ['Dzire', 'Aura', 'Amaze', 'Etios'] },
  { id: 'muv', name: 'MUV', models: ['Innova Crysta', 'Innova Hycross', 'Ertiga', 'Carens', 'Rumion'] },
  { id: 'traveller', name: 'Tempo Traveller', models: ['Force Traveller 9 seater', 'Force Traveller 12 seater', 'Force Traveller 17 seater'] },
]

export default function App() {
  const [pickup, setPickup] = useState(''); const [destination, setDestination] = useState('')
  const [pickupPlace, setPickupPlace] = useState(null); const [destinationPlace, setDestinationPlace] = useState(null)
  const [route, setRoute] = useState(null); const [routeError, setRouteError] = useState(''); const [routeLoading, setRouteLoading] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState(''); const [selectedModel, setSelectedModel] = useState(''); const [carrier, setCarrier] = useState('without')
  const [shortcutLoading, setShortcutLoading] = useState('')
  const [formErrors, setFormErrors] = useState({})

  const selectedCategory = vehicleCategories.find((category) => category.id === selectedCategoryId)

  const invalidateRoute = () => { setRoute(null); setRouteError(''); setSelectedCategoryId(''); setSelectedModel('') }
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
    setRouteLoading(true); setRoute(null); setSelectedCategoryId(''); setSelectedModel('')
    try { setRoute(await getRoadRoute(pickupPlace, destinationPlace)) }
    catch (error) { setRouteError(error.message) }
    finally { setRouteLoading(false) }
  }
  const selectCategory = (category) => { setSelectedCategoryId(category.id); setSelectedModel(category.models[0]) }
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
      <section className="hero"><div className="hero-content"><div className="eyebrow"><span/> UTTARAKHAND TOURS &amp; TRAVELS</div><h1>Explore the hills.<br/><em>Travel with clarity.</em></h1><p>Plan your Uttarakhand outstation journey with real road distance and transparent category-wise fares.</p></div><div className="hero-art" aria-hidden="true"><div className="art-sun"/><div className="art-hill hill-back"/><div className="art-hill hill-front"/><div className="art-road"/><div className="art-car"><div className="art-window"/><i/><b/></div><div className="art-pin"><MapPin size={16}/></div></div></section>
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

      <section className="vehicles-section"><div className="section-heading vehicle-heading"><div><span className="step-label">02 / CHOOSE A CATEGORY</span><h2>Pick your ride</h2><p>{route ? 'Choose a vehicle category and tell us whether you need a roof carrier.' : 'Enter your pickup and destination to see vehicle categories.'}</p></div></div>
        {!route ? <div className="vehicles-locked"><Route size={18}/><span>Vehicle categories appear after you calculate your route.</span></div> : <div className="category-grid">{vehicleCategories.map((category) => {
          const selected = selectedCategoryId === category.id
          return <article key={category.id} className={`category-card ${selected ? 'selected' : ''}`}>
            <button type="button" className="category-select" aria-pressed={selected} onClick={() => selectCategory(category)}><span className="category-icon">{category.name === 'Sedan' ? 'S' : category.name === 'MUV' ? 'M' : 'T'}</span><span className="category-title"><strong>{category.name}</strong><small>{category.id === 'traveller' ? '9, 12 or 17 seater' : 'Choose a model'}</small></span>{selected && <Check size={17} aria-label="Selected"/>}</button>
            <p className="model-list"><strong>Models</strong>{category.models.join(' · ')}</p>
            {selected && <div className="category-options"><label htmlFor="vehicle-model">Select model</label><select id="vehicle-model" value={selectedModel} onChange={(event) => setSelectedModel(event.target.value)}>{category.models.map((model) => <option key={model}>{model}</option>)}</select><fieldset className="carrier-choice"><legend>Roof carrier</legend><label><input type="radio" name="carrier" value="with" checked={carrier === 'with'} onChange={() => setCarrier('with')}/> With carrier</label><label><input type="radio" name="carrier" value="without" checked={carrier === 'without'} onChange={() => setCarrier('without')}/> Without carrier</label></fieldset></div>}
          </article>
        })}</div>}
      </section>

      {route && <section className="quote-section"><div className="quote-heading"><div><span className="step-label">03 / YOUR REQUEST</span><h2>Trip summary</h2></div><span className="estimate-tag"><ShieldCheck size={14}/> FARE ON REQUEST</span></div>
        {!selectedCategory ? <div className="quote-empty"><div className="empty-icon"><Route size={21}/></div><div><strong>Select a vehicle category</strong><span>Choose a category above to confirm your model and carrier preference.</span></div></div> : <div className="quote-body"><div className="quote-details"><div className="quote-row"><span>Actual road distance</span><strong>{route.distanceKm.toFixed(2)} km</strong></div><div className="quote-row"><span>Selected category</span><strong>{selectedCategory.name}</strong></div><div className="quote-row"><span>Selected model</span><strong>{selectedModel}</strong></div><div className="quote-row"><span>Roof carrier</span><strong>{carrier === 'with' ? 'With carrier' : 'Without carrier'}</strong></div>
        </div><div className="total-panel"><span className="total-kicker">FARE QUOTE</span><strong>On request</strong><p>We'll confirm the fare for this route, selected vehicle and carrier preference.</p><a className="quote-contact" href={`https://wa.me/918745943464?text=${encodeURIComponent(`Hello, please share a fare quote. Pickup: ${route.fromLabel}; destination: ${route.toLabel}; category: ${selectedCategory.name}; model: ${selectedModel}; roof carrier: ${carrier === 'with' ? 'With carrier' : 'Without carrier'}; road distance: ${route.distanceKm.toFixed(2)} km.`)}`} target="_blank" rel="noreferrer">Request on WhatsApp <ArrowRight size={15}/></a><span className="quote-disclaimer"><ShieldCheck size={14}/> Route and preferences included</span></div></div>}
      </section>}
      <footer className="footer"><span>© {new Date().getFullYear()} {BRAND_NAME}</span><span>Safar ki taiyaari, fare ki clarity.</span></footer>
    </main>
  </div>
}
