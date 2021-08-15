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
    localConfigDb["LocalConfig"].put({
        KEY: key,
        value: value,
    });
}

export function getUserPreference(key) {
    return localConfigDb["LocalConfig"].get([key]);
}
