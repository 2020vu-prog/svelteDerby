<script>
    import { carFilter } from './stores.js';
</script>

Filter: <input type="number" maxLength="3" size="3" bind:value={$carFilter}>