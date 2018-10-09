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
    result?: R
    request?: any
    sessionId?: string
}

export default class Task<R> extends StateMachine<TaskSMData<R>> {

    handlers: Handlers<TaskSMData<R>> = [

        // clear all data when we enter 'idle'
        // set the session id so that we know if any
        // results or errors belong to this session and
        // are not from earlier invocations
        ['enter#*_#idle', () => keepState()
            .emit('init')
            .data({
                errors: {$set: []},
                result: {$set: null},
                sessionId: {$set: uniqid()}
            })],

        // start kicks off the task. Record the request.
        ['cast#start#idle', ({event}) =>
            nextState('running')
                .data({request: {$set: event.extra}})],

        // emit 'run' to tell the user to start the job
        // also start the stateTimeout if a timeout is set
        ['enter#*_#running', ({data}) => {
            const res = keepState().emit('run', data)
            return data.timeout ? res.stateTimeout(data.timeout) : res
        }],

        // make sure the result is for this session,
        // record the result and go to 'done/done'
        ['cast#done/:sessionId#running', ({data, args, event}) =>
            args.sessionId === data.sessionId
            ? nextState('done/done').data({result: {$set: event.extra}})
            : keepState()],

        // if we get a reset during running, postpone the event
        // and go to cancel. Cancel will handle the reset
        ['cast#reset#running', () =>
            nextState('done/cancel')
                .postpone()],

        // handle cancel
        ['cast#cancel#running', ({event}) =>
            nextState('done/cancel')
                .data({errors: {$push: [event.extra]}})],

        // handle errors, but make sure its for this session
        ['cast#error/:sessionId#running', ({args, data, event}) =>
            args.sessionId === data.sessionId
            ? nextState('done/error').data({errors: {$push: [event.extra]}})
            : keepState()],

        // when we enter any 'done/*' state, notify the user
        ['enter#*_#done/:status', ({args, data}) =>
            keepState()
                .emit(args.status, data)],

        // to reset, from any 'done/*' state, go back to idle
        ['cast#reset#done/*_', 'idle'],

        // timeout in running if neither done(), error() or cancel()
        // are called
        ['stateTimeout#*_#running', 'done/timeout']
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

    done(sessionId: string, result?: R) {
        this.cast({done: sessionId}, result)
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

