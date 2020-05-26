
'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports.submit = (event, context, callback) => {
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Go Serverless v1.0! sumbitted!',
      input: event,
    }),
  };

  callback(null, response);

};

module.exports.getUuid = (event, context, callback) => {
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      uuid: uuidv4(),
    }),
  };

  callback(null, response);

};
