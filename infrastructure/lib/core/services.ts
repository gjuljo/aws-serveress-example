import * as path from 'path';
import * as cdk from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as s3 from '@aws-cdk/aws-s3';
import {NodejsFunction} from '@aws-cdk/aws-lambda-nodejs';
import {NodejsServiceFunction} from '../constructs/lambda';

interface AppServiceProps {
    documentsTable: dynamodb.Table,
    uploadBucket: s3.IBucket;
    assetBucket: s3.IBucket;
}

export class AppService extends cdk.Construct {

    public readonly commentsService: NodejsFunction;

    public readonly documentsService: NodejsFunction;

    constructor(scope: cdk.Construct, id: string, props: AppServiceProps) {
        super(scope,id);

        // comments service
        this.commentsService = new NodejsServiceFunction(this, 'CommentsServiceLambda', {
            entry: path.join(__dirname, '../../../services/comments/index.js'),
        });

        props.documentsTable.grantReadWriteData(this.commentsService);

        this.commentsService.addEnvironment('DYNAMO_DB_TABLE', props.documentsTable.tableName);

        // documents service
        this.documentsService = new NodejsServiceFunction(this, 'DocumentsServiceLambda', {
            entry: path.join(__dirname, '../../../services/documents/index.js'),
        });

        props.documentsTable.grantReadWriteData(this.documentsService);
        props.uploadBucket.grantWrite(this.documentsService);
        props.assetBucket.grantRead(this.documentsService);

        this.documentsService.addEnvironment('DYNAMO_DB_TABLE', props.documentsTable.tableName);
        this.documentsService.addEnvironment('UPLOAD_BUCKET', props.uploadBucket.bucketName);
        this.documentsService.addEnvironment('ASSET_BUCKET', props.assetBucket.bucketName);
    }
}