// Copyright (C) 2024 The Android Open Source Project
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import m from 'mithril';
import SqlModulesPlugin from '../dev.perfetto.SqlModules';

import {PageWithTraceAttrs} from '../../public/page';
import {SegmentedButtons} from '../../widgets/segmented_buttons';
import {DataVisualiser} from './data_visualiser/data_visualiser';
import {QueryBuilder} from './query_builder/builder';
import {Button} from '../../widgets/button';
import {Intent} from '../../widgets/common';
import {QueryNode} from './query_node';

export interface ExploreTableState {
  rootNode?: QueryNode;
  selectedNode?: QueryNode;
}

interface ExplorePageAttrs extends PageWithTraceAttrs {
  readonly sqlModulesPlugin: SqlModulesPlugin;
  readonly state: ExploreTableState;
}

enum ExplorePageModes {
  QUERY_BUILDER,
  DATA_VISUALISER,
}

const ExplorePageModeToLabel: Record<ExplorePageModes, string> = {
  [ExplorePageModes.QUERY_BUILDER]: 'Query Builder',
  [ExplorePageModes.DATA_VISUALISER]: 'Data Visualiser',
};

export class ExplorePage implements m.ClassComponent<ExplorePageAttrs> {
  private selectedMode = ExplorePageModes.QUERY_BUILDER;

  view({attrs}: m.CVnode<ExplorePageAttrs>) {
    const {trace} = attrs;

    return m(
      '.page.explore-page',
      m(
        '.explore-page__header',
        'Exploration Mode: ',
        m(SegmentedButtons, {
          options: [
            {label: ExplorePageModeToLabel[ExplorePageModes.QUERY_BUILDER]},
            {label: ExplorePageModeToLabel[ExplorePageModes.DATA_VISUALISER]},
          ],
          selectedOption: this.selectedMode,
          onOptionSelected: (i) => (this.selectedMode = i),
        }),
        m('span', {style: {flexGrow: 1}}),
        m(Button, {
          label: 'Reset',
          intent: Intent.Primary,
          onclick: () => {
            attrs.state.rootNode = undefined;
            attrs.state.selectedNode = undefined;
          },
        }),
      ),

      this.selectedMode === ExplorePageModes.QUERY_BUILDER &&
        m(QueryBuilder, {
          trace: attrs.trace,
          sqlModules: attrs.sqlModulesPlugin.getSqlModules(),
          onRootNodeCreated(arg) {
            attrs.state.rootNode = arg;
            attrs.state.selectedNode = arg;
          },
          onNodeSelected(arg) {
            attrs.state.selectedNode = arg;
          },
          rootNode: attrs.state.rootNode,
          selectedNode: attrs.state.selectedNode,
        }),
      this.selectedMode === ExplorePageModes.DATA_VISUALISER &&
        attrs.state.rootNode &&
        m(DataVisualiser, {
          trace,
          state: {
            queryNode: attrs.state.selectedNode ?? attrs.state.rootNode,
          },
        }),
    );
  }
}
