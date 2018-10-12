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

import {MasterDetail} from 'task-wrapper'

function upperFirst( s ) {
  return s[0].toUpperCase() + s.substr( 1 )
}

export default function ( name ) {
  let mixin = {
    props: {},

    computed: {},

    methods: {},

    created() {
      this[name].controller = new MasterDetail( {
        detailTimeout: this[`${name}DetailTimeout`],
        loadTimeout: this[`${name}LoadTimeout`],
        itemLoader: this[`${name}ItemLoader`].bind( this ),
      } )
        .on( 'master', () => this[name].selectedItem = undefined )
        .on( 'detail', ( opts ) => this[name].selectedItem = opts.selectedItem )
        .on( 'state', ( s ) => this[name].state = Array.isArray( s ) ? s.join( '/' ) : s )

    },
  }

  let status = {
    'master': `${name}Master`,
    'detail': `${name}Detail`,
    'loading': `${name}Loading`,
  }

  for ( let [state, prop] of Object.entries( status ) ) {
    mixin.computed[prop] = function () {
      return this.$data[name].state === state
    }
  }

  mixin.props[`${name}DetailTimeout`] = {
    type: Number,
    required: false,
  }

  mixin.props[`${name}LoadTimeout`] = {
    type: Number,
    required: false,
  }

  mixin.data = function () {
    let data = {}
    data[name] = {
      controller: {},
      state: '',
      selectedItem: undefined,
    }
    return data
  }

  mixin.methods[`${name}SetItems`] = function ( items ) {
    this[name].controller.setItems( items )
  }

  mixin.methods[`${name}Exit`] = function () {
    this[name].controller.exit()
  }

  mixin.methods[`${name}Select`] = function ( index ) {
    this[name].controller.select( index )
  }

  return mixin
}
