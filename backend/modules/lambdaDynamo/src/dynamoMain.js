'use strict'
const {DynamoDB} = require('@aws-sdk/client-dynamodb-v2-node');
const  AWS = require("aws-sdk");
const s3 = new AWS.S3();


//const ddbClient = new DynamoDB({region: process.env.AwsRegion});


console.log('Loading function');

const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}
const asyncForEach=async (array, callback) =>{
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}
exports.handler = async (event ) =>{
  const dbArn=process.env.DynamoDbArn
  var jsonRC={};


  console.log(JSON.stringify(event));

    //event.Records.forEach(function(record) {
    await asyncForEach(event.Records,async function(record) {
        console.log(record.eventID);
        console.log(record.eventName);
        console.log('DynamoDB Record: %j', record.dynamodb);
	var unmarshalled = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage);
        console.log('DynamoDB Unmarshalled: %j', unmarshalled);

	if(unmarshalled){
	    try{
		    console.log('S3 Putting');
		    const dstKey=    unmarshalled.orgId+"/"+ new Date().toISOString()
		    const dstBucket=process.env.DstBucket;
		    const contentType="application/json";
		    console.log('S3 Putting : %s:%s', dstBucket,dstKey);
		    var foo=await s3.putObject({
			    Bucket: dstBucket,
			    Key: dstKey,
			    Body: JSON.stringify(unmarshalled),
    			    ACL: 'public-read',
			    ContentType: contentType
			}).promise();
		    console.log('S3 done0');
		    console.log('S3 done1'+foo);
		    console.log(foo);
	    }
	    catch(err){
		console.log('s3 Put failed');
		console.log(err);
	    }
	}
    });
  return "message";
}
