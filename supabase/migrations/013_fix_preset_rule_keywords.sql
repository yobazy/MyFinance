-- Fix overly broad preset keywords and add common merchant aliases.
-- This updates both the preset templates and any existing preset-derived user rules.

do $$
declare
  v_preset_id uuid;
  v_dining_pattern text := 'STARBUCKS,MCDONALDS,MCDONALD''S,CHIPOTLE,TIM HORTONS,WENDYS,BURGER KING,PIZZA HUT,SUBWAY,KFC,POPEYES,PANERA,A&W,HARVEY,SWISS CHALET,BOSTON PIZZA,KELSEY,MONTANA,RESTAURANT,CAFE,COFFEE,BISTRO,GRILL,PUB,DOORDASH,UBER EATS,SKIP THE DISHES,FOODORA,GRUBHUB,BANGKOK,THAI,CHINESE,INDIAN,MEXICAN,ITALIAN';
  v_entertainment_pattern text := 'NETFLIX,SPOTIFY,AMAZON PRIME,DISNEY,APPLE MUSIC,CINEPLEX,LANDMARK,STEAM,STEAM GAMES,PLAYSTATION,NINTENDO,XBOX,MOVIE,THEATRE,CONCERT,STUBHUB,TICKETMASTER,LEGENDS MUSIC,MUSIC,CONCERT';
  v_events_pattern text := 'TICKETMASTER,STUBHUB,EVENTBRITE,CONCERT,FESTIVAL,CONFERENCE,EXPO,SHOW,PERFORMANCE,THEATRE,SPORTS EVENT,TOURNAMENT,EVENT';
  v_cannabis_pattern text := 'OCS,CANNABIS,MARIJUANA,WEED,DISPENSARY,CANNABIS STORE,CANNABIS RETAIL,CANNABIS CO,CANNABIS CORP,CANNABIS INC,CANNABIS LTD,CANNABIS SHOP,CANNABIS OUTLET,CANNABIS MARKET,CANNABIS SUPPLY,CANNABIS EXPRESS,CANNABIS CLUB,CANNABIS CAFE,CANNABIS LOUNGE';
begin
  select id
    into v_preset_id
  from public.category_presets
  where key = 'default_v1'
  limit 1;

  if v_preset_id is null then
    raise notice 'default_v1 preset not found; skipping preset keyword fixes';
    return;
  end if;

  update public.category_preset_rules
  set pattern = v_dining_pattern
  where preset_id = v_preset_id
    and key = 'dining_out_keywords';

  update public.category_preset_rules
  set pattern = v_entertainment_pattern
  where preset_id = v_preset_id
    and key = 'entertainment_keywords';

  update public.category_preset_rules
  set pattern = v_events_pattern
  where preset_id = v_preset_id
    and key = 'events_keywords';

  update public.category_preset_rules
  set pattern = v_cannabis_pattern
  where preset_id = v_preset_id
    and key = 'cannabis_keywords';

  update public.categorization_rules
  set pattern = v_dining_pattern
  where preset_key = 'default_v1'
    and preset_rule_key = 'dining_out_keywords';

  update public.categorization_rules
  set pattern = v_entertainment_pattern
  where preset_key = 'default_v1'
    and preset_rule_key = 'entertainment_keywords';

  update public.categorization_rules
  set pattern = v_events_pattern
  where preset_key = 'default_v1'
    and preset_rule_key = 'events_keywords';

  update public.categorization_rules
  set pattern = v_cannabis_pattern
  where preset_key = 'default_v1'
    and preset_rule_key = 'cannabis_keywords';
end $$;
