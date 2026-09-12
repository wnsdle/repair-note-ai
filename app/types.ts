export type Photo = {
  id: string;
  fileName: string;
  webViewLink: string;
  thumbnailLink?: string;
};

export type Note = {
  id: string;
  vehicle_type: string;
  model_year: string;
  mileage_or_hours: string;
  order_id: string;
  plate_number: string;
  symptom: string;
  dtc_codes: string[];
  inspection: string;
  cause: string;
  created_at: string;
  drive_folder_url?: string;
  photos?: Photo[];
  matchType?: "keyword" | "semantic";
};
