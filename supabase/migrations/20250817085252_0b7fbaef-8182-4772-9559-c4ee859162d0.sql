-- Make the surf-videos bucket public so frame images can be accessed
UPDATE storage.buckets SET public = true WHERE id = 'surf-videos';