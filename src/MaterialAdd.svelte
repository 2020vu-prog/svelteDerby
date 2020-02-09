<script>
import {push, pop, replace} from 'svelte-spa-router'
//export let permission;
</script>
<style>
.app-fab--absolute {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
}

@media(min-width: 1024px) {
   .app-fab--absolute {
    bottom: 1.5rem;
    right: 1.5rem;
  }
}
</style>

<button class="mdc-fab app-fab--absolute" aria-label="Add" on:click={() => push('/driverAdd')}>
  <div class="mdc-fab__ripple"></div>
  <span class="mdc-fab__icon material-icons">add_circle</span>
</button>