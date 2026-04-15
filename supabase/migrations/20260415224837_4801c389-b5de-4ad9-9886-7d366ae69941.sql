CREATE OR REPLACE FUNCTION public.renovation_replace_quote_items(
  _quote_id uuid,
  _items jsonb,
  _analysis_result jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.renovation_quote_items WHERE quote_id = _quote_id;

  INSERT INTO public.renovation_quote_items (
    quote_id, position, designation, description, quantity, unit, unit_price, total_price, tva_rate, category
  )
  SELECT
    _quote_id,
    COALESCE((item->>'position')::int, 0),
    COALESCE(item->>'designation', 'Sans désignation'),
    item->>'description',
    (item->>'quantity')::numeric,
    item->>'unit',
    (item->>'unit_price')::numeric,
    (item->>'total_price')::numeric,
    (item->>'tva_rate')::numeric,
    item->>'category'
  FROM jsonb_array_elements(_items) AS item;

  UPDATE public.renovation_quotes
  SET analysis_result = _analysis_result,
      analyzed_at = now(),
      status = 'analyzed',
      updated_at = now()
  WHERE id = _quote_id;
END;
$$;