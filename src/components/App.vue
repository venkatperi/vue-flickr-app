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
        <button v-if="!taskRunning" type="submit" class="btn btn-info">Search</button>
        <button v-else type="button" v-on:click="cancelTask()" class="btn btn-info">Cancel</button>
      </span>
        </div>
      </div>
    </form>
    <div class="bottom">
      <div class="message" v-if="taskRunning">
        You have 1 second to cancel.
        <span class="sub" v-if="doTimeout || doError">If you do nothing, this one's going to {{ doError ? 'fail' :
          doTimeout?
          'timeout' :
          'succeed' }}
        </span>
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
        <img v-for="item in task.response"
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
  import VueTaskMixin from '../directives/VueTaskMixin'

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
      }
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
      handleSubmit() {
        this.iter++
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

</style>
