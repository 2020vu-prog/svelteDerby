'use strict'
const {DynamoDB} = require('@aws-sdk/client-dynamodb-v2-node');
const ddbClient = new DynamoDB({region: process.env.AwsRegion});

/*
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
*/

const create_UUID=()=>{
    var dt = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (dt + Math.random()*16)%16 | 0;
        dt = Math.floor(dt/16);
        return (c=='x' ? r :(r&0x3|0x8)).toString(16);
    });
    return uuid;
}
const ddbQueryRsContains=(json)=>{
	var containsFilters=[];
	var containsValues={};
	var i;
	for (i = 0; i < json.carNumbers.length; i++) {
		containsFilters[i]="contains (carNumbers, :c"+i+")";
		containsValues[":c"+i ]= {S:json.carNumbers[i]} ;
	}
        containsValues[":pk"]={S: json.orgId+":RS"};

	var params = {
	    TableName: process.env.DynamoDbTable,
	    //FilterExpression: "contains (category, :category1) OR contains (category, :category2)",
	    //ExpressionAttributeValues : {   
	//	':category1' : "apple",
	//	':category2' : "orange"
	 //   }
	    KeyConditionExpression: "PK = :pk",
	    FilterExpression: containsFilters.join(" OR "),
	    ExpressionAttributeValues :  containsValues
	};
	console.log("ddb query: "+ JSON.stringify(params));

	   ddbClient.query(params, function(err, data) {
	   if (err) console.log("queryRsContains failed: ",err, err.stack); // an error occurred
	   else {
		 console.log("queryRsContains: "+ data);           // successful response
		 console.log("queryRsContains: "+ JSON.stringify(data));           // successful response
		}
	 });
}
const ddbListOfStrings=(slist)=>{
	var rc={"L":[]}
	var i;
	for (i = 0; i < slist.length; i++) {
	  rc["L"][i] = {"S":slist[i]};
	}
	return rc;
}
const addPending=(json)=>{
	console.log("addPending: "+ JSON.stringify(json));
	json.rsPrefix=json.rsPrefix?json.rsPrefix:"";
	 var params = {
	  Item: {
	   "PK": {
	     S: json.orgId+":RS"
	    }, 
	   "SK": {
	     S: json.rsPrefix + create_UUID()
	    }, 
	   "carNumbers": ddbListOfStrings(json.carNumbers),
	   "by": {
	     S: json.by
	    },
	   "at": {
	     S: new Date().toISOString()
	    },
	   "orgId": {
	     S: json.orgId
	    }
	  }, 
	  ReturnConsumedCapacity: "TOTAL", 
	  TableName: process.env.DynamoDbTable
	 };

	console.log("addPending skel: "+ JSON.stringify(params));
	   ddbClient.putItem(params, function(err, data) {
	   if (err) console.log(err, err.stack); // an error occurred
	   else     console.log("Added RS: "+ JSON.stringify(data));           // successful response
	 });
};

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
	   "at": {
	     S: new Date().toISOString()
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
	   else     console.log("Added PTCP: "+ JSON.stringify(data));           // successful response
	 });
};

exports.handler = function(event, context, callback) {
  const dbArn=process.env.DynamoDbArn

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
  else if(event.path==="/addPending"){
	addPending(JSON.parse(event.body));
  }
  else if(event.path==="/ddbQuery"){
	ddbQueryRsContains(JSON.parse(event.body));
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
