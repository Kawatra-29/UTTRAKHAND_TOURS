# Uttarakhand Tours and Travels

A single-page React + Vite outstation fare calculator for Uttarakhand Tours and Travels. Road distance and drive time come from Geoapify Routing. Car rates live in the React source, and toll is shown separately.

## Run locally

1. Install Node.js 20.19+ or 22.12+.
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local` and set `VITE_GEOAPIFY_API_KEY` to your Geoapify API key.
4. Start the development server: `npm run dev`
5. For a production build: `npm run build`; preview it with `npm run preview`.

## Deploy to Vercel

Push this project to GitHub, import that repository in Vercel, and keep the framework preset as **Vite**. Vercel detects `npm run build` and the `dist` output directory automatically. In the Vercel project's **Settings → Environment Variables**, add `VITE_GEOAPIFY_API_KEY` for Production (and Preview if needed), then redeploy. Do not commit `.env.local` or a real API key. Restrict the production Geoapify key to the deployed site's origins/referrers in Geoapify.

The Geoapify browser key is included in the frontend bundle and is visible to visitors. Restrict it in the Geoapify dashboard to your website's allowed origins/referrers and enable only the Geocoding and Routing APIs you need. Never put a secret toll-provider key in a `VITE_` variable.

## Set the car rates in code

Edit each vehicle's `ratePerKm` value in `src/data/vehicles.js` to the approved INR per-kilometre rate (replace `null` with a positive number, without quotes). Values currently start as `null` because the owner has not supplied the prices. No public rate editor is included. Vehicle cards and prices stay hidden until pickup and destination have been selected and a real route has been calculated. Remember: rates in frontend React code are visible in the published browser bundle, even though the interface waits until route entry to display them.

## Vehicle photos

The ten vehicle cards are separate catalogue models. Exact model photographs are not included, so the UI shows a consistent local placeholder. Add appropriately licensed photos under `public/cars/` with the expected names (`swift.webp`, `dzire.webp`, `aura.webp`, `amaze.webp`, `tigor.webp`, `ertiga.webp`, `carens.webp`, `innova.webp`, `innova-crysta.webp`, `innova-hycross.webp`). A missing image falls back to `car-placeholder.svg`. The catalogue and image paths are in `src/data/vehicles.js`.

## Distance, fare, and toll

Pickup and destination must both be selected from Geoapify suggestions; arbitrary unselected text is rejected. Popular Uttarakhand destination shortcuts resolve through Geoapify too, and search remains available across India. Geoapify Routing's returned driving distance is converted from metres to kilometres, with no minimum-distance rule. Base fare is actual route kilometres × the selected model's configured rate. Toll is excluded from the per-kilometre fare and paid separately at toll plazas during the journey. A manually entered toll estimate is optional; blank means unknown and a final total appears only when a toll amount is entered or confirmed as zero.

The `src/services/tollService.js` module is the provider-independent seam for a future toll estimate endpoint. This version does not estimate toll automatically and does not invent an amount. Any future paid toll provider should be called through a server/serverless endpoint that keeps vendor secrets off the client; pricing and availability depend on the provider's current plan.
