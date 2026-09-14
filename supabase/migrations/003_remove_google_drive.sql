-- Google Drive is no longer used for repair-note photos.
-- Existing Drive-backed photo rows were removed after the original files were downloaded.
delete from public.repair_note_photos where drive_file_id is not null;

alter table public.repair_note_photos
  drop column if exists drive_file_id;

alter table public.repair_notes
  drop column if exists drive_folder_id;

alter table public.repair_notes
  drop column if exists drive_folder_url;
