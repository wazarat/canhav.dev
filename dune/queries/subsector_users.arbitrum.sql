-- Wallets that moved a token to or from any of the subsector's contracts in the last 90 days (M168).
-- One row per day for the sparkline, then one row with a null day for the distinct total.
with contracts as (
  select lower(trim(x)) as addr from unnest(split('{{protocol_addresses}}', ',')) as t(x) where trim(x) <> ''
),
moves as (
  select
    date_trunc('day', evt_block_time) as day,
    case when lower(cast("from" as varchar)) in (select addr from contracts) then "to" else "from" end as wallet
  from erc20_arbitrum.evt_Transfer
  where evt_block_time >= now() - interval '90' day
    and (lower(cast("to" as varchar)) in (select addr from contracts) or lower(cast("from" as varchar)) in (select addr from contracts))
)
select day, count(distinct wallet) as wallets from moves group by 1
union all
select cast(null as timestamp) as day, count(distinct wallet) as wallets from moves
order by 1
