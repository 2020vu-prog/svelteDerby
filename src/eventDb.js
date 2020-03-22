import Dexie from 'dexie';

const db = new Dexie('eventDb');




//export dbTools ;
export async function dbReset() {

    await db.delete();
    await dbInit();
  }
  export async function dbInit() {

    console.log("dbInit")
    if(db.isOpen()){
         db.close();
    }
    console.log("dbInit isopen:",db.isOpen())

      db.version(4).stores({
        EventConfig: `SK`,
        RaceStanding: `SK`,
        RacePhase: `SK`,
        Participant: `SK`
    });
    console.log("dbInit opening:",db.isOpen())

    await db.open();
    console.log("dbInit opened:",db.isOpen())

  }
export { db}
dbInit();

