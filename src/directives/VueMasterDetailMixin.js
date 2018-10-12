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

import {Task} from 'task-wrapper'

function upperFirst( s ) {
  return s[0].toUpperCase() + s.substr( 1 )
}

export default function ( name ) {
  let upperName = upperFirst( name )

  let mixin = {
    props: {},

    computed: {},

    methods: {},

    created() {
      this.$data[name].sm = new MasterDetail( {
        timeout: this[`${name}Timeout`],
        job: this[`do${upperName}`].bind( this ),
      } )
        .on( 'state', ( s ) => this[name].state = Array.isArray( s ) ? s.join( '/' ) : s )
        .on( 'done', ( { result } ) => {
          this[name].result = result
          this.$emit( `${name}Done` )
        } )
        .on( 'cancel', () => this.$emit( `${name}Cancel` ) )
        .on( 'timeout', () => this.$emit( `${name}Timeout` ) )
        .on( 'error', ( { errors } ) => {
          if ( errors ) {
            this.$data[name].error = errors[0].message
            this.$emit( `${name}Error` )
          }
        } )
    },
  }

  let status = {
    'running': `${name}Running`,
    'done/done': `${name}Succeeded`,
    'done/error': `${name}Failed`,
    'done/cancel': `${name}Cancelled`,
    'done/timeout': `${name}TimedOut`,
  }

  for ( let [state, prop] of Object.entries( status ) ) {
    mixin.computed[prop] = function () {
      return this.$data[name].state === state
    }
  }

  mixin.props[`${name}Timeout`] = {
    type: Number,
    required: false,
  }

  mixin.data = function () {
    let data = {}
    data[name] = {
      sm: {},
      state: '',
      error: {},
      result: undefined,
    }
    return data
  }

  mixin.methods[`${name}Cancel`] = function ( reason ) {
    this[name].sm.cancel( reason )
  }

  mixin.methods[`${name}Reset`] = function () {
    this[name].sm.reset()
  }

  mixin.methods[`${name}Start`] = function ( req ) {
    this[name].sm.start( req )
  }

  mixin.methods[`${name}StartWithReset`] = function ( req ) {
    this[name].sm.startWithReset( req )
  }

  mixin.methods[`do${upperName}`] = async function ( req ) {
    throw new Error( `Must override do${upperName}` )
  }

  return mixin
}
