-- Wallets that both used the subsector's contracts in the last 90 days and hold one of the assets above min_balance (M168).
with contracts as (
  select lower(trim(x)) as addr from unnest(split('{{protocol_addresses}}', ',')) as t(x) where trim(x) <> ''
),
assets as (
  select lower(trim(x)) as addr from unnest(split('{{asset_addresses}}', ',')) as t(x) where trim(x) <> ''
),
users as (
  select distinct case when lower(cast("from" as varchar)) in (select addr from contracts) then "to" else "from" end as wallet
  from erc20_arbitrum.evt_Transfer
  where evt_block_time >= now() - interval '90' day
    and (lower(cast("to" as varchar)) in (select addr from contracts) or lower(cast("from" as varchar)) in (select addr from contracts))
),
flows as (
  select "to" as wallet, cast(value as double) as delta
  from erc20_arbitrum.evt_Transfer where lower(cast(contract_address as varchar)) in (select addr from assets)
  union all
  select "from" as wallet, -cast(value as double) as delta
  from erc20_arbitrum.evt_Transfer where lower(cast(contract_address as varchar)) in (select addr from assets)
),
holders as (
  select wallet from (select wallet, sum(delta) as bal from flows group by wallet) where bal > cast('{{min_balance}}' as double)
)
select count(*) as wallets from users where wallet in (select wallet from holders)
