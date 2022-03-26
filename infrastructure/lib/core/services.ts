import * as path from 'path';
import * as cdk from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import {NodejsFunction} from '@aws-cdk/aws-lambda-nodejs';
import {NodejsServiceFunction} from '../constructs/lambda';

interface AppServiceProps {
    documentsTable: dynamodb.Table,
}

export class AppService extends cdk.Construct {

    public readonly commentsService: NodejsFunction;

    constructor(scope: cdk.Construct, id: string, props: AppServiceProps) {
        super(scope,id);

        this.commentsService = new NodejsServiceFunction(this, 'CommentsServiceLambda', {
            entry: path.join(__dirname, '../../../services/comments/index.js'),
        });

        props.documentsTable.grantReadWriteData(this.commentsService);

        this.commentsService.addEnvironment('DYNAMO_DB_TABLE', props.documentsTable.tableName);
    }
}