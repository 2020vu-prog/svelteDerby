import Dexie from 'dexie';

const db = new Dexie('eventDb');


db.version(5).stores({
  EventConfig: `SK`,
  RaceStanding: `SK`,
  RacePhase: `SK`,
  Participant: `SK`,
  Foo: `SK`
});

//export dbTools ;
export async function dbReset() {

  
    await db.delete();
    await db.open();
  }

export { db}


