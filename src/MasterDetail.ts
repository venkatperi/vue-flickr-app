//  Copyright 2018, Venkat Peri.
//
//  Permission is hereby granted, free of charge, to any person obtaining a
//  copy of this software and associated documentation files (the
//  "Software"), to deal in the Software without restriction, including
//  without limitation the rights to use, copy, modify, merge, publish,
//  distribute, sublicense, and/or sell copies of the Software, and to permit
//  persons to whom the Software is furnished to do so, subject to the
//  following conditions:
//
//  The above copyright notice and this permission notice shall be included
//  in all copies or substantial portions of the Software.
//
//  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
//  OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
//  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
//  NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
//  DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
//  OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
//  USE OR OTHER DEALINGS IN THE SOFTWARE.

import {
    Handlers, keepState, nextState, StateMachine, Timeout
} from 'gen-statem'
import { Task } from "task-wrapper"

type MasterDetailData<E, V> = {
    items?: Array<E>,
    selectedIndex?: number,
    selectedItem?: V,
    detailTimeout?: Timeout
}

type IndexedItem<V> = {
    index: number
    item?: V
}

export interface MasterDetailOpts<E, V> {
    detailTimeout?: number | string

    loadTimeout?: number | string

    items?: Array<E>

    detailLoader: (item: E) => Promise<V>
}

type LoadTask<E, V> = Task<MasterDetailData<E, V>, IndexedItem<V>>

export class MasterDetail<E, V> extends StateMachine<MasterDetailData<E, V>> {

    handlers: Handlers<MasterDetailData<E, V>> = [

        ['cast#items#*_', ({event}) =>
            nextState('master')
                .data({items: {$set: event.extra}})],

        ['enter#*_#master', () => keepState()
            .emit('master')
            .data({selection: {$set: null}})],

        ['cast#select#master', ({event}) =>
            nextState('loading')
                .emit('load')
                .data({selectedIndex: {$set: event.extra}})],

        ['cast#loaded/:itemId#loading', ({data, args, event}) =>
            data.selectedIndex === Number(args.itemId)
            ? nextState('detail').data({selectedItem: {$set: event.extra}})
            : keepState()],

        ['enter#*_#detail', ({data}) => {
            const res = keepState().emit('detail', data)
            return data.detailTimeout
                   ? res.stateTimeout(data.detailTimeout) : res
        }],

        [['stateTimeout#*_#detail',
            'cast#exit#detail'], 'master']
    ]

    initialData: MasterDetailData<E, V> = {}

    initialState = 'master'

    private loader?: LoadTask<E, V>

    constructor(opts: MasterDetailOpts<E, V>) {
        super()
        if (!opts.detailLoader) {
            throw new Error("Argument missing: detailLoader")
        }

        if (opts.detailTimeout) {
            this.initialData.detailTimeout = opts.detailTimeout
        }

        if (opts.items) {
            this.initialData.items = opts.items
        }

        setImmediate(() => {
            this.loader = new Task<MasterDetailData<E, V>, IndexedItem<V>>({
                timeout: opts.loadTimeout,
                job: async ({selectedIndex, items}) => {
                    let item = await opts.detailLoader(items[selectedIndex])
                    return {
                        index: selectedIndex,
                        item
                    }
                }
            }).on('done', ({result}) => {
                this.cast('loaded', result)
            })

            this.on('load', (req) => {
                this.loader.start(req)
            }).startSM()
        })
    }


    items(items: Array<E>) {
        this.cast('items', items)
    }

    enter(item: E) {
        this.cast('enter', item)
    }

    exit() {
        this.cast('exit')
    }
}

