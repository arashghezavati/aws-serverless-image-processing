import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Stack, StackProps} from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3'

export class ImageUpploadingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //Define S3 bucket for image storage
    const imageBucket = new s3.Bucket(this, 'imageBucket', {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });


    const uploadLambda = new lambda.Function(this, 'UploadImageLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler:'index.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment : {
        BUCKET_NAME : imageBucket.bucketName
      }
    });

    imageBucket.grantPut(uploadLambda);

    const api = new apigateway.RestApi(this, 'ImageUploadApi' , {
      restApiName:'Image Upload Service',
      description: 'This service uploads images to S3 via API Gateway.'
    });
    const uploadIntegration = new apigateway.LambdaIntegration(uploadLambda);
    api.root.addMethod('POST', uploadIntegration)
  }
}
