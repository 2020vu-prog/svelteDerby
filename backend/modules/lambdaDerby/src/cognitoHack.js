      //Need aws-sdk.js to work
      function awync attachPrincipalPolicy(AWS, policyName, principal) {
	  try {
          new AWS.Iot().attachPrincipalPolicy({ policyName: policyName, principal: principal });
	  }
	  catch(err){
                    console.error(err); // an error occurred
	  }
       }
