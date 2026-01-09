export interface Position {
  id: string;
  mmsi: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  navigation_status: number;
  speed_over_ground: number;
  course_over_ground: number;
  heading: number;
}

export interface Port {
  dep_datetime: string;
  lat: number;
  lon: number;
  day: string;
  id: string;
  title: string;
  locode: string;
  country: {
    flag: {
      code: string;
      name: string;
    };
    title: string;
  };
  timezone: string;
}

export interface Settings {
  vessel_mmsi: string;
  vessel_name: string;
  cruise_start_date: string;
}
