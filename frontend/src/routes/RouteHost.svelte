<script>
    /**
     * Central route renderer. It delays protected routes until roles load,
     * rejects unauthorized routes, and displays permitted route actions.
     */
    import Router from "svelte-spa-router";
    import { location } from "#src/routes/routerStores.js";
    import MaterialAdd from "#src/MaterialAdd.svelte";
    import RouteHelp from "#src/routes/RouteHelp.svelte";
    import { raceConfig, roleMap, userEmail, userId } from "#src/stores.js";
    import PermissionDenied from "#src/routes/PermissionDenied.svelte";
    import { routeRegistry, routerMap } from "#src/routes/routeRuntime.js";

    const { canAccessRoute } = require("#src/routes/routeAccess.js");
    const {
        getRequiredPermission,
        resolveRouteAction,
    } = require("#src/routes/routeRegistry.js");
    const { RouteAction } = require("#src/routes/routeDefinitions.js");
    const { RoutePermission } = require("#src/routes/routePermission.js");

    /** Whether App has finished loading the current user's role assignments. */
    export let authorizationReady = false;

    $: context = {
        raceConfig: $raceConfig,
        roleMap: $roleMap,
        userEmail: $userEmail,
        userId: $userId,
    };
    $: currentMatch = routeRegistry.match($location);
    $: requiredPermission = getRequiredPermission(currentMatch, context);
    $: waitingForAuthorization =
        Boolean(currentMatch) &&
        requiredPermission !== RoutePermission.PUBLIC &&
        !authorizationReady;
    $: routeAllowed = canAccessRoute(currentMatch, context);
    $: routeAction = resolveRouteAction(currentMatch, context);
    $: actionMatch = routeAction
        ? routeRegistry.match(routeAction.target)
        : null;
    $: actionAllowed =
        routeAction &&
        canAccessRoute(actionMatch, {
            ...context,
            orgIz: routeAction.orgIz,
        });
</script>

{#if waitingForAuthorization}
    <!-- SpinnerPanel in App remains visible while role loading completes. -->
{:else if !currentMatch}
    <Router routes={routerMap} />
{:else if routeAllowed}
    <Router routes={routerMap} />
    <RouteHelp currentMatch={currentMatch} context={context} />
    {#if routeAction?.type === RouteAction.MATERIAL_ADD && actionAllowed}
        <MaterialAdd clickHandleRoute={routeAction.target} />
    {/if}
{:else}
    <PermissionDenied routePath={$location} />
{/if}
