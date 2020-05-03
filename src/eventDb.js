import Dexie from 'dexie';

const db = new Dexie('eventDb');

db.version(6).stores({
  EventConfig: `SK`,
  RaceStanding: `SK`,
  RacePhase: `SK`,
  Participant: `SK`,
  BracketMetaData: `SK`,
  Foo: `SK`
});

//export dbTools ;
export async function dbReset() {

  
    await db.delete();
    await db.open();
  }


const localConfigDb = new Dexie('localConfigDb');


localConfigDb.version(6).stores({
  LocalConfig: `KEY`
});

export {db, localConfigDb}