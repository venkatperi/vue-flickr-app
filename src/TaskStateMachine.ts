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
import uniqid = require('uniqid')

type TaskSMData<R> = {
    errors?: [],
    timeout?: Timeout
    response?: R
    request?: any
    sessionId?: string
}

export default class TaskStateMachine<R> extends StateMachine<TaskSMData<R>> {

    handlers: Handlers<TaskSMData<R>> = [
        ['enter#*_#idle', () =>
            keepState()
                .emit('init')
                .data({
                    errors: {$set: []},
                    response: {$set: null},
                    sessionId: {$set: uniqid()}
                })],

        ['cast#start#idle', ({event}) =>
            nextState('running')
                .data({request: {$set: event.extra}})],

        ['enter#*_#running', ({data}) => {
            const res = keepState().emit('run', data)
            return data.timeout ? res.stateTimeout(data.timeout) : res
        }],

        ['cast#done/:sessionId#running', ({data, args, event}) =>
            args.sessionId === data.sessionId ?
            nextState('done/done').data({response: {$set: event.extra}}) :
            keepState()],

        ['cast#reset#running', () =>
            nextState('done/cancel').postpone()],

        ['cast#cancel#*_', ({event}) =>
            nextState('done/cancel')
                .data({errors: {$push: [event.extra]}})],

        ['cast#error/:sessionId#*_', ({args, data, event}) =>
            args.sessionId === data.sessionId ?
            nextState('done/error').data({errors: {$push: [event.extra]}}) :
            keepState()],

        ['enter#*_#done/:status', ({args, data}) =>
            keepState().emit(args.status, data)],

        ['cast#reset#done/*_', 'idle'],

        ['stateTimeout#*_#*_', 'done/timeout']
    ]

    initialData: TaskSMData<R> = {}

    initialState = 'idle'

    constructor(timeout?: Timeout) {
        super()
        this.initialData.timeout = timeout
        this.startSM()
    }

    cancel(reason?: any) {
        this.cast('cancel', reason)
        return this
    }

    error(sessionId: string, reason?: any) {
        this.cast({error: sessionId}, reason)
        return this
    }

    done(sessionId: string, response?: R) {
        this.cast({done: sessionId}, response)
        return this
    }

    reset() {
        this.cast('reset')
        return this
    }

    /**
     * Starts the task.
     * @param request
     * @return {Promise<any>}
     */
    start(request) {
        this.cast('start', request)
        return this
    }

    /**
     *
     * @param fn
     * @return {this<R>}
     */
    exec(fn: (any) => Promise<R>) {
        this.on('run', async ({sessionId, request}) => {
            try {
                let res = await fn(request)
                this.done(sessionId, res)
            }
            catch (e) {
                this.error(sessionId, e)
            }
        })
        return this
    }
}

