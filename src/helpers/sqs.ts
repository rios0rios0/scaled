import { isEmpty } from 'lodash';
import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageBatchCommand,
  ListQueuesCommand,
  Message,
} from '@aws-sdk/client-sqs';
import { Base64Message } from '../types';

const SQS_ENDPOINT = 'http://localhost:9999';

// eslint-disable-next-line import/prefer-default-export
export class SQSHelper {
  private readonly sqsClient: SQSClient = new SQSClient({
    endpoint: SQS_ENDPOINT,
    region: 'us-east-1',
  });

  public async sendMessage(queueUrl: string, messageBody: string): Promise<boolean> {
    const response = await this.sqsClient.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: messageBody,
      }),
    );

    return !isEmpty(response);
  }

  private async deleteMessages(queueUrl: string, messages: Message[]): Promise<void> {
    const entries = messages.map((message) => ({ Id: message.MessageId ?? '', ReceiptHandle: message.ReceiptHandle ?? '' }));
    await this.sqsClient.send(
      new DeleteMessageBatchCommand({
        QueueUrl: queueUrl,
        Entries: entries,
      }),
    );
  }

  public async receiveAllMessages(queueName: string): Promise<Base64Message[]> {
    const queueUrl = `${SQS_ENDPOINT}/000000000000/${queueName}`;

    let messages: Message[] = [];
    const base64Messages: Base64Message[] = [];
    try {
      do {
        const response = await this.sqsClient.send(
          new ReceiveMessageCommand({
            QueueUrl: queueUrl,
            MaxNumberOfMessages: 10,
          }),
        );
        messages = response.Messages ?? [];
        if (messages?.length > 0) {
          await this.deleteMessages(queueUrl, messages);
          messages?.map((message) => base64Messages.push(new Base64Message(message.Body ?? '')));
        }
      } while (messages.length > 0);

      return base64Messages;
    } catch (err) {
      console.log(err);
    }

    return [];
  }

  public async waitForQueue(queueName: string): Promise<void> {
    return new Promise((resolve) => {
      const interval = setInterval(async () => {
        let queueUrls: string[] | undefined;
        try {
          const response = await this.sqsClient.send(new ListQueuesCommand({}));
          queueUrls = response.QueueUrls;
        } catch (error) {
          queueUrls = undefined;
        }
        if (queueUrls?.find((queue) => queue.includes(queueName))) {
          resolve();
          clearInterval(interval);
        }
      }, 1000);
    });
  }
}
