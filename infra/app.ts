#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { EnergyMonitorStack } from './stack';

const app = new cdk.App();

new EnergyMonitorStack(app, 'EnergyMonitorStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1', // CloudFront requires us-east-1 for ACM certs
  },
  domainName: 'energymonitor.click',
  certificateArn: process.env.ACM_CERTIFICATE_ARN ?? '',
});
