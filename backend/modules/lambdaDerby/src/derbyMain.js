'use strict'
const {DynamoDB} = require('@aws-sdk/client-dynamodb-v2-node');
const ddbClient = new DynamoDB({region: process.env.AwsRegion});

const insert=()=>{
	var params = {
	  RequestItems: {
	    [process.env.DynamoDbTable]: [
	       {
		 PutRequest: {
		   Item: {
		       "PK": { "S": "PK1" },
		       "SK": { "S": "SK1" },
		       "ATTRIBUTE_1": { "S": "ATTRIBUTE_1_VALUE" },
		       "ATTRIBUTE_2": { "N": "123" }
		   }
		 }
	       },
	       {
		 PutRequest: {
		   Item: {
		       "PK": { "S": "PK1" },
		       "SK": { "S": "SK2" },
		       "ATTRIBUTE_1": { "S": "ATTRIBUTE_2_VALUE" },
		       "ATTRIBUTE_2": { "N": "456" }
		   }
		 }
	       }
	    ]
	  }
	};
	ddbClient.batchWriteItem(params, function(err, data) {
	  if (err) {
	    console.log("ddbClient Error", err);
	  } else {
	    console.log("ddbClient Success", data);
	  }
	});
}

const addParticipant=(json)=>{
   console.log("addParticipant: "+ JSON.stringify(json));
 var params = {
  Item: {
   "PK": {
     S: json.orgId+":PTCP"
    }, 
   "SK": {
     S: json.carNumber +""
    }, 
   "number": {
     S: json.carNumber +""
    }, 
   "name": {
     S: json.name
    },
   "by": {
     S: json.by
    },
   "orgId": {
     S: json.orgId
    }
  }, 
  ReturnConsumedCapacity: "TOTAL", 
  TableName: process.env.DynamoDbTable
 };

	ddbClient.putItem(params, function(err, data) {
   if (err) console.log(err, err.stack); // an error occurred
   else     console.log(data);           // successful response
 });
};


exports.handler = function(event, context, callback) {
  const dbArn=process.env.DynamoDbArn
  //insert();

  // Allow Cors
  if(event.httpMethod==="OPTIONS"){
	  var response = {
	    statusCode: 200,
	    headers: {
	      'Content-Type': 'text/html; charset=utf-8',
	      "Access-Control-Allow-Origin": "*",
	      "Access-Control-Allow-Headers": "*",
	      "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
	    }
	  }
	  callback(null, response)
	  return;
  }

  if(event.path==="/addParticipant"){
	addParticipant(JSON.parse(event.body));
  }
  else{
       console.log("Unhandled Path: "+event.path);
  }

  console.log(JSON.stringify(event));
  var response = {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8'
    },
    body: '<p>Bonjour derby! ' +dbArn +'</p>'
  }
  callback(null, response)
}
