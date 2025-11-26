declare module 'zeptomail' {
  interface SendMailClientConfig {
    url: string;
    token: string;
  }

  interface ZeptoEmailResponse {
    data?: unknown;
    [key: string]: unknown;
  }

  export class SendMailClient {
    constructor(config: SendMailClientConfig);
    sendMail(payload: Record<string, unknown>): Promise<ZeptoEmailResponse>;
  }
}

