<template>
  <div>
    <object id="diagram" ref="diagram" data="task-detail.svg" class="diagram"></object>
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <!--<div class="state">State: {{ task.state }}</div>-->
        <input type="checkbox" id="checkbox" v-model="showAnim">
        <label for="checkbox">Show all states (adds delays) </label>
        <div class="input-group">
          <input
            type="search"
            class="form-control"
            v-model="query"
            placeholder="Search Flickr..." />
          <span class="input-group-btn">
        <button v-if="!taskRunning" type="submit" class="btn btn-info">Search</button>
        <button v-else type="button" v-on:click="cancelTask()" class="btn btn-info">Cancel</button>
      </span>
        </div>
      </div>
    </form>
    <div class="bottom">
      <div class="message" v-if="taskRunning">
        You have 1 second to cancel.
        <div class="sub" v-if="doTimeout || doError">If you do nothing, this one's going to {{ doError ? 'fail' :
          doTimeout?
          'timeout' :
          'succeed' }}
        </div>
      </div>
      <div class="message" v-if="taskFailed" v-html="task.error">
        Error!
      </div>
      <div class="message" v-if="taskTimedOut">
        Yikes, that took too long. Timeout!
      </div>
      <div class="message" v-if="taskCancelled">
        Cancelled! Changed your mind?
      </div>
      <div class="gallery" v-if="taskSucceeded">
        <img v-for="item in task.result"
          class="item"
          :src="item.media.m"
        />
      </div>
    </div>
    <!--<img src="task-detail.png" class="diagram"/>-->
  </div>
</template>

<script>
  import fetchJsonp from 'fetch-jsonp'
  import delay from 'gen-statem/dist/src/util/delay';
  import VueTaskMixin from '../directives/VueTaskMixin'

  const SVG = require( 'svg.js' )
  const Filter = require( 'svg.filter.js' )


  const filter = new SVG.Filter();

  // create the filters effects here
  let blur = filter.offset( 0, 0 ).gaussianBlur( 5 );
  filter.blend( filter.source, blur );

  // process.env.LOG_LEVEL = 'info'

  export default {
    name: 'app',

    props: {
      taskTimeout: {
        default: 2000,
      },
    },

    components: {},

    mixins: [VueTaskMixin],

    data: function () {
      return {
        query: '',
        iter: 0,
        svgDoc: {},
        anim: 1000,
        event: {},
        showAnim: true,
      }
    },

    created() {
      this.task.sm.on( 'event', ( e ) => {
        this.event = `${e.route}#${this.task.state}`.replace( /#/g, '_' )
      } )
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
      'task.state'( s, o ) {
        let x = s.split( '/' )
        s = x[x.length - 1]
        x = o.split( '/' )
        o = x[x.length - 1]
        SVG.select( `#${o}`, this.svgDoc ).fill( '#ffffff' )
        SVG.select( `#${s}`, this.svgDoc ).fill( '#B8E986' )
      },
    },

    computed: {
      doTimeout() {
        return this.iter % 4 === 0
      },
      doError() {
        return this.iter % 5 === 0
      },
    },

    methods: {
      async handleSubmit() {
        this.iter++
        this.resetTask()
        if ( this.showAnim )
          await delay( this.anim )
        this.startTask( this.query )
      },

      runTask( ...args ) {
        return this.search( ...args )
      },

      async search( query ) {
        const encodedQuery = encodeURIComponent( query );

        let res = await fetchJsonp(
          `https://api.flickr.com/services/feeds/photos_public.gne?lang=en-us&format=json&tags=${encodedQuery}`,
          { jsonpCallback: 'jsoncallback' },
        )

        res = (await res.json()).items
        await delay( 1000 )     // give user enough time to cancel
        if ( this.doError )
          throw new Error( 'Uh oh, an error, a big bad error.' )
        await delay( this.doTimeout ? 1500 : 0 )
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
