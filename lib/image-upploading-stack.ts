import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';

export class ImageUploadingStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create an S3 bucket to store images
    const imageBucket = new s3.Bucket(this, 'ImageBucket', {
      versioned: true, // Enable versioning to track changes
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Automatically delete the bucket if the stack is destroyed
      autoDeleteObjects: true, // Automatically delete all objects when the bucket is deleted
    });

    // Create a Lambda function that uploads images to the S3 bucket
    const uploadLambda = new lambda.Function(this, 'UploadImageLambda', {
      runtime: lambda.Runtime.NODEJS_14_X, // Node.js 14 for the Lambda function runtime
      handler: 'index.handler', // Function entry point (index.js -> handler)
      code: lambda.Code.fromAsset('lambda'), // Path to Lambda code directory
      environment: {
        BUCKET_NAME: imageBucket.bucketName, // Pass S3 bucket name as an environment variable
      },
    });

    // Grant the Lambda function permission to write to the S3 bucket
    imageBucket.grantPut(uploadLambda);

    // Create an API Gateway REST API to accept image uploads and trigger the Lambda function
    const api = new apigateway.RestApi(this, 'ImageUploadApi', {
      restApiName: 'Image Upload Service',
      description: 'This service uploads images to S3 via API Gateway.',
    });

    // Integrate API Gateway POST method with the Lambda function for image uploads
    const uploadIntegration = new apigateway.LambdaIntegration(uploadLambda);
    api.root.addMethod('POST', uploadIntegration); // Add a POST method to trigger the Lambda function

    // Create an SQS queue to decouple image processing from the upload process
    const imageProcessingQueue = new sqs.Queue(this, 'ImageProcessingQueue', {
      visibilityTimeout: cdk.Duration.seconds(300), // Time allowed for Lambda to process the message
      retentionPeriod: cdk.Duration.days(1), // Retain messages for 1 day
    });

    // Configure S3 to send event notifications to the SQS queue when an image is uploaded
    imageBucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.SqsDestination(imageProcessingQueue));

  }
}
