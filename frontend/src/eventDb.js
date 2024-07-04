import log from "loglevel";

import Dexie from "dexie";

const db = new Dexie("eventDb");

db.version(12).stores({
    EventConfig: `SK`,
    RaceStanding: `SK`,
    RacePhase: `SK`,
    Participant: `SK`,
    BracketMetaData: `SK`,
    BracketPos: `SK`,
    EventHistory: `[PK+SK+at]`,
    TimerConfig: "SK",
    Foo: `SK`,
});
db.version(13).stores({
    EventConfig: `SK`,
    RaceStanding: `SK`,
    RacePhase: `SK`,
    Participant: `SK`,
    BracketMetaData: `SK`,
    BracketPos: `SK`,
    EventHistory: `[PK+SK+at]`,
    TimerConfig: "SK",
    OrgRoles: "SK", //Not managed by HotLoad
    Foo: `SK`,
});
db.version(14).stores({
    TimerPbConfig: "SK",
});
db.version(15).stores({
    TmpTimerElapsed: "SK",
});
db.version(16).stores({
    BmdJson: "SK",
});

//export dbTools ;
export async function dbReset() {
    await db.delete();
    await db.open();
}

const localConfigDb = new Dexie("localConfigDb");

localConfigDb.version(6).stores({
    LocalConfig: `KEY`,
});
localConfigDb.version(7).stores({
    LocalConfig: `KEY`,
    OrgRoles: `OrgIz`,
});

export { db, localConfigDb };

export function putUserPreference(key, value) {
    return localStorage.setItem(key, JSON.stringify({ Value: value }));

    localConfigDb["LocalConfig"].put({
        KEY: key,
        value: value,
    });
}

export function getUserPreference(key) {
    const val = localStorage.getItem(key);
    //console.log(`type of ${key}:`, typeof val, " val: ", val);
    if (val) {
        const parsed = JSON.parse(val);
        return parsed.Value;
    }
    return val;
    //return localConfigDb["LocalConfig"].get([key]);
}
