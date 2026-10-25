-- Wallets whose net balance of any of the assets is above min_balance, from the transfer log (M168).
with assets as (
  select lower(trim(x)) as addr from unnest(split('{{asset_addresses}}', ',')) as t(x) where trim(x) <> ''
),
flows as (
  select "to" as wallet, cast(value as double) as delta
  from erc20_robinhood.evt_Transfer where lower(cast(contract_address as varchar)) in (select addr from assets)
  union all
  select "from" as wallet, -cast(value as double) as delta
  from erc20_robinhood.evt_Transfer where lower(cast(contract_address as varchar)) in (select addr from assets)
),
balances as (
  select wallet, sum(delta) as bal from flows group by wallet
)
select count(*) as wallets from balances where bal > cast('{{min_balance}}' as double)
