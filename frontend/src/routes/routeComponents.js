import AboutPage from "#src/AboutPage.svelte";
import CaptureVideo from "#src/CaptureVideo.svelte";
import ChartAdd from "#src/ChartAdd.svelte";
import ChartDetail from "#src/ChartDetail.svelte";
import ChartDetailCardList from "#src/ChartDetailCardList.svelte";
import ChartSvgPrototype from "#src/chart/svg/ChartSvgPrototype.svelte";
import ChartEdit from "#src/ChartEdit.svelte";
import ChartFill from "#src/ChartFill.svelte";
import ChartList from "#src/ChartList2.svelte";
import ChartPosition from "#src/ChartPosition.svelte";
import DownloadCsv from "#src/DownloadCsv.svelte";
import DriverAdd from "#src/DriverAdd.svelte";
import DriverDelegate from "#src/DriverDelegate.svelte";
import DriverInfo from "#src/DriverInfo.svelte";
import DriverList from "#src/DriverList.svelte";
import DriverProfile from "#src/DriverProfile.svelte";
import DriverProfileList from "#src/DriverProfileList.svelte";
import EventAdd from "#src/EventAdd.svelte";
import EventSelection from "#src/EventSelection.svelte";
import ForceLoad from "#src/ForceLoad.svelte";
import ForceReloadPage from "#src/ForceReloadPage.svelte";
import HistoryList from "#src/HistoryList.svelte";
import LogMessageViewer from "#src/LogMessageViewer.svelte";
import LoginH from "#src/LoginH.svelte";
import ManualAnnouncement from "#src/ManualAnnouncement.svelte";
import ManualTimerAdd from "#src/ManualTimerAdd.svelte";
import MediaList from "#src/MediaList.svelte";
import MediaViewer from "#src/MediaViewer.svelte";
import OrgAdd from "#src/OrgAdd.svelte";
import OrgSelection from "#src/OrgSelection.svelte";
import OrgUserAdd from "#src/OrgUserAdd.svelte";
import OrgUserList from "#src/OrgUserList.svelte";
import PaInfo from "#src/PaInfo.svelte";
import PreferencesPage from "#src/PreferencesPage.svelte";
import ProvisionWifi from "#src/ProvisionWifi.svelte";
import RacePhaseElapsed from "#src/RacePhaseElapsed.svelte";
import RacePhaseList from "#src/RacePhaseList.svelte";
import RaceStandingAdd from "#src/RaceStandingAdd.svelte";
import RaceStandingList from "#src/RaceStandingList.svelte";
import RawTimerList from "#src/RawTimerList.svelte";
import RouteSelection from "#src/RouteSelection.svelte";
import Spotify from "#src/Spotify.svelte";
import TimerAlignment from "#src/TimerAlignment.svelte";
import TimerColumns from "#src/TimerColumns.svelte";
import TimerConfig from "#src/TimerConfig.svelte";
import TimerConfigElapsed from "#src/TimerConfigElapsed.svelte";
import TimerConfigList from "#src/TimerConfigList.svelte";
import TimerPbAlignment from "#src/TimerPbAlignment.svelte";
import TimerPlot from "#src/TimerPlot.svelte";

/**
 * Svelte components keyed by the component names used in route definitions.
 * Keeping imports separate lets the route catalog be tested in Node without
 * loading or compiling Svelte components.
 */
export const routeComponents = {
    AboutPage,
    CaptureVideo,
    ChartAdd,
    ChartDetail,
    ChartDetailCardList,
    ChartSvgPrototype,
    ChartEdit,
    ChartFill,
    ChartList,
    ChartPosition,
    DownloadCsv,
    DriverAdd,
    DriverDelegate,
    DriverInfo,
    DriverList,
    DriverProfile,
    DriverProfileList,
    EventAdd,
    EventSelection,
    ForceLoad,
    ForceReloadPage,
    HistoryList,
    LogMessageViewer,
    LoginH,
    ManualAnnouncement,
    ManualTimerAdd,
    MediaList,
    MediaViewer,
    OrgAdd,
    OrgSelection,
    OrgUserAdd,
    OrgUserList,
    PaInfo,
    PreferencesPage,
    ProvisionWifi,
    RacePhaseElapsed,
    RacePhaseList,
    RaceStandingAdd,
    RaceStandingList,
    RawTimerList,
    RouteSelection,
    Spotify,
    TimerAlignment,
    TimerColumns,
    TimerConfig,
    TimerConfigElapsed,
    TimerConfigList,
    TimerPbAlignment,
    TimerPlot,
};
