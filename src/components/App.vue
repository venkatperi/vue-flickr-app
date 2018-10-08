<template>
  <div>
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <div class="input-group">
          <input
            type="search"
            class="form-control"
            v-model="input"
            placeholder="Search Flickr..." />
          <span class="input-group-btn">
        <button v-if="!loading" type="submit" class="btn btn-info">Search</button>
        <button v-else type="button" v-on:click="cancel()" class="btn btn-info">Cancel</button>
      </span>
        </div>
      </div>
    </form>
    <div class="gallery">
      <img v-for="item in items"
        class="item"
        :src="item.media.m"
      />
    </div>
  </div>
</template>

<script>
  import delay from 'gen-statem/dist/src/util/delay';
  import * as toastr from 'toastr'
  import TaskStateMachine from '../../dist/TaskStateMachine';
  import fetchJsonp from 'fetch-jsonp'

  // process.env.LOG_LEVEL = 'info'

  export default {
    name: 'app',

    components: {},

    data: function () {
      return {
        searchTask: new TaskStateMachine( 2000 ),
        message: '',
        state: '',
        input: '',
        items: [],
        iter: 0,
      }
    },

    created() {
      toastr.options.closeButton = true;
      toastr.options.closeDuration = 150;

      this.searchTask.on( 'run', async ( { request, sessionId } ) => {
        try {
          console.log( `search: ${sessionId}:${request}` )
          toastr.info( 'loading...' )
          let res = await this.search( request )
          await delay( 1000 )     // give user enough time to cancel
          if ( this.iter % 5 === 0 )
            throw new Error( 'Uh oh, an error, a big bad error.' )
          await delay( this.iter % 4 === 0 ? 1500 : 0 )
          this.searchTask.done( sessionId, res )
        }
        catch ( e ) {
          this.searchTask.error( sessionId, e )
        }
      } )
        .on( 'done', ( { response } ) => {
          toastr.remove()
          this.items = response
        } )
        .on( 'timeout', () => toastr.warning( 'Alas, that took too long...', 'Timeout' ) )
        .on( 'cancel', () => toastr.warning( 'Changed your mind?', 'Cancel' ) )
        .on( 'error', ( { errors } ) => toastr.error( errors[0], 'Error' ) )
        .on( 'state', ( s ) => this.state = Array.isArray( s ) ? s.join( '/' ) : s )

    },

    computed: {
      loading() {
        return this.state === 'running'
      },
    },

    methods: {
      async search( query ) {
        const encodedQuery = encodeURIComponent( query );

        let res = await fetchJsonp(
          `https://api.flickr.com/services/feeds/photos_public.gne?lang=en-us&format=json&tags=${encodedQuery}`,
          { jsonpCallback: 'jsoncallback' },
        )

        return (await res.json()).items
      },

      cancel() {
        this.searchTask.cancel()
      },

      handleSubmit() {
        this.items = []
        this.iter++
        console.log( this.iter )
        toastr.remove()
        this.searchTask
          .reset()
          .start( this.input )
      },
    },
  }
</script>

<style lang="scss">

  .gallery {
    min-height: 300px;
    .item {
      margin: 10px;
      filter: drop-shadow(0 0 30px #333);
    }
  }

</style>
