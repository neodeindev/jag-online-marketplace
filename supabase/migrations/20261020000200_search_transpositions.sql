-- =============================================================================
-- Search: better typo tolerance in the fuzzy pass.
--
-- Trigram similarity copes with most typos in longer words, but misses two
-- common kinds: neighbouring letters swapped ("iphnoe", "smasung"), which
-- breaks several trigrams at once, and a missing letter in a short word
-- ("jcket"). The fuzzy pass now also tries, for each word of 4+ letters:
--   - every adjacent-letter swap, against the search index;
--   - words from product titles, brands and categories within 1 edit
--     (2 for words of 6+ letters), like a "did you mean".
--
-- Trigram matching also switches to strict_word_similarity, which compares
-- whole words, so a typo can't match a stretch of text spanning several words
-- of a long description ("perfme" matching "pepper ... realme").
-- =============================================================================

create extension if not exists fuzzystrmatch with schema extensions;

-- "iphnoe" -> {pihnoe, ihpnoe, ipnhoe, iphone, iphneo}
create or replace function public.search_swaps(p_token text)
returns text[]
language sql
immutable
set search_path = public, pg_temp
as $$
  select coalesce(array_agg(distinct v), '{}')
  from (
    select left(p_token, i - 1) || substr(p_token, i + 1, 1) || substr(p_token, i, 1) || substr(p_token, i + 2) as v
    from generate_series(1, length(p_token) - 1) as i
  ) swaps
  where v <> p_token;
$$;

create or replace function public.search_base(p_query text default null, p_category_slug text default null)
returns table (product_id uuid, score real, is_fuzzy boolean)
language plpgsql
stable
set search_path = public, extensions, pg_temp
as $$
declare
  v_tokens text[] := public.search_tokens(p_query);
  v_norm text := array_to_string(v_tokens, ' ');
  v_category_ids uuid[];
  v_all_query tsquery;
begin
  if p_category_slug is not null and p_category_slug <> '' then
    select array_agg(s.id) into v_category_ids
    from public.categories c, public.category_subtree(c.id) s
    where c.slug = p_category_slug;

    if v_category_ids is null then
      return;
    end if;
  end if;

  if cardinality(v_tokens) = 0 then
    return query
      select p.id, 0::real, false
      from public.products p
      where p.status = 'active'
        and (v_category_ids is null or p.category_id = any (v_category_ids));
    return;
  end if;

  -- Combined prefix query used for ranking. Stop words drop out automatically.
  select to_tsquery('english', string_agg(tok || ':*', ' & '))
  into v_all_query
  from unnest(v_tokens) tok;

  -- Pass 1: every meaningful word prefix-matches.
  return query
    with toks as (
      select tok, to_tsquery('english', tok || ':*') as q from unnest(v_tokens) tok
    )
    select
      p.id,
      (
        ts_rank_cd(p.search_vector, v_all_query) * 4
        + extensions.similarity(v_norm, lower(extensions.unaccent(p.title)))
      )::real,
      false
    from public.products p
    where p.status = 'active'
      and (v_category_ids is null or p.category_id = any (v_category_ids))
      and not exists (
        select 1 from toks
        where numnode(toks.q) > 0 and not (p.search_vector @@ toks.q)
      );

  if found then
    return;
  end if;

  -- Pass 2: allow near-miss spellings for words of 4+ letters: similar
  -- trigrams, two neighbouring letters swapped, or a close catalog word.
  return query
    with vocab as materialized (
      select distinct w as word
      from public.products p
      left join public.brands b on b.id = p.brand_id
      left join public.categories c on c.id = p.category_id
      cross join lateral regexp_split_to_table(
        lower(extensions.unaccent(concat_ws(' ', p.title, b.name, c.name))), '[^a-z0-9]+'
      ) as w
      where p.status = 'active' and length(w) >= 3
    ),
    toks as (
      select
        tok,
        to_tsquery('english', tok || ':*') as q,
        case
          when length(tok) >= 4 then (
            select to_tsquery('english', string_agg(alt, ' | '))
            from (
              select v || ':*' as alt from unnest(public.search_swaps(tok)) v
              union
              select vocab.word from vocab
              where abs(length(vocab.word) - length(tok)) <= 2
                and extensions.levenshtein_less_equal(tok, vocab.word, 2) <= case when length(tok) <= 5 then 1 else 2 end
            ) alts
          )
        end as alts
      from unnest(v_tokens) tok
    )
    select
      p.id,
      -- Words found in the index (as typed or corrected) rank above trigram look-alikes.
      (
        (
          select count(*) from toks
          where p.search_vector @@ toks.q
            or (toks.alts is not null and numnode(toks.alts) > 0 and p.search_vector @@ toks.alts)
        )
        + extensions.strict_word_similarity(v_norm, p.search_text)
        + extensions.similarity(v_norm, lower(extensions.unaccent(p.title)))
      )::real,
      true
    from public.products p
    where p.status = 'active'
      and (v_category_ids is null or p.category_id = any (v_category_ids))
      and not exists (
        select 1 from toks
        where numnode(toks.q) > 0
          and not (
            p.search_vector @@ toks.q
            or (length(toks.tok) >= 4 and extensions.strict_word_similarity(toks.tok, p.search_text) >= 0.4)
            or (toks.alts is not null and numnode(toks.alts) > 0 and p.search_vector @@ toks.alts)
          )
      );
end;
$$;

grant execute on function public.search_swaps(text) to anon, authenticated, service_role;
