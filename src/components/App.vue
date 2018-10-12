<template>
  <div class="app">
    <div class="detail" v-if="showDetail"
      v-on:keydown.esc="controller.exit()"
      v-on:click="controller.exit()">
      <img :src="selectedItem" />
    </div>

    <object id="diagram"
      ref="diagram"
      data="task-detail.svg"
      class="diagram"></object>

    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <input type="checkbox" id="checkbox" v-model="showAnim">
        <label for="checkbox">Show all states (adds delays) </label>
        <div class="input-group">
          <input
            type="search"
            class="form-control"
            v-model="query"
            placeholder="Search Flickr..." />
          <span class="input-group-btn">
        <button v-if="!searchRunning"
          type="submit"
          class="btn btn-info">Search</button>
        <button v-else type="button"
          v-on:click="searchCancel()"
          class="btn btn-info">Cancel</button>
      </span>
        </div>
      </div>
    </form>

    <div class="bottom">

      <div class="message" v-if="searchRunning">
        You have 1 second to cancel.
        <div class="sub" v-if="doTimeout || doError">
          If you do nothing, this one's going to
          {{ doError ? 'fail' : doTimeout? 'timeout' : 'succeed' }}
        </div>
      </div>
      <div class="message" v-if="searchFailed" v-html="search.error">
        Error!
      </div>
      <div class="message" v-if="searchTimedOut">
        Yikes, that took too long. Timeout!
      </div>
      <div class="message" v-if="searchCancelled">
        Cancelled! Changed your mind?
      </div>
      <div class="gallery" v-if="searchSucceeded">
        <img v-for="(item, index) in search.result"
          class="item"
          v-on:click="showDetails(index)"
          :src="item.media.m" />
      </div>

    </div>
  </div>
</template>

<script>
  import axios from 'axios'
  import fetchJSONp from 'fetch-jsonp'
  import delay from 'gen-statem/dist/src/util/delay';
  import {MasterDetail} from '../../../task-wrapper/index';
  import VueTaskMixin from '../directives/VueTaskMixin'

  const SVG = require( 'svg.js' )

  export default {
    name: 'app',

    props: {
      searchTimeout: {
        default: 2000,
      },
      itemsTimeout: {
        default: 2000,
      },
    },

    components: {},

    mixins: [
      VueTaskMixin( 'search' ),
    ],

    data: function () {
      return {
        query: '',
        iter: 0,
        svgDoc: {},
        anim: 1000,
        showAnim: false,
        controller: {},
        controllerState: '',
        selectedItem: {},
      }
    },

    created: function () {
      let that = this
      this.controller = new MasterDetail( {
        loadTimeout: this.itemsTimeout,
        itemLoader: async function ( req ) {
          let url = req.media.m.replace( '_m.jpg', '_b.jpg' )
          // return await that.loadImage( url )
          return url
        },
      } )
        .on( 'master', ( ) => this.selectedItem = undefined)
        .on( 'detail', ( opts ) => this.selectedItem = opts.selectedItem )
        .on( 'state', ( s ) => this.controllerState = Array.isArray( s ) ? s.join( '/' ) : s )
    },

    mounted() {
      let that = this
      this.$nextTick( function () {
        document.getElementById( 'diagram' ).addEventListener( 'load', function () {
          that.svgDoc = this.contentDocument
        } );
      } )
    },

    watch: {
      'search.result'( items ) {
        this.controller.setItems( items )
      },

      'search.state'( s, o ) {
        let x = s.split( '/' )
        s = x[x.length - 1]
        x = o.split( '/' )
        o = x[x.length - 1]
        try {
          SVG.select( `#${o}`, this.svgDoc ).fill( '#ffffff' )
        } catch ( e ) {
        }
        try {
          SVG.select( `#${s}`, this.svgDoc ).fill( '#B8E986' )
        } catch ( e ) {
        }

      },
    },

    computed: {
      doTimeout() {
        return this.iter % 4 === 0
      },

      doError() {
        return this.iter % 5 === 0
      },

      showDetail() {
        return this.controllerState === 'detail'
      },
    },

    methods: {
      handleSubmit: async function () {
        this.iter++
        if ( this.showAnim )
          await delay( this.anim )
        this.searchRestart( this.query )
      },

      showDetails: function ( index ) {
        this.controller.select( index )
      },

      loadImage: async function ( url ) {
        console.log( url )
        let res = await axios.get( url )
        return res.data
      },

      doSearch: async function ( query ) {
        console.log( query )
        const encodedQuery = encodeURIComponent( query );

        let res = await fetchJSONp(
          `https://api.flickr.com/services/feeds/photos_public.gne?lang=en-us&format=json&tags=${encodedQuery}`,
          { jsonpCallback: 'jsoncallback' },
        )

        res = (await res.json()).items
        let wait = 0
        if ( this.showAnim )
          await delay( wait += 1000 )     // give user enough time to cancel
        if ( this.doError )
          throw new Error( 'Uh oh, an error, a big bad error.' )
        await delay( this.doTimeout ? 2500 - wait : 0 )
        return res
      },

    },
  }
</script>

<style lang="scss">
  .diagram {
    width: 100%;
  }

  .state {
    color: #bbb;
    margin-bottom: 10px;
  }

  .bottom {
    min-height: 300px;
    position: relative;
  }

  .detail img {
    position: fixed;
    max-width: 70%;
    max-height: 70%;
    margin: auto;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    object-fit: contain;
    border: solid 20px #000;
  }

  .detail {
    position: fixed;
    z-index: 10;
    width: 100%;
    height: 100%;
    margin: auto;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    background: rgba(0, 0, 0, 0.75);
  }

  .app {
    position: relative;
  }

  .gallery {
    .item {
      margin: 10px;
      filter: drop-shadow(0 0 30px #333);
    }
  }

  .message {
    color: #bbb;
    font-size: 30px;
    text-align: center;
    margin: 30px;
    .sub {
      font-size: 18px;
    }
  }

  .active-event {
    fill: #ff0000
  }

</style>
