export interface BusStop {
  '@id': string;
  '@type': string;
  title: {
    ja: string;
    en: string;
    'ja-Hrkt': string;
  };
  'dc:title': string;
  'geo:lat': number;
  'geo:long': number;
  'odpt:operator': string[];
  'odpt:busroutePattern': string[];
  'odpt:busstopPoleNumber': string;
  'odpt:kana': string;
  'dc:date': string;
}

export interface BusRoutePattern {
  '@id': string;
  '@type': string;
  'dc:title': string;
  'dc:date': string;
  'owl:sameAs': string;
  'odpt:pattern': string;
  'odpt:busroute': string;
  'odpt:operator': string;
  'odpt:direction': string;
  'odpt:busstopPoleOrder': BusStopOrder[];
  'ug:region': {
    type: string;
    coordinates: number[][];
  };
}

export interface BusStopOrder {
  'odpt:note': string;
  'odpt:index': number;
  'odpt:busstopPole': string;
}

export interface ProcessedRoute {
  routeId: string;
  routeName: string;
  routeNameJa: string;
  numStops: number;
  totalDistance: number;
  avgDistance: number;
  stops: ProcessedStop[];
  coordinates: number[][];
}

export interface ProcessedStop {
  id: string;
  name: string;
  nameEn: string;
  lat: number;
  lng: number;
  routes: string[];
}