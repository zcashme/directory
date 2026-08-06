declare module "world-cities-json" {
  export interface WorldCity {
    city: string;
    city_ascii: string;
    lat: string;
    lng: string;
    country: string;
    iso2: string;
    iso3: string;
    admin_name: string;
    capital: string;
    population: string;
    id: string;
  }

  export const cities: WorldCity[];
}