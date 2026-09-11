* goal:  allow drivers to maintain their own Spotify walk up tracks
* requirements:
- maintainer must have authenticated email
- maintainer must be delegated permission to maintain a driver number
- a single maintainer email can manage multiple drivers
- delegator must have permission for CAN_ADD_PARTICIPANT
- do not save email on the database. email hash is ok
- ideally, delegation will be handled with a QR code that is shown to the maintainer

* notes
- derbymain dynamodb Is logged and propagated.  Do not use it for token storage
- Car numbers may not have the same driver in different events within an org
- The email hash that authorizes driver profile maintenance should be saved on the  participant record in a list.  That will preserve the Maintainer information if the drivers are Re-imported in a new event
- delegation should be scooped to an event
