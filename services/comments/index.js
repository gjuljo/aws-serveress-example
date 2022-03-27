import {
    createRouter,
    RouterType,
    Matcher,
    validatePathVariables,
    validateBodyJSONVariables,
} from 'lambda-micro';
import {AWSClients, generateID} from '../common';

// dynamodb client
const dynamoDB = AWSClients.dynamoDB();
const tableName = process.env.DYNAMO_DB_TABLE;

// eventbridge client
const eventbridge = AWSClients.eventbridge();

const schemas = {
    createComment: require('./schemas/createComment.json'),
    deleteComment: require('./schemas/deleteComment.json'),
    getComments: require('./schemas/getComments.json'),
};

// -------- SERVICE FUNCTIONS ---------

// Get all comments for a document
const getAllCommentsForDocument = async (request, response) => {
    const params = {
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
            ':pk': request.pathVariables.docid,
            ':sk': 'Comment',
        }
    };

    const results = await dynamoDB.query(params).promise();

    return response.output(results.Items, 200);
};

// Creates a comment for a document
const createComment = async (request, response) => {
    const userId = 'fc4cec10-6ae4-435c-98ca-6964382fee77'; // Hard-coded until we put users in place
    const commentId = `Comment#${generateID()}`;
    const item = {
      PK: request.pathVariables.docid,
      SK: commentId,
      DateAdded: new Date().toISOString(),
      Owner: userId,
      ...JSON.parse(request.event.body),
    };
    const params = {
      TableName: tableName,
      Item: item,
      ReturnValues: 'NONE',
    };
    await dynamoDB.put(params).promise();

    // send notification via eventbridge
    const detail = {
        DocumentId: request.pathVariables.docid,
        CommentId: commentId,
      };

    const eventParams = {
        Entries: [
            {
                Detail: JSON.stringify(detail),
                DetailType: 'CommentAdded',
                EventBusName: 'com.globomantics.dms',
                Resources: [],
                Source: 'com.globomantics.dms.comments',
            },
        ],
    };
    await eventbridge.putEvents(eventParams).promise();

    return response.output(item, 200);    
};

// Deletes a comment for a document
const deleteComment = async (request, response) => {
    const params = {
        TableName: tableName,
        Key: {
          PK: request.pathVariables.docid,
          SK: `Comment#${request.pathVariables.commentid}`,
        },
      };
      await dynamoDB.delete(params).promise();
      return response.output({}, 200);
};

// -------- LAMBDA ROUTER ---------

const router = createRouter(RouterType.HTTP_API_V2);

// Get all comments for a document
// GET /comments/(:docid)
router.add(
    Matcher.HttpApiV2('GET','/comments/(:docid)'),
    validatePathVariables(schemas.getComments),
    getAllCommentsForDocument,
);

// Create a new comment for a document
// POST /comments/(:docid)
router.add(
    Matcher.HttpApiV2('POST','/comments/(:docid)'),
    validateBodyJSONVariables(schemas.createComment),
    createComment,
);

// Delete a comment for a document
// DELETE /comments/(:docid)/(:commentid)
router.add(
    Matcher.HttpApiV2('DELETE','/comments/(:docid)/(:commentid)'),
    validatePathVariables(schemas.deleteComment),
    deleteComment,
);

exports.handler = async (event, context) => {
    return router.run(event, context);
};

