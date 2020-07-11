console.log("Loading function");

exports.handler = async function (event, context) {
    // console.log('Received event:', JSON.stringify(event, null, 4));

    var message = event.Records[0].Sns.Message;
    console.log("Message received from SNS2:", message);
    return "Success";
};
