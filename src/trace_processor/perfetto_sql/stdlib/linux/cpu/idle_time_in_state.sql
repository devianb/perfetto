--
-- Copyright 2024 The Android Open Source Project
--
-- Licensed under the Apache License, Version 2.0 (the "License");
-- you may not use this file except in compliance with the License.
-- You may obtain a copy of the License at
--
--     https://www.apache.org/licenses/LICENSE-2.0
--
-- Unless required by applicable law or agreed to in writing, software
-- distributed under the License is distributed on an "AS IS" BASIS,
-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
-- See the License for the specific language governing permissions and
-- limitations under the License.
INCLUDE PERFETTO MODULE time.conversion;

-- Percentage counter information for sysfs cpuidle states.
-- For each state per cpu, report the incremental time spent in one state,
-- divided by time spent in all states, between two timestamps.
CREATE PERFETTO TABLE linux_per_cpu_idle_time_in_state_counters(
  -- Timestamp.
  ts TIMESTAMP,
  -- The machine this residency is calculated for.
  machine_id LONG,
  -- State name.
  state STRING,
  -- CPU.
  cpu LONG,
  -- Percentage of time this cpu spent in this state.
  idle_percentage DOUBLE,
  -- Incremental time spent in this state (residency), in microseconds.
  total_residency DOUBLE,
  -- Time this cpu spent in any state, in microseconds.
  time_slice LONG
) AS
WITH cpu_counts_per_machine AS (
  SELECT machine_id, count(1) AS cpu_count
  FROM cpu
  GROUP BY machine_id
),
idle_states AS (
  SELECT
    c.ts,
    c.value,
    c.track_id,
    t.machine_id,
    EXTRACT_ARG(t.dimension_arg_set_id, 'state') as state,
    EXTRACT_ARG(t.dimension_arg_set_id, 'cpu') as cpu
  FROM counter c
  JOIN track t on c.track_id = t.id
  WHERE t.type = 'cpu_idle_state'
),
residency_deltas AS (
  SELECT
    ts,
    state,
    cpu,
    idle_states.machine_id,
    track_id,
    value - (LAG(value) OVER (PARTITION BY track_id ORDER BY ts)) as total_residency,
    (time_to_us(ts - LAG(ts, 1) over (PARTITION BY track_id ORDER BY ts))) as time_slice
  FROM idle_states
)
SELECT
  ts,
  machine_id,
  state,
  cpu,
  MIN(100, (total_residency / time_slice) * 100) as idle_percentage,
  total_residency,
  time_slice
  FROM residency_deltas
  WHERE time_slice IS NOT NULL
UNION ALL
-- Calculate c0 state by subtracting all other states from total time.
SELECT
  ts,
  machine_id,
  'C0' as state,
  cpu,
  MAX(0,
    ((time_slice - SUM(total_residency)) / time_slice) * 100
  )
    AS idle_percentage,
  MAX(0, time_slice - SUM(total_residency)) as total_residency,
  time_slice
FROM residency_deltas
WHERE time_slice IS NOT NULL
GROUP BY ts, cpu, machine_id;

-- Percentage counter information for sysfs cpuidle states.
-- For each state across all CPUs, report the incremental time spent in one
-- state, divided by time spent in all states, between two timestamps.
CREATE PERFETTO TABLE linux_cpu_idle_time_in_state_counters(
  -- Timestamp.
  ts TIMESTAMP,
  -- The machine this residency is calculated for.
  machine_id LONG,
  -- State name.
  state STRING,
  -- Percentage of time all CPUS spent in this state.
  idle_percentage DOUBLE,
  -- Incremental time spent in this state (residency), in microseconds.
  total_residency DOUBLE,
  -- Time all CPUS spent in any state, in microseconds.
  time_slice LONG
) AS
SELECT
  ts,
  machine_id,
  state,
  MIN(100,(SUM(total_residency) / SUM(time_slice)) * 100 ) as idle_percentage,
  SUM(total_residency) as total_residency,
  SUM(time_slice) as time_slice
FROM linux_per_cpu_idle_time_in_state_counters
GROUP BY ts, state, machine_id;
