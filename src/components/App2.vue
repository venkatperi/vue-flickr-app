<template>
  <div>
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <div class="input-group">
          <input
            type="search"
            class="form-control"
            v-model="query"
            placeholder="Search Flickr..." />
          <span class="input-group-btn">
        <button v-if="!isLoading" type="submit" class="btn btn-info">Search</button>
        <button v-else type="button" v-on:click="cancel()" class="btn btn-info">Cancel</button>
      </span>
        </div>
      </div>
    </form>
    <div class="bottom">
      <div class="message" v-if="isLoading">
        Loading. You have 1 second to cancel...
      </div>
      <div class="message" v-if="isError" v-html="error">
        Error!
      </div>
      <div class="message" v-if="isTimeout">
        Yikes, that took too long. Timeout!
      </div>
      <div class="message" v-if="isCancelled">
        Cancelled! Changed your mind?
      </div>
      <div class="gallery" v-if="isSuccess">
        <img v-for="item in items"
          class="item"
          :src="item.media.m"
        />
      </div>
    </div>
  </div>
</template>

<script>
  import fetchJsonp from 'fetch-jsonp'
  import delay from 'gen-statem/dist/src/util/delay';
  import TaskStateMachine from '../../dist/TaskStateMachine';

  // process.env.LOG_LEVEL = 'info'

  export default {
    name: 'app',

    components: {},

    data: function () {
      return {
        taskSM: new TaskStateMachine( 2000 ),
        state: '',
        query: '',
        items: [],
        iter: 0,
        error: '',
      }
    },

    created() {
      this.taskSM
        .exec( this.search.bind( this ) )
        .on( 'done', ( { response } ) => this.items = response )
        .on( 'error', ( { errors } ) => this.error = errors[0].message )
        .on( 'state', ( s ) => this.state = Array.isArray( s ) ? s.join( '/' ) : s )
    },

    computed: {
      isLoading() {
        return this.state === 'running'
      },
      isSuccess() {
        return this.state === 'done/done'
      },
      isError() {
        return this.state === 'done/error'
      },
      isCancelled() {
        return this.state === 'done/cancel'
      },
      isTimeout() {
        return this.state === 'done/timeout'
      },
    },


    methods: {
      async search( query ) {
        const encodedQuery = encodeURIComponent( query );

        let res = await fetchJsonp(
          `https://api.flickr.com/services/feeds/photos_public.gne?lang=en-us&format=json&tags=${encodedQuery}`,
          { jsonpCallback: 'jsoncallback' },
        )

        res = (await res.json()).items
        await delay( 1000 )     // give user enough time to cancel
        if ( this.iter % 5 === 0 )
          throw new Error( 'Uh oh, an error, a big bad error.' )
        await delay( this.iter % 4 === 0 ? 1500 : 0 )
        return res
      },

      cancel() {
        this.taskSM.cancel()
      },

      handleSubmit() {
        this.items = []
        this.iter++
        this.taskSM
          .reset()
          .start( this.query )
      },
    },
  }
</script>

<style lang="scss">

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
  }

</style>
