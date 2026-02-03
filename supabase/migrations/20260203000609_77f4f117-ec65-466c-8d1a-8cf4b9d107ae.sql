-- Add length constraints to UTM columns in qr_codes table
-- Using 255 characters as a reasonable limit for URL parameters

ALTER TABLE public.qr_codes 
  ADD CONSTRAINT utm_source_length CHECK (length(utm_source) <= 255),
  ADD CONSTRAINT utm_medium_length CHECK (length(utm_medium) <= 255),
  ADD CONSTRAINT utm_campaign_length CHECK (length(utm_campaign) <= 255),
  ADD CONSTRAINT utm_term_length CHECK (length(utm_term) <= 255),
  ADD CONSTRAINT utm_content_length CHECK (length(utm_content) <= 255);