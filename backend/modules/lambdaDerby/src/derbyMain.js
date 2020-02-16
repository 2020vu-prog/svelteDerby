'use strict'
const  AWS = require("aws-sdk");
const {DynamoDB} = require('@aws-sdk/client-dynamodb-v2-node');
const ddbClient = new DynamoDB({region: process.env.AwsRegion});
const configDefault={
	ttlIncrement:3600*.25
}
const configMap={
	chi: configDefault,
}

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

const getConfig=(orgId)=>{
	if(configMap[orgId]){
		return configMap[orgId];
	}
	return configDefault;
}
const getTtl=(orgId)=>{
	const config=getConfig(orgId);
	return Math.round((new Date().getTime()/1000)+config.ttlIncrement);
}
const create_UUID=()=>{
    var dt = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (dt + Math.random()*16)%16 | 0;
        dt = Math.floor(dt/16);
        return (c=='x' ? r :(r&0x3|0x8)).toString(16);
    });
    return uuid;
}
const ddbQueryRaceHistory=async (qsp)=>{
	var limit = parseInt(qsp.limit);

	if( ! qsp.loMicros){
		qsp.loMicros="1";
	}
	if( ! qsp.hiMicros){
		qsp.hiMicros=new Date().getTime()*1000 +"";
	}
	if(isNaN(limit) || limit>25){
		limit=25;
	}

	var containsValues={};
        containsValues[":dp"]={S: qsp.orgId};
        containsValues[":loMicros"]={N: qsp.loMicros};
        containsValues[":hiMicros"]={N: qsp.hiMicros};
	var params = {
	    TableName: process.env.DistDbTable,
	    KeyConditionExpression: "DP = :dp and DS BETWEEN :loMicros  and :hiMicros",
	    ReturnConsumedCapacity: "TOTAL", 
	    Limit: limit,
	    ScanIndexForward: false,  // sort descending
	    ExpressionAttributeValues :  containsValues
	};
	console.log("history query: "+ JSON.stringify(params));
	try{
	   var data=await ddbClient.query(params);
		 console.log("queryRaceHistory: "+ data);           // successful response
		 console.log("queryRaceHistory: "+ JSON.stringify(data));           // successful response
		const rc=[];
		for (var i = 0; i < data.Items.length; i++) {
			var unmarshalled = AWS.DynamoDB.Converter.unmarshall(data.Items[i]);
			rc.push(unmarshalled);
		}

		
		return rc;
	}
	catch(err){
	   console.log("queryRaceHistory failed: ",err, err.stack); // an error occurred
	}
	   return {error: "Query History Failed"};
}
const ddbQueryRaceConfig=async ()=>{
	var containsValues={};
        containsValues[":pk"]={S: "EventConfig"};
	var params = {
	    TableName: process.env.DynamoDbTable,
	    KeyConditionExpression: "PK = :pk",
	    ReturnConsumedCapacity: "TOTAL", 
	    ExpressionAttributeValues :  containsValues
	};
	console.log("ddb query: "+ JSON.stringify(params));
	try{
	   var data=await ddbClient.query(params);
		 console.log("queryRaceConfig: "+ data);           // successful response
		 console.log("queryRaceConfig: "+ JSON.stringify(data));           // successful response
		const rc={};
		for (var i = 0; i < data.Items.length; i++) {
			var unmarshalled = AWS.DynamoDB.Converter.unmarshall(data.Items[i]);
			rc[unmarshalled.SK]=unmarshalled;
		}

		
		return rc;
	}
	catch(err){
	   console.log("queryRaceConfig failed: ",err, err.stack); // an error occurred
	}
	   return {error: "Query Failed"};
}
const ddbQueryRsContains=async (json)=>{
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
	    ReturnConsumedCapacity: "TOTAL", 
	    ExpressionAttributeValues :  containsValues
	};
	console.log("ddb query: "+ JSON.stringify(params));

	try{
	   var data=await ddbClient.query(params);
		 console.log("queryRsContains: "+ data);           // successful response
		 console.log("queryRsContains: "+ JSON.stringify(data));           // successful response
		return data.Count;
	}
	catch(err){
	   console.log("queryRsContains failed: ",err, err.stack); // an error occurred
	}
	return 99;
}
const ddbListOfStrings=(slist)=>{
	var rc={"L":[]}
	var i;
	for (i = 0; i < slist.length; i++) {
	  rc["L"][i] = {"S":slist[i]};
	}
	return rc;
}
const addPending=async (json)=>{
	console.log("addPending: "+ JSON.stringify(json));
	const alreadyExists=await ddbQueryRsContains(json);
	if(alreadyExists>0){
	   return {error: "Pending already exists"};
	}
	
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
	   "TTL": {
	     N: getTtl()+""
	    },
	   "TTQ": {
	     N: getTtl()+""
	    },
	   "orgId": {
	     S: json.orgId
	    }
	  }, 
	  ReturnConsumedCapacity: "TOTAL", 
	  TableName: process.env.DynamoDbTable
	 };

	console.log("addPending skel: "+ JSON.stringify(params));

	try{
	   var data=await ddbClient.putItem(params);
	   console.log("Added RS: "+ JSON.stringify(data));           // successful response
	   return {status: "ok"};
	}
	catch(err){
	   console.log(err, err.stack); // an error occurred
	   return {error: err};
	 }
};

const addParticipant=async (json)=>{
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

	try{
		var data=await ddbClient.putItem(params);
	   	console.log("Added PTCP: "+ JSON.stringify(data));           // successful response
	   return {status: "ok", detail: "Added"};
	}
	catch(err){
		console.log(err, err.stack); // an error occurred
	   return {error: err};
	}
};

exports.handler = async (event ) =>{
  const dbArn=process.env.DynamoDbArn
  var jsonRC={};

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

  console.log(event);
  const routePath=event.path.replace(/^\/app/,"");
  var cacheControl="no-cache";
  if(routePath==="/addParticipant"){
	jsonRC=await addParticipant(JSON.parse(event.body));
  }
  else if(routePath==="/addPending"){
	jsonRC=await addPending(JSON.parse(event.body));
  }
  else if(routePath==="/ddbQuery"){
	var qr=	await ddbQueryRsContains(JSON.parse(event.body));
       console.log("ddbQuery: "+qr);
	jsonRC={Count: qr};
  }
  else if(routePath==="/getRaceConfig"){
	var qr=	await ddbQueryRaceConfig();
	jsonRC=qr;
        cacheControl='max-age=7207'
  }
  else if(routePath==="/getRaceHistory"){
	var qr=	await ddbQueryRaceHistory(event.queryStringParameters);
	jsonRC=qr;
        cacheControl='max-age=7208'
  }
  else{
       console.log("Unhandled Path: "+routePath + " ep: "+event.path);
	jsonRC={error: "Unhandled"};
  }

  console.log(JSON.stringify(event));
  var response = {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
	'Cache-Control': cacheControl
    },
    body: JSON.stringify(jsonRC)
  }
  //callback(null, response)
  return response;
}
