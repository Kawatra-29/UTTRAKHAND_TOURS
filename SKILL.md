---
name: react-cab-fare-calculator
description: Build and maintain a single-page React application for Indian outstation cab fare calculation using real road distance, individually priced car models, and separately itemized toll tax.
---

# React Cab Fare Calculator — Project Skill

## Purpose

Use this skill when creating, modifying, reviewing, or debugging the cab fare calculator application. The application is a single-page React JS experience for Indian long-route/outstation journeys.

The core flow is:

1. Customer selects pickup and destination locations.
2. The app obtains actual road distance and, when available, estimated journey time from a routing API.
3. Customer chooses one individual car model from the vehicle catalogue.
4. The app uses the owner-configured per-kilometre rate for that exact model.
5. Toll tax is calculated by an optional provider or entered manually.
6. The app displays a transparent fare breakdown and estimated total.

## Non-negotiable business rules

- **No minimum billing kilometres.** Do not introduce a 200 KM minimum or any other minimum-distance rule.
- Use road-route distance from the routing API. Never substitute straight-line distance, guessed distance, or hardcoded demo distance for a real result.
- `baseFare = actualRoadDistanceKm * selectedVehicle.ratePerKm`.
- `totalFare = baseFare + tollAmount`.
- Toll is a separate line item. Do not include it invisibly in the per-KM price.
- Do not add driver allowance, parking, waiting, night charges, taxes, convenience fees, or other extras unless the product owner explicitly requests them.
- Do not invent vehicle prices. Every default vehicle rate must be unset (`null`) until the owner configures it.
- A vehicle with no valid configured rate cannot produce a fare quote.
- A blank/unknown toll amount is not the same as a confirmed toll amount of ₹0.
- Never show a final total as confirmed while toll is unknown. Show the base fare separately and state that toll is not included yet.
- Do not describe an estimate as a guaranteed final/operator quote.

## Vehicle catalogue

The application has individual vehicle model entries, not broad cab categories. Do not create “Mini”, “Sedan”, “SUV”, “Premium”, or similar selectable categories.

Initial editable seed models:

- Maruti Suzuki Swift
- Maruti Suzuki Dzire
- Hyundai Aura
- Honda Amaze
- Tata Tigor
- Maruti Suzuki Ertiga
- Kia Carens
- Toyota Innova
- Toyota Innova Crysta
- Toyota Innova Hycross

The catalogue is an owner-editable list, not a claim that every cab operator offers every model. Keep discontinued/legacy fleet models out of the default list unless the owner asks to include them.

Each vehicle record should support at least:

```js
{
  id: "maruti-swift",
  name: "Maruti Suzuki Swift",
  image: "/cars/swift.webp",
  ratePerKm: null,
  active: true
}
```

- Use a stable unique `id`.
- Keep initial `ratePerKm` unset.
- Store photographs as local assets where possible (`public/cars/`).
- Do not use a random unrelated vehicle photo under a model's name. If an exact image is unavailable, use a consistent placeholder and clearly leave a replaceable local image path.
- Provide useful `alt` text.

## Technical defaults

- React JS + Vite unless the existing repository already uses a different React setup.
- JavaScript and functional components/hooks unless the repository is already TypeScript.
- Prefer small, reusable components and separate service/business-logic modules.
- Suggested modules:
  - `src/data/vehicles.js`
  - `src/services/geoapifyService.js`
  - `src/services/tollService.js`
  - `src/utils/fareCalculator.js`
  - UI components for trip form, vehicle cards/grid, rate management, route summary, and fare breakdown.
- Keep the interface single-page. Do not add routes/pages, login, payment, booking, or checkout flows unless explicitly requested.
- Use responsive accessible UI with clear loading, empty, validation, and error states.

## Location and road-distance behavior

- Use Geoapify Geocoding/Autocomplete to help the customer select pickup and destination.
- Prefer India as the geocoding country filter (`countrycode=in`) while allowing the user to search any Indian location.
- Store the selected result's coordinates with the selected address.
- Use Geoapify Routing (or the routing provider configured by the project) for the route distance and duration.
- Treat the routing provider's returned distance as the source of truth for fare calculation.
- Convert metres to kilometres with `distanceKm = distanceMeters / 1000`.
- Do not calculate fare until there is a valid route result.
- Invalidate the previous route and quote as soon as either location changes, until a new route has been fetched successfully.
- Handle empty results, identical origin/destination, invalid API response, network errors, missing key, and rate limits.

## Rate management

The owner decides the per-KM rate for each individual model.

- Provide a simple “Manage rates” / “Edit vehicle rates” interface.
- Validate that a configured rate is a finite positive number.
- Persist owner-edited rates in `localStorage` for the frontend-only MVP.
- Load persisted rates safely and merge them with the default vehicle catalogue by stable vehicle ID.
- If localStorage contains malformed values, recover gracefully and use safe defaults.
- Clearly document that localStorage is browser/device-specific and is not shared between customers or devices. Do not imply that this is a secure multi-user admin system.
- Do not store real API secrets in localStorage.

