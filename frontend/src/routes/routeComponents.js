import AboutPage from "../AboutPage.svelte";
import CaptureVideo from "../CaptureVideo.svelte";
import ChartAdd from "../ChartAdd.svelte";
import ChartDetail from "../ChartDetail.svelte";
import ChartDetailCardList from "../ChartDetailCardList.svelte";
import ChartEdit from "../ChartEdit.svelte";
import ChartFill from "../ChartFill.svelte";
import ChartList from "../ChartList2.svelte";
import ChartPosition from "../ChartPosition.svelte";
import DownloadCsv from "../DownloadCsv.svelte";
import DriverAdd from "../DriverAdd.svelte";
import DriverDelegate from "../DriverDelegate.svelte";
import DriverInfo from "../DriverInfo.svelte";
import DriverList from "../DriverList.svelte";
import DriverProfile from "../DriverProfile.svelte";
import DriverProfileList from "../DriverProfileList.svelte";
import EventAdd from "../EventAdd.svelte";
import EventSelection from "../EventSelection.svelte";
import ForceLoad from "../ForceLoad.svelte";
import ForceReloadPage from "../ForceReloadPage.svelte";
import HistoryList from "../HistoryList.svelte";
import LogMessageViewer from "../LogMessageViewer.svelte";
import LoginH from "../LoginH.svelte";
import ManualAnnouncement from "../ManualAnnouncement.svelte";
import ManualTimerAdd from "../ManualTimerAdd.svelte";
import MediaList from "../MediaList.svelte";
import MediaViewer from "../MediaViewer.svelte";
import OrgAdd from "../OrgAdd.svelte";
import OrgSelection from "../OrgSelection.svelte";
import OrgUserAdd from "../OrgUserAdd.svelte";
import OrgUserList from "../OrgUserList.svelte";
import PaInfo from "../PaInfo.svelte";
import PreferencesPage from "../PreferencesPage.svelte";
import ProvisionWifi from "../ProvisionWifi.svelte";
import RacePhaseElapsed from "../RacePhaseElapsed.svelte";
import RacePhaseList from "../RacePhaseList.svelte";
import RaceStandingAdd from "../RaceStandingAdd.svelte";
import RaceStandingList from "../RaceStandingList.svelte";
import RawTimerList from "../RawTimerList.svelte";
import RouteSelection from "../RouteSelection.svelte";
import Spotify from "../Spotify.svelte";
import TimerAlignment from "../TimerAlignment.svelte";
import TimerColumns from "../TimerColumns.svelte";
import TimerConfig from "../TimerConfig.svelte";
import TimerConfigElapsed from "../TimerConfigElapsed.svelte";
import TimerConfigList from "../TimerConfigList.svelte";
import TimerPbAlignment from "../TimerPbAlignment.svelte";
import TimerPlot from "../TimerPlot.svelte";

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
