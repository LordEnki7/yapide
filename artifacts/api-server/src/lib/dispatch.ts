import { db, driversTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function estimateETA(distanceKm: number): number {
  const avgSpeedKmh = 25;
  return (distanceKm / avgSpeedKmh) * 60;
}

function scoreDriver(driver: any, pickupLat: number, pickupLng: number) {
  const driverLat = driver.currentLat ?? 18.4861;
  const driverLng = driver.currentLng ?? -69.9312;
  const distance = getDistance(driverLat, driverLng, pickupLat, pickupLng);
  const eta = estimateETA(distance);
  const score =
    0.4 * distance +
    0.3 * eta -
    0.2 * (driver.rating || 5.0) -
    0.1 * (driver.acceptanceRate || 1.0);
  return { driver, score, distance, eta };
}

export async function findNearbyDrivers(pickupLat: number, pickupLng: number, radiusKm = 10) {
  const onlineDrivers = await db
    .select()
    .from(driversTable)
    .where(and(eq(driversTable.isOnline, true), eq(driversTable.isLocked, false)));

  const scored = onlineDrivers
    .filter((d) => {
      const dLat = d.currentLat ?? 18.4861;
      const dLng = d.currentLng ?? -69.9312;
      return getDistance(dLat, dLng, pickupLat, pickupLng) < radiusKm;
    })
    .map((d) => scoreDriver(d, pickupLat, pickupLng))
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);

  return scored;
}

export const PLATFORM_MARKUP = 0.15;
export const DELIVERY_BASE_FEE = 150;
export const DELIVERY_FEE_PER_KM = 25;
export const DELIVERY_DRIVER_SHARE = 0.50;
export const CASH_LIMIT = 10000;
export const CASH_WARNING_THRESHOLD = 7000;

export function calculateFees(baseAmount: number, distanceKm = 3, tip = 0) {
  const markedUpTotal = parseFloat((baseAmount * (1 + PLATFORM_MARKUP)).toFixed(2));
  const platformMarkup = parseFloat((baseAmount * PLATFORM_MARKUP).toFixed(2));
  const deliveryFee = parseFloat((DELIVERY_BASE_FEE + DELIVERY_FEE_PER_KM * distanceKm).toFixed(2));
  const driverDeliveryShare = parseFloat((deliveryFee * DELIVERY_DRIVER_SHARE).toFixed(2));
  const driverEarnings = parseFloat((driverDeliveryShare + tip).toFixed(2));
  const commission = parseFloat((platformMarkup + deliveryFee * (1 - DELIVERY_DRIVER_SHARE)).toFixed(2));
  return {
    totalAmount: markedUpTotal,
    deliveryFee,
    commission,
    driverEarnings,
    tip,
  };
}
