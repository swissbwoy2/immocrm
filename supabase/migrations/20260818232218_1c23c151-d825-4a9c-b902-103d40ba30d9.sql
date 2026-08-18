UPDATE public.link_previews
SET image_url = REPLACE(image_url, '&amp;', '&')
WHERE image_url LIKE '%&amp;%';