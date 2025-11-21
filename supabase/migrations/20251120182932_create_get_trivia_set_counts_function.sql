CREATE OR REPLACE FUNCTION get_trivia_set_counts()
RETURNS TABLE(set_id uuid, question_count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ts.id as set_id,
    count(q.id) as question_count
  FROM
    public.trivia_sets ts
  LEFT JOIN
    public.questions q ON ts.id = q.trivia_set_id
  GROUP BY
    ts.id;
END;
$$ LANGUAGE plpgsql;
