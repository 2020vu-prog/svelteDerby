exports.handler = (event, context, callback) => {
    event.response = {
        "claimsOverrideDetails": {
            "claimsToAddOrOverride": {
                "attribute_key2": "attribute_cjw2",
                "attribute_key1": "attribute_cjw1"
            },
        }
    };

    // Return to Amazon Cognito
    callback(null, event);
};
