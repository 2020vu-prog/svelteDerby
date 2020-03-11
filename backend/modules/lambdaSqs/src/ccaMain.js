'use strict'

exports.handler = async function(event, context) {
  event.Records.forEach(record => {
    const { body } = record;
    console.log("sqs:",body);
  });
  return {};
}
