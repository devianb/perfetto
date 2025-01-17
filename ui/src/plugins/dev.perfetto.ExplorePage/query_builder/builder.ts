// Copyright (C) 2025 The Android Open Source Project
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

import {PageWithTraceAttrs} from '../../../public/page';
import {Button} from '../../../widgets/button';
import {SqlModules, SqlTable} from '../../dev.perfetto.SqlModules/sql_modules';
import {ColumnControllerRows} from './column_controller';
import {QueryNode, StdlibTableState} from '../query_state';
import {JoinState, QueryBuilderJoin} from './operations/join';
import {Intent} from '../../../widgets/common';
import {showModal} from '../../../widgets/modal';
import {DataSourceViewer} from './data_source_viewer';
import {MenuItem, PopupMenu} from '../../../widgets/menu';

export interface QueryBuilderTable {
  name: string;
  asSqlTable: SqlTable;
  columnOptions: ColumnControllerRows[];
  sql: string;
}

export interface QueryBuilderAttrs extends PageWithTraceAttrs {
  readonly sqlModules: SqlModules;
  readonly rootNode?: QueryNode;
  readonly onQueryNodeCreated: (node: QueryNode) => void;
}

export class QueryBuilder implements m.ClassComponent<QueryBuilderAttrs> {
  view({attrs}: m.CVnode<QueryBuilderAttrs>) {
    const trace = attrs.trace;

    // Create starting node.
    function chooseTableButton(): m.Child {
      return m(Button, {
        label: 'Choose a table',
        intent: Intent.Primary,
        onclick: async () => {
          const tableName = await trace.omnibox.prompt(
            'Choose a table...',
            attrs.sqlModules.listTablesNames(),
          );
          if (tableName === undefined) {
            return;
          }
          const sqlTable = attrs.sqlModules.getTable(tableName);
          if (sqlTable === undefined) {
            return;
          }
          attrs.onQueryNodeCreated(new StdlibTableState(sqlTable));
        },
      });
    }

    // Followup node
    function chooseOperationButton() {
      return m(
        PopupMenu,
        {
          trigger: m(Button, {
            label: '+',
            intent: Intent.Primary,
          }),
        },
        m(MenuItem, {
          label: 'JOIN',
          onclick: () => {
            if (attrs.rootNode === undefined) {
              return;
            }
            attrs.rootNode.nextNode = new JoinState(attrs.rootNode);
            operationsModal();
          },
        }),
        m(MenuItem, {label: 'INTERSECT'}),
      );
    }

    function operationsModal() {
      function Operations() {
        return {
          view: () => {
            if (attrs.rootNode === undefined) {
              return;
            }
            return (
              attrs.rootNode?.nextNode instanceof JoinState &&
              m(QueryBuilderJoin, {
                sqlModules: attrs.sqlModules,
                joinState: attrs.rootNode.nextNode,
              })
            );
          },
        };
      }

      const content = () => m(Operations);

      showModal({
        title: `Modal dialog`,
        buttons: [
          {
            text: 'Show another now',
            action: () => m('CHEESE'),
          },
        ],
        content,
      });
    }

    function renderNodesPanel(): m.Children {
      function renderNodes() {
        let row = 1;
        if (attrs.rootNode === undefined) {
          return m(
            '',
            {
              style: {
                gridColumn: 3,
                gridRow: row,
              },
            },
            chooseTableButton(),
          );
        }

        let curNode: QueryNode | undefined = attrs.rootNode;
        const nodes: m.Child[] = [];
        while (curNode && curNode.finished) {
          nodes.push(
            m(
              '',
              {
                style: {
                  gridColumn: 3,
                  gridRow: row,
                },
              },
              m(Button, {
                label: curNode.getTitle(),
                intent: Intent.Primary,
                onclick: async () => {},
              }),
            ),
          );
          row++;
          curNode = curNode.nextNode;
        }

        nodes.push(
          m(
            '',
            {
              style: {
                gridColumn: 3,
                gridRow: row,
              },
            },
            chooseOperationButton(),
          ),
        );
        return nodes;
      }
      return m(
        '',
        {
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gridTemplateRows: 'repeat(3, 1fr)',
            gap: '10px',
          },
        },
        renderNodes(),
      );
    }

    return m(
      '',
      {
        style: {
          display: 'grid',
          gridTemplateColumns: '50% 50%',
          gridTemplateRows: '50% 50%',
          gap: '10px',
        },
      },
      m(
        '',
        {
          style: {
            gridColumn: 1,
          },
        },
        renderNodesPanel(),
      ),
      m(
        '',
        {
          style: {
            gridColumn: 2,
          },
        },
        attrs.rootNode?.finished && [
          m(DataSourceViewer, {
            trace: attrs.trace,
            queryNode: attrs.rootNode,
          }),
        ],
      ),
    );
  }
}
