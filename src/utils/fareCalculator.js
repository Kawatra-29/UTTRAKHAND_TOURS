export function calculateFare({ distanceKm, ratePerKm, tollAmount }) {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) throw new Error('A valid road distance is required.')
  if (!Number.isFinite(ratePerKm) || ratePerKm <= 0) throw new Error('A configured positive rate is required.')
  const baseFare = distanceKm * ratePerKm
  return { baseFare, tollAmount, totalFare: Number.isFinite(tollAmount) && tollAmount >= 0 ? baseFare + tollAmount : null }
}

export const formatINR = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.round(amount))
