revoke all on function public.raise_check_regression_exception() from public, anon, authenticated;

comment on function public.raise_check_regression_exception() is
  'Internal trigger only. Opens a Manager-owned regression exception when a previously passed check becomes failed.';
