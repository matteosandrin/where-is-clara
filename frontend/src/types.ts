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
