import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as apigw from '@aws-cdk/aws-apigatewayv2';
import {CorsHttpMethod, HttpMethod} from '@aws-cdk/aws-apigatewayv2';
import * as apigi from '@aws-cdk/aws-apigatewayv2-integrations';

interface ApplicationApiProps {
    commentsService: lambda.IFunction;
}

export class ApplicationAPI extends cdk.Construct {

    public readonly httpApi: apigw.HttpApi;

    constructor(scope: cdk.Construct, id: string, props: ApplicationApiProps) {
        super(scope, id);

        const serviceMethods = [
            HttpMethod.GET,
            HttpMethod.POST,
            HttpMethod.DELETE,
            HttpMethod.PUT,
            HttpMethod.PATCH,
        ];

        this.httpApi = new apigw.HttpApi(this, 'HttpProxyApi', {
            apiName: 'serverless-api',
            createDefaultStage: true,
            corsPreflight: {
                allowHeaders: ['Authorization', 'Content-Type', '*'],
                allowMethods: [
                    CorsHttpMethod.GET,
                    CorsHttpMethod.POST,
                    CorsHttpMethod.DELETE,
                    CorsHttpMethod.PUT,
                    CorsHttpMethod.PATCH,
                ],
                allowOrigins: ['http://localhost:3000', 'https://*'],
                allowCredentials: true,
                maxAge: cdk.Duration.days(10),
            },
        });

        // connect to the lambda
        const commentsServiceIntegration = new apigi.LambdaProxyIntegration({
            handler: props.commentsService,
        });

        this.httpApi.addRoutes({
            path: `/comments/{proxy+}`,
            methods: serviceMethods,
            integration: commentsServiceIntegration,
        });

        new cdk.CfnOutput(this, 'URL', {
            value: this.httpApi.apiEndpoint,
        });
        
    }
}
