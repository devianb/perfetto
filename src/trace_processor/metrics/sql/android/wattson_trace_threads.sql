
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

INCLUDE PERFETTO MODULE wattson.curves.estimates;
INCLUDE PERFETTO MODULE viz.summary.threads_w_processes;

-- This metric is defined to be for entire trace duration
DROP VIEW IF EXISTS _wattson_period_window;
CREATE PERFETTO VIEW _wattson_period_window AS
SELECT
  trace_start() as ts,
  trace_dur() as dur;

SELECT RUN_METRIC(
  'android/wattson_tasks_attribution.sql',
  'window_table',
  '_wattson_period_window'
);

DROP VIEW IF EXISTS wattson_trace_threads_output;
CREATE PERFETTO VIEW wattson_trace_threads_output AS
SELECT AndroidWattsonTasksAttributionMetric(
  'metric_version', 3,
  'power_model_version', 1,
  'task_info', (
    SELECT RepeatedField(
      AndroidWattsonTaskInfo(
        'estimated_mws', ROUND(estimated_mws, 6),
        'estimated_mw', ROUND(estimated_mw, 6),
        'idle_transitions_mws', ROUND(idle_cost_mws, 6),
        'thread_name', thread_name,
        'process_name', process_name,
        'thread_id', tid,
        'process_id', pid
      )
    )
    FROM _wattson_thread_attribution
  )
);
