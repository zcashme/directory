-- Retire Maxi Mode. Design access and zero-fee OTP now follow zns_active.
-- Non-ZNS profiles lose Maxi and any Maxi-granted theme.
update public.zcasher
set
  is_maxi = false,
  maxi_source = null,
  profile_theme_package = null,
  profile_card_theme = null,
  profile_page_bkgd = null,
  profile_card_border = null
where coalesce(zns_active, false) is not true;

-- ZNS profiles: keep chosen colors; drop the Maxi flag only.
update public.zcasher
set is_maxi = false, maxi_source = null
where zns_active is true;
