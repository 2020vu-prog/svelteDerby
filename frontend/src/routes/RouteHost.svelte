<script>
    /**
     * Central route renderer. It delays protected routes until roles load,
     * rejects unauthorized routes, and displays permitted route actions.
     */
    import Router, { location } from "svelte-spa-router";
    import MaterialAdd from "../MaterialAdd.svelte";
    import { raceConfig, roleMap, userEmail, userId } from "../stores.js";
    import PermissionDenied from "./PermissionDenied.svelte";
    import { routeRegistry, routerMap } from "./routeRuntime.js";

    const { canAccessRoute } = require("./routeAccess.js");
    const {
        getRequiredPermission,
        resolveRouteAction,
    } = require("./routeRegistry.js");
    const { RouteAction } = require("./routeDefinitions.js");
    const { RoutePermission } = require("./routePermission.js");

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
    {#if routeAction?.type === RouteAction.MATERIAL_ADD && actionAllowed}
        <MaterialAdd clickHandleRoute={routeAction.target} />
    {/if}
{:else}
    <PermissionDenied routePath={$location} />
{/if}
