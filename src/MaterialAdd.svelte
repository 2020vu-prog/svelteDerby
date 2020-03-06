<script>
import {push, pop, replace} from 'svelte-spa-router'
//export let permission;
export let clickHandleRoute;

const chFunction=()=>{push(clickHandleRoute)};
</script>
<style>
.app-fab--absolute {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  z-index: 99;

}

@media(min-width: 1024px) {
   .app-fab--absolute {
    bottom: 1.5rem;
    right: 1.5rem;
    z-index: 99;

  }
}
</style>

<button class="mdc-fab app-fab--absolute" aria-label="Add" on:click={chFunction}>
  <div class="mdc-fab__ripple"></div>
  <span class="mdc-fab__icon material-icons">add_circle</span>
</button>