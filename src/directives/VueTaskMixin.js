// Copyright 2017, Venkat Peri.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

import TaskStateMachine from '../../dist/TaskStateMachine';

export default {

  props: {
    taskTimeout: {
      type: Number,
      required: false,
    },
  },

  data: function () {
    return {
      task: {
        sm: {},
        state: '',
        error: {},
        response: undefined,
      },
    }
  },

  created() {
    this.task.sm = new TaskStateMachine( this.taskTimeout )
      .on( 'state', ( s ) => this.task.state = Array.isArray( s ) ? s.join( '/' ) : s )
      .exec( this.runTask.bind( this ) )
      .on( 'done', ( { response } ) => this.task.response = response )
      .on( 'cancel', () => this.onTaskCancel() )
      .on( 'timeout', () => this.onTaskTimeout() )
      .on( 'error', ( { errors } ) => {
        this.task.error = errors[0].message
        this.onTaskError( this.task.error )
      } )
  },

  computed: {
    taskRunning() {
      return this.task.state === 'running'
    },

    taskSucceeded() {
      return this.task.state === 'done/done'
    },

    taskFailed() {
      return this.task.state === 'done/error'
    },

    taskCancelled() {
      return this.task.state === 'done/cancel'
    },

    taskTimedOut() {
      return this.task.state === 'done/timeout'
    },
  },


  methods: {
    cancelTask( reason ) {
      this.task.sm.cancel( reason )
    },

    resetTask() {
      this.task.sm.reset()
      return this
    },

    startTask( ...args ) {
      this.resetTask()
      this.task.response = undefined
      this.task.error = undefined
      this.task.sm.start( args )
      return this
    },

    async runTask( ...args ) {
    },

    onTaskError( error ) {
    },

    onTaskTimeout() {
    },

    onTaskCancel() {
    },
  },
}
