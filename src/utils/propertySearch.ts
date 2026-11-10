const literal = (value: unknown) => new RegExp(String(value).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
const positiveInteger = (value: unknown, fallback: number) => Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : fallback;

export function buildPropertySearch(params: Record<string, any>) {
  const query: any = {};
  const conditions: any[] = [];
  const page = positiveInteger(params.page, 1);
  const limit = Math.min(positiveInteger(params.limit, 10), 100);
  if (['Residential', 'Commercial', 'PG Hostel'].includes(params.propertyType)) query.property_type = params.propertyType;
  if (['Rent', 'Sell'].includes(params.listingType)) query.listing_type = params.listingType;
  if (typeof params.city === 'string' && params.city.trim()) query['address.city'] = literal(params.city);
  if (typeof params.location === 'string' && params.location.trim()) {
    const location = literal(params.location);
    conditions.push({ $or: [{ location }, { 'address.street': location }, { 'address.city': location }, { society: location }] });
  }
  for (const key of ['bhk', 'bedrooms', 'bathrooms']) {
    if (Number(params[key]) > 0) query[key] = key === 'bhk' && Number(params[key]) === 5 ? { $gte: 5 } : Number(params[key]);
  }
  if (['Apartment', 'Villa', 'Independent House', 'Pent House', 'Plot'].includes(params.building_type)) query.building_type = params.building_type;
  if (['Full', 'Semi', 'None'].includes(params.furnishing)) query.furnishing = params.furnishing;
  if (['Public', 'Reserved', 'Covered'].includes(params.parking)) query.parking = params.parking;
  if (typeof params.availability === 'string' && params.availability.trim()) query.availability = literal(params.availability);
  if (params.status === 'Available') conditions.push({ $or: [{ status: /^available$/i }, { status: { $exists: false } }] });
  else if (params.status === 'Sold') query.status = 'Sold';
  const range: any = {};
  if (params.minPrice !== undefined && Number.isFinite(Number(params.minPrice)) && Number(params.minPrice) >= 0) range.$gte = Number(params.minPrice);
  if (params.maxPrice !== undefined && Number.isFinite(Number(params.maxPrice)) && Number(params.maxPrice) >= 0) range.$lte = Number(params.maxPrice);
  if (Object.keys(range).length) {
    range.$gt = 0;
    if (params.listingType === 'Rent') query['price.rent_monthly'] = range;
    else if (params.listingType === 'Sell') query['price.sell_price'] = range;
    else conditions.push({ $or: [{ listing_type: 'Rent', 'price.rent_monthly': range }, { listing_type: 'Sell', 'price.sell_price': range }] });
  }
  if (conditions.length) query.$and = conditions;
  const priceField = params.listingType === 'Sell' ? 'price.sell_price' : 'price.rent_monthly';
  const sort: any = params.sortBy === 'price-low' ? { [priceField]: 1, _id: -1 }
    : params.sortBy === 'price-high' ? { [priceField]: -1, _id: -1 }
    : { createdAt: -1, _id: -1 };
  return { query, page, limit, sort };
}
