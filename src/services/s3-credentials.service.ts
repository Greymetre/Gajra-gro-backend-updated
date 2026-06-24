import { Injectable } from '@nestjs/common';
// import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

@Injectable()
export class S3CredentialsService {
  // private readonly client: SecretsManagerClient;
  private readonly secretName = 'greymetre-s3-credentials';

  constructor() {
  //   this.client = new SecretsManagerClient({
  //     region: 'ap-south-1',
  //   });
  }

  async getS3Credentials() {
    try {
      // const command = new GetSecretValueCommand({
      //   SecretId: this.secretName,
      //   VersionStage: 'AWSCURRENT',
      // });

      // const response = await this.client.send(command);

      // if (response.SecretString) {
      //   const secret = JSON.parse(response.SecretString);
      //   return {
      //     aws_access_key_id: secret.ACCESS_KEY_ID,
      //     aws_secret_access_key: secret.SECRET_ACCESS_KEY,
      //   };
      // }
    } catch (error) {
      console.error('Error retrieving secret:', error);
      throw error;
    }
  }
}