## Toll-tax behavior

Implement toll logic behind a provider-independent service abstraction so that the UI does not depend directly on one toll vendor.

Preferred behavior:

1. If an approved toll provider/server endpoint is configured, request an estimated toll for the same origin/destination route and relevant vehicle details supported by that provider.
2. Keep secret toll API keys on a backend/serverless function. Never embed secret provider keys in browser JavaScript, source code, `VITE_` variables, or committed files.
3. TollGuru can be integrated as an optional paid/trial provider, but never assume it is permanently free or that its estimate applies to every vehicle class.
4. If the provider is missing, fails, or returns no estimate, expose a clearly labelled manual `Toll tax (₹)` field.
5. The toll field must represent three states: unknown/unset, known zero, or a positive amount. Do not coerce blank to zero.
6. Label provider output “Estimated toll” and manual input “Manually entered toll”. Do not claim that an estimate is an exact charge.
7. When toll is unknown, show base fare and “Toll not included yet”; withhold the final total until the user explicitly enters an amount or confirms ₹0.
8. If no backend exists in the MVP, use manual toll entry and leave a documented server endpoint interface for adding automatic toll lookup later.

## Fare calculation utility

Keep the calculation as a pure function with explicit validation. Example behavior:

```js
export function calculateFare({ distanceKm, ratePerKm, tollAmount }) {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    throw new Error("A valid route distance is required.");
  }
  if (!Number.isFinite(ratePerKm) || ratePerKm <= 0) {
    throw new Error("A valid per-kilometre rate is required.");
  }
  if (!Number.isFinite(tollAmount) || tollAmount < 0) {
    throw new Error("Toll must be entered or confirmed before showing the total.");
  }

  const baseFare = distanceKm * ratePerKm;
  return {
    baseFare,
    tollAmount,
    totalFare: baseFare + tollAmount,
  };
}
```

The UI may show `baseFare` while toll is unknown, but must not call it the final total.

## Environment variables and security

- Use `.env.example` with placeholders, never real credentials.
- A Geoapify browser key is visible to users in a frontend bundle. It must be restricted in the provider dashboard by allowed origins/referrers and API permissions. Do not describe it as a secret.
- Toll-provider credentials are secret and must stay server-side.
- Validate server-side toll request inputs if a backend endpoint is added.
- Avoid logging full secrets or sensitive user information.

## UI requirements

- Header with an editable brand placeholder.
- Pickup and destination inputs with suggestions.
- Calculate Fare action and clear feedback.
- Road distance and estimated duration.
- Individual car photo/name/rate cards with one selectable model.
- Owner rate editor.
- Fare breakdown with distance, selected model, per-KM rate, base fare, toll status/amount, and total when toll is known.
- Mobile-first responsive behavior, accessible labels, keyboard support, visible focus states, and readable contrast.
- No fake live route or toll values in production UI. Sample values may appear only in clearly labelled demo/test fixtures.

## Working process for an AI coding agent

When asked to implement or change this project:

1. Inspect the repository, package manager, scripts, and existing coding conventions before editing.
2. Identify whether a working React/Vite project already exists. Do not overwrite unrelated project files.
3. Read the current implementation and reuse existing dependencies when reasonable.
4. Make the smallest complete change that satisfies the request.
5. Keep routing, toll-provider, fare-calculation, and UI responsibilities separate.
6. Add or update `.env.example` and README instructions when configuration changes.
7. Run available lint, tests, and production build commands. Fix errors introduced by the change.
8. Report changed files, commands run, required environment variables, and any provider/API limitations honestly.
9. Never claim the API integration works unless it has been tested with valid configuration or clearly identify it as unverified.
10. Do not stop after describing a plan: implement the requested change in the repository.

## Acceptance checklist

- [ ] The app remains a single-page React application.
- [ ] Pickup and destination are selectable locations.
- [ ] Road distance comes from the routing API.
- [ ] No minimum KM billing rule exists in the UI, utilities, or tests.
- [ ] Vehicle cards represent individual model names, not broad cab categories.
- [ ] Vehicle rates start unset and are configured by the owner.
- [ ] Rate edits persist for the MVP and invalid values are rejected.
- [ ] Base fare is actual road KM multiplied by selected model's rate.
- [ ] Toll is a separate item with optional provider integration and manual fallback.
- [ ] Blank toll and confirmed ₹0 are handled differently.
- [ ] Final total is shown only after toll is known/confirmed.
- [ ] No unrequested extra charges are added.
- [ ] API keys and secrets follow the security rules.
- [ ] Empty, loading, error, and invalid-input states are handled.
- [ ] README explains setup, Geoapify configuration, rate editing, car image replacement, and toll behavior.
