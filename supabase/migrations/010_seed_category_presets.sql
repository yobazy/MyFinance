-- MyFinance: seed default category presets and rules
-- Run after 009_category_presets.sql
--
-- This seeds a \"canadian_merchants_detailed\" preset based on the legacy
-- Django AutoCategorizationService.default_rules mapping.

do $$
declare
  v_preset_id uuid;
begin
  -- Upsert preset metadata
  insert into public.category_presets (key, name, description, version, is_active)
  values (
    'canadian_merchants_detailed',
    'Canadian merchants (detailed)',
    'Default merchant-based rules inspired by the legacy Django auto-categorization.',
    1,
    true
  )
  on conflict (key) do update
  set name = excluded.name,
      description = excluded.description,
      version = excluded.version,
      is_active = excluded.is_active
  returning id into v_preset_id;

  if v_preset_id is null then
    select id into v_preset_id
    from public.category_presets
    where key = 'canadian_merchants_detailed'
    limit 1;
  end if;

  -- Defensive: if still null, bail out
  if v_preset_id is null then
    raise exception 'Failed to resolve category_preset id for canadian_merchants_detailed';
  end if;

  -- Helper to insert a category if it doesn't exist
  -- canonical_key, name, display_order
  perform 1
  from public.category_preset_categories
  where preset_id = v_preset_id
    and canonical_key = 'dining_out';
  if not found then
    insert into public.category_preset_categories (
      preset_id, canonical_key, parent_canonical_key, name, description, color, display_order
    ) values (
      v_preset_id, 'dining_out', null,
      'Dining Out',
      'Restaurants, coffee shops, and food delivery.',
      '#EF6C00',
      10
    );
  end if;

  perform 1
  from public.category_preset_categories
  where preset_id = v_preset_id
    and canonical_key = 'groceries';
  if not found then
    insert into public.category_preset_categories (
      preset_id, canonical_key, parent_canonical_key, name, description, color, display_order
    ) values (
      v_preset_id, 'groceries', null,
      'Groceries',
      'Supermarkets and grocery stores.',
      '#2E7D32',
      20
    );
  end if;

  perform 1
  from public.category_preset_categories
  where preset_id = v_preset_id
    and canonical_key = 'gas_fuel';
  if not found then
    insert into public.category_preset_categories (
      preset_id, canonical_key, parent_canonical_key, name, description, color, display_order
    ) values (
      v_preset_id, 'gas_fuel', null,
      'Gas & Fuel',
      'Gas stations and fuel purchases.',
      '#455A64',
      30
    );
  end if;

  perform 1
  from public.category_preset_categories
  where preset_id = v_preset_id
    and canonical_key = 'transportation';
  if not found then
    insert into public.category_preset_categories (
      preset_id, canonical_key, parent_canonical_key, name, description, color, display_order
    ) values (
      v_preset_id, 'transportation', null,
      'Transportation',
      'Transit, ride sharing, and other transport.',
      '#0288D1',
      40
    );
  end if;

  perform 1
  from public.category_preset_categories
  where preset_id = v_preset_id
    and canonical_key = 'shopping';
  if not found then
    insert into public.category_preset_categories (
      preset_id, canonical_key, parent_canonical_key, name, description, color, display_order
    ) values (
      v_preset_id, 'shopping', null,
      'Shopping',
      'Retail, online and in-store shopping.',
      '#7B1FA2',
      50
    );
  end if;

  perform 1
  from public.category_preset_categories
  where preset_id = v_preset_id
    and canonical_key = 'convenience';
  if not found then
    insert into public.category_preset_categories (
      preset_id, canonical_key, parent_canonical_key, name, description, color, display_order
    ) values (
      v_preset_id, 'convenience', null,
      'Convenience',
      'Convenience stores and small quick purchases.',
      '#6D4C41',
      60
    );
  end if;

  perform 1
  from public.category_preset_categories
  where preset_id = v_preset_id
    and canonical_key = 'utilities';
  if not found then
    insert into public.category_preset_categories (
      preset_id, canonical_key, parent_canonical_key, name, description, color, display_order
    ) values (
      v_preset_id, 'utilities', null,
      'Utilities',
      'Hydro, internet, phone, and other utilities.',
      '#00838F',
      70
    );
  end if;

  perform 1
  from public.category_preset_categories
  where preset_id = v_preset_id
    and canonical_key = 'banking_fees';
  if not found then
    insert into public.category_preset_categories (
      preset_id, canonical_key, parent_canonical_key, name, description, color, display_order
    ) values (
      v_preset_id, 'banking_fees', null,
      'Banking & Fees',
      'Bank fees, interest charges, and service charges.',
      '#5D4037',
      80
    );
  end if;

  perform 1
  from public.category_preset_categories
  where preset_id = v_preset_id
    and canonical_key = 'healthcare';
  if not found then
    insert into public.category_preset_categories (
      preset_id, canonical_key, parent_canonical_key, name, description, color, display_order
    ) values (
      v_preset_id, 'healthcare', null,
      'Healthcare',
      'Pharmacies, medical, dental, and clinics.',
      '#C62828',
      90
    );
  end if;

  perform 1
  from public.category_preset_categories
  where preset_id = v_preset_id
    and canonical_key = 'entertainment';
  if not found then
    insert into public.category_preset_categories (
      preset_id, canonical_key, parent_canonical_key, name, description, color, display_order
    ) values (
      v_preset_id, 'entertainment', null,
      'Entertainment',
      'Streaming, movies, and general entertainment.',
      '#AD1457',
      100
    );
  end if;

  perform 1
  from public.category_preset_categories
  where preset_id = v_preset_id
    and canonical_key = 'events';
  if not found then
    insert into public.category_preset_categories (
      preset_id, canonical_key, parent_canonical_key, name, description, color, display_order
    ) values (
      v_preset_id, 'events', null,
      'Events',
      'Concerts, festivals, and other ticketed events.',
      '#8E24AA',
      110
    );
  end if;

  perform 1
  from public.category_preset_categories
  where preset_id = v_preset_id
    and canonical_key = 'nightlife';
  if not found then
    insert into public.category_preset_categories (
      preset_id, canonical_key, parent_canonical_key, name, description, color, display_order
    ) values (
      v_preset_id, 'nightlife', null,
      'Nightlife',
      'Bars, clubs, and nightlife.',
      '#4A148C',
      120
    );
  end if;

  perform 1
  from public.category_preset_categories
  where preset_id = v_preset_id
    and canonical_key = 'subscriptions';
  if not found then
    insert into public.category_preset_categories (
      preset_id, canonical_key, parent_canonical_key, name, description, color, display_order
    ) values (
      v_preset_id, 'subscriptions', null,
      'Subscriptions',
      'Recurring digital subscriptions.',
      '#1565C0',
      130
    );
  end if;

  perform 1
  from public.category_preset_categories
  where preset_id = v_preset_id
    and canonical_key = 'alcohol';
  if not found then
    insert into public.category_preset_categories (
      preset_id, canonical_key, parent_canonical_key, name, description, color, display_order
    ) values (
      v_preset_id, 'alcohol', null,
      'Alcohol',
      'Liquor stores, wine, beer, and bars.',
      '#6A1B9A',
      140
    );
  end if;

  perform 1
  from public.category_preset_categories
  where preset_id = v_preset_id
    and canonical_key = 'cannabis';
  if not found then
    insert into public.category_preset_categories (
      preset_id, canonical_key, parent_canonical_key, name, description, color, display_order
    ) values (
      v_preset_id, 'cannabis', null,
      'Cannabis',
      'Legal cannabis purchases.',
      '#1B5E20',
      150
    );
  end if;

  perform 1
  from public.category_preset_categories
  where preset_id = v_preset_id
    and canonical_key = 'vaping';
  if not found then
    insert into public.category_preset_categories (
      preset_id, canonical_key, parent_canonical_key, name, description, color, display_order
    ) values (
      v_preset_id, 'vaping', null,
      'Vaping',
      'Vape shops and vaping products.',
      '#37474F',
      160
    );
  end if;

  -- Rules: keyword-based patterns for each category, mirroring the Django defaults.

  -- Dining Out
  insert into public.category_preset_rules (
    preset_id, key, name, description, rule_type, pattern, target_category_key, default_priority, default_confidence, is_active
  )
  values (
    v_preset_id,
    'dining_out_keywords',
    'Dining Out merchants',
    'Common restaurant and food delivery merchants.',
    'keyword',
    'STARBUCKS,MCDONALDS,TIM HORTONS,WENDYS,BURGER KING,PIZZA HUT,SUBWAY,KFC,POPEYES,PANERA,A&W,HARVEY,SWISS CHALET,BOSTON PIZZA,KELSEY,MONTANA,RESTAURANT,CAFE,COFFEE,BISTRO,GRILL,PUB,DOORDASH,UBER EATS,SKIP THE DISHES,FOODORA,GRUBHUB,BANGKOK,THAI,CHINESE,INDIAN,MEXICAN,ITALIAN',
    'dining_out',
    5,
    0.8,
    true
  )
  on conflict (preset_id, key) do update
  set pattern = excluded.pattern,
      target_category_key = excluded.target_category_key,
      default_priority = excluded.default_priority,
      default_confidence = excluded.default_confidence,
      is_active = excluded.is_active,
      name = excluded.name,
      description = excluded.description;

  -- Groceries
  insert into public.category_preset_rules (
    preset_id, key, name, description, rule_type, pattern, target_category_key, default_priority, default_confidence, is_active
  )
  values (
    v_preset_id,
    'groceries_keywords',
    'Grocery merchants',
    'Common grocery and supermarket merchants.',
    'keyword',
    'WALMART,COSTCO,SUPERSTORE,SOBEYS,LOBLAWS,METRO,FOOD BASICS,NO FRILLS,FRESHCO,FARM BOY,INDEPENDENT,VALUMART,ZEHRS,FORTINOS,DOMINION',
    'groceries',
    5,
    0.8,
    true
  )
  on conflict (preset_id, key) do update
  set pattern = excluded.pattern,
      target_category_key = excluded.target_category_key,
      default_priority = excluded.default_priority,
      default_confidence = excluded.default_confidence,
      is_active = excluded.is_active,
      name = excluded.name,
      description = excluded.description;

  -- Gas & Fuel
  insert into public.category_preset_rules (
    preset_id, key, name, description, rule_type, pattern, target_category_key, default_priority, default_confidence, is_active
  )
  values (
    v_preset_id,
    'gas_fuel_keywords',
    'Gas & Fuel merchants',
    'Common gas station and fuel merchants.',
    'keyword',
    'PETRO,SHELL,ESSO,MOBIL,CANADIAN TIRE GAS,ULTRAMAR,HUSKY,PIONEER,CHEVRON,SUNOCO,GAS STATION,FUEL,PETROLEUM',
    'gas_fuel',
    5,
    0.8,
    true
  )
  on conflict (preset_id, key) do update
  set pattern = excluded.pattern,
      target_category_key = excluded.target_category_key,
      default_priority = excluded.default_priority,
      default_confidence = excluded.default_confidence,
      is_active = excluded.is_active,
      name = excluded.name,
      description = excluded.description;

  -- Transportation
  insert into public.category_preset_rules (
    preset_id, key, name, description, rule_type, pattern, target_category_key, default_priority, default_confidence, is_active
  )
  values (
    v_preset_id,
    'transportation_keywords',
    'Transportation merchants',
    'Transit, ride sharing, and transport merchants.',
    'keyword',
    'TTC,UBER,LYFT,VIA RAIL,GO TRANSIT,OC TRANSPO,TAXI,CAB,TRANSIT,BUS,TRAIN,PARKING,PRESTO,FARE,METRO,SUBWAY',
    'transportation',
    5,
    0.8,
    true
  )
  on conflict (preset_id, key) do update
  set pattern = excluded.pattern,
      target_category_key = excluded.target_category_key,
      default_priority = excluded.default_priority,
      default_confidence = excluded.default_confidence,
      is_active = excluded.is_active,
      name = excluded.name,
      description = excluded.description;

  -- Shopping
  insert into public.category_preset_rules (
    preset_id, key, name, description, rule_type, pattern, target_category_key, default_priority, default_confidence, is_active
  )
  values (
    v_preset_id,
    'shopping_keywords',
    'Shopping merchants',
    'Retail shopping merchants.',
    'keyword',
    'AMAZON,CANADIAN TIRE,HOME DEPOT,LOWES,IKEA,BEST BUY,STAPLES,WALMART,TARGET,DOLLARAMA,WINNERS,MARSHALLS,HUDSON BAY',
    'shopping',
    5,
    0.8,
    true
  )
  on conflict (preset_id, key) do update
  set pattern = excluded.pattern,
      target_category_key = excluded.target_category_key,
      default_priority = excluded.default_priority,
      default_confidence = excluded.default_confidence,
      is_active = excluded.is_active,
      name = excluded.name,
      description = excluded.description;

  -- Convenience
  insert into public.category_preset_rules (
    preset_id, key, name, description, rule_type, pattern, target_category_key, default_priority, default_confidence, is_active
  )
  values (
    v_preset_id,
    'convenience_keywords',
    'Convenience merchants',
    'Convenience and corner stores.',
    'keyword',
    '7-ELEVEN,CIRCLE K,MAC,COUGAR,QUICK MART,CONVENIENCE,CORNER STORE,GAS STATION,FUEL,SNACK,DRINK,CIGARETTE,TOBACCO,LOTTERY',
    'convenience',
    5,
    0.8,
    true
  )
  on conflict (preset_id, key) do update
  set pattern = excluded.pattern,
      target_category_key = excluded.target_category_key,
      default_priority = excluded.default_priority,
      default_confidence = excluded.default_confidence,
      is_active = excluded.is_active,
      name = excluded.name,
      description = excluded.description;

  -- Utilities
  insert into public.category_preset_rules (
    preset_id, key, name, description, rule_type, pattern, target_category_key, default_priority, default_confidence, is_active
  )
  values (
    v_preset_id,
    'utilities_keywords',
    'Utilities merchants',
    'Hydro, telecom, and utility providers.',
    'keyword',
    'HYDRO,BELL,ROGERS,TELUS,FIDO,VIRGIN MOBILE,SHAW,COGECO,VIDEOTRON,ENBRIDGE,UNION GAS,ELECTRIC,WATER,INTERNET,PHONE,CABLE',
    'utilities',
    5,
    0.8,
    true
  )
  on conflict (preset_id, key) do update
  set pattern = excluded.pattern,
      target_category_key = excluded.target_category_key,
      default_priority = excluded.default_priority,
      default_confidence = excluded.default_confidence,
      is_active = excluded.is_active,
      name = excluded.name,
      description = excluded.description;

  -- Banking & Fees
  insert into public.category_preset_rules (
    preset_id, key, name, description, rule_type, pattern, target_category_key, default_priority, default_confidence, is_active
  )
  values (
    v_preset_id,
    'banking_fees_keywords',
    'Banking & fee descriptors',
    'Bank fees and service charges.',
    'keyword',
    'BANK FEE,SERVICE CHARGE,OVERDRAFT,ATM FEE,MONTHLY FEE,ANNUAL FEE,INTEREST CHARGE',
    'banking_fees',
    5,
    0.8,
    true
  )
  on conflict (preset_id, key) do update
  set pattern = excluded.pattern,
      target_category_key = excluded.target_category_key,
      default_priority = excluded.default_priority,
      default_confidence = excluded.default_confidence,
      is_active = excluded.is_active,
      name = excluded.name,
      description = excluded.description;

  -- Healthcare
  insert into public.category_preset_rules (
    preset_id, key, name, description, rule_type, pattern, target_category_key, default_priority, default_confidence, is_active
  )
  values (
    v_preset_id,
    'healthcare_keywords',
    'Healthcare merchants',
    'Pharmacies and healthcare providers.',
    'keyword',
    'PHARMACY,SHOPPERS,REXALL,MEDICAL,DENTAL,CLINIC,HOSPITAL,DOCTOR,PHYSIOTHERAPY',
    'healthcare',
    5,
    0.8,
    true
  )
  on conflict (preset_id, key) do update
  set pattern = excluded.pattern,
      target_category_key = excluded.target_category_key,
      default_priority = excluded.default_priority,
      default_confidence = excluded.default_confidence,
      is_active = excluded.is_active,
      name = excluded.name,
      description = excluded.description;

  -- Entertainment
  insert into public.category_preset_rules (
    preset_id, key, name, description, rule_type, pattern, target_category_key, default_priority, default_confidence, is_active
  )
  values (
    v_preset_id,
    'entertainment_keywords',
    'Entertainment merchants',
    'Streaming and entertainment services.',
    'keyword',
    'NETFLIX,SPOTIFY,AMAZON PRIME,DISNEY,APPLE MUSIC,CINEPLEX,LANDMARK,MOVIE,THEATRE,CONCERT,STUBHUB,TICKETMASTER,LEGENDS MUSIC,MUSIC,CONCERT',
    'entertainment',
    5,
    0.8,
    true
  )
  on conflict (preset_id, key) do update
  set pattern = excluded.pattern,
      target_category_key = excluded.target_category_key,
      default_priority = excluded.default_priority,
      default_confidence = excluded.default_confidence,
      is_active = excluded.is_active,
      name = excluded.name,
      description = excluded.description;

  -- Events
  insert into public.category_preset_rules (
    preset_id, key, name, description, rule_type, pattern, target_category_key, default_priority, default_confidence, is_active
  )
  values (
    v_preset_id,
    'events_keywords',
    'Event merchants',
    'Ticketed events and festivals.',
    'keyword',
    'TICKETMASTER,STUBHUB,EVENTBRITE,CONCERT,FESTIVAL,CONFERENCE,EXPO,SHOW,PERFORMANCE,THEATRE,SPORTS EVENT,GAME,MATCH,TOURNAMENT,EVENT',
    'events',
    5,
    0.8,
    true
  )
  on conflict (preset_id, key) do update
  set pattern = excluded.pattern,
      target_category_key = excluded.target_category_key,
      default_priority = excluded.default_priority,
      default_confidence = excluded.default_confidence,
      is_active = excluded.is_active,
      name = excluded.name,
      description = excluded.description;

  -- Nightlife
  insert into public.category_preset_rules (
    preset_id, key, name, description, rule_type, pattern, target_category_key, default_priority, default_confidence, is_active
  )
  values (
    v_preset_id,
    'nightlife_keywords',
    'Nightlife merchants',
    'Bars, clubs, and nightlife.',
    'keyword',
    'BAR,CLUB,NIGHTCLUB,LOUNGE,PUB,TAVERN,COCKTAIL,DANCE,NIGHTLIFE,DRINK,ALCOHOL,WINE,BEER,SPIRITS,NIGHT OUT',
    'nightlife',
    5,
    0.8,
    true
  )
  on conflict (preset_id, key) do update
  set pattern = excluded.pattern,
      target_category_key = excluded.target_category_key,
      default_priority = excluded.default_priority,
      default_confidence = excluded.default_confidence,
      is_active = excluded.is_active,
      name = excluded.name,
      description = excluded.description;

  -- Subscriptions
  insert into public.category_preset_rules (
    preset_id, key, name, description, rule_type, pattern, target_category_key, default_priority, default_confidence, is_active
  )
  values (
    v_preset_id,
    'subscriptions_keywords',
    'Subscription descriptors',
    'Recurring subscription descriptors.',
    'keyword',
    'APPLE.COM,APPLE MUSIC,APPLE TV,APPLE STORE,GOOGLE,MICROSOFT,ADOBE,SUBSCRIPTION',
    'subscriptions',
    5,
    0.8,
    true
  )
  on conflict (preset_id, key) do update
  set pattern = excluded.pattern,
      target_category_key = excluded.target_category_key,
      default_priority = excluded.default_priority,
      default_confidence = excluded.default_confidence,
      is_active = excluded.is_active,
      name = excluded.name,
      description = excluded.description;

  -- Alcohol
  insert into public.category_preset_rules (
    preset_id, key, name, description, rule_type, pattern, target_category_key, default_priority, default_confidence, is_active
  )
  values (
    v_preset_id,
    'alcohol_keywords',
    'Alcohol merchants',
    'Liquor stores and alcohol descriptors.',
    'keyword',
    'LCBO,BEER STORE,SAQ,BC LIQUOR,ALBERTA LIQUOR,WINE,BEER,SPIRITS,LIQUOR,ALCOHOL,VODKA,WHISKEY,RUM,GIN,TEQUILA,CHAMPAGNE,COCKTAIL,BAR,PUB,TAVERN,BREWERY,WINERY,DISTILLERY',
    'alcohol',
    5,
    0.8,
    true
  )
  on conflict (preset_id, key) do update
  set pattern = excluded.pattern,
      target_category_key = excluded.target_category_key,
      default_priority = excluded.default_priority,
      default_confidence = excluded.default_confidence,
      is_active = excluded.is_active,
      name = excluded.name,
      description = excluded.description;

  -- Cannabis
  insert into public.category_preset_rules (
    preset_id, key, name, description, rule_type, pattern, target_category_key, default_priority, default_confidence, is_active
  )
  values (
    v_preset_id,
    'cannabis_keywords',
    'Cannabis merchants',
    'Legal cannabis merchants.',
    'keyword',
    'OCS,CANNABIS,MARIJUANA,WEED,POT,DISPENSARY,CANNABIS STORE,CANNABIS RETAIL,CANNABIS CO,CANNABIS CORP,CANNABIS INC,CANNABIS LTD,CANNABIS SHOP,CANNABIS OUTLET,CANNABIS MARKET,CANNABIS SUPPLY,CANNABIS EXPRESS,CANNABIS CLUB,CANNABIS CAFE,CANNABIS LOUNGE',
    'cannabis',
    5,
    0.8,
    true
  )
  on conflict (preset_id, key) do update
  set pattern = excluded.pattern,
      target_category_key = excluded.target_category_key,
      default_priority = excluded.default_priority,
      default_confidence = excluded.default_confidence,
      is_active = excluded.is_active,
      name = excluded.name,
      description = excluded.description;

  -- Vaping
  insert into public.category_preset_rules (
    preset_id, key, name, description, rule_type, pattern, target_category_key, default_priority, default_confidence, is_active
  )
  values (
    v_preset_id,
    'vaping_keywords',
    'Vaping merchants',
    'Vape shops and vaping descriptors.',
    'keyword',
    'VAPE,VAPING,E-CIGARETTE,E-CIG,VAPOR,VAPORIZER,VAPE SHOP,VAPE STORE,VAPE OUTLET,VAPE SUPPLY,VAPE EXPRESS,VAPE MARKET,VAPE CORNER,VAPE LOUNGE,VAPE CAFE,VAPE BAR,VAPE CLUB,VAPE WORLD',
    'vaping',
    5,
    0.8,
    true
  )
  on conflict (preset_id, key) do update
  set pattern = excluded.pattern,
      target_category_key = excluded.target_category_key,
      default_priority = excluded.default_priority,
      default_confidence = excluded.default_confidence,
      is_active = excluded.is_active,
      name = excluded.name,
      description = excluded.description;

end $$;

