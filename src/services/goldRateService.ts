import prisma from '../config/database';

export async function getGoldRates() {
  const rates = await prisma.goldRate.findFirst({
    orderBy: { lastUpdated: 'desc' }
  });
  
  if (!rates) {
    // Return sensible defaults if empty
    return {
      rate24k: 7300,
      rate9k: 2737,
      rate14k: 4258,
      rate18k: 5475,
      lastUpdated: new Date()
    };
  }
  return {
    ...rates,
    rate24k: rates.rate24k || 7300,
    rate9k: rates.rate9k || 2737,
    rate14k: (rates as any).rate14k || 4258,
    rate18k: (rates as any).rate18k || 5475,
  };
}

export async function updateGoldRates(rate9k: number, rate14k: number, rate18k: number, rate24k?: number) {
  const rates = await getGoldRates();
  
  // If no rates exist, create one. Singleton for simplicity.
  const existingId = (rates as any).id;
  const calculated24k = rate24k || Math.round(rate18k / 0.75);
  
  const data = {
    rate9k,
    rate14k,
    rate18k,
    rate24k: calculated24k
  };
  
  if (existingId) {
    return prisma.goldRate.update({
      where: { id: existingId },
      data
    });
  } else {
    return prisma.goldRate.create({
      data
    });
  }
}

export async function getGoldTiers() {
  const tiers = await prisma.goldTier.findFirst();
  
  if (!tiers) {
    return {
      tier1: 500,
      tier2: 1000,
      tier3: 1500
    };
  }
  return tiers;
}

export async function updateGoldTiers(tier1: number, tier2: number, tier3: number) {
  const tiers = await getGoldTiers();
  const existingId = (tiers as any).id;
  
  if (existingId) {
    return prisma.goldTier.update({
      where: { id: existingId },
      data: { tier1, tier2, tier3 }
    });
  } else {
    return prisma.goldTier.create({
      data: { tier1, tier2, tier3 }
    });
  }
}
