import type { Message, MessageStatus } from '../state/MessagesContext';

// How a message leaves this device.
//
// Today every message stays on this device (localTransport), so "sending"
// just saves it. When CloClo gets accounts, this is the one piece to swap
// for a server-backed transport: `send` uploads the message to the server,
// which delivers it to the account in `message.to`, and each person's app
// downloads only the messages whose `to` is their own user id — so user A
// only ever sees messages sent to user A. The screens stay the same.
export interface MessageTransport {
  send(message: Message): Promise<MessageStatus>;
}

export const localTransport: MessageTransport = {
  async send() {
    return 'sent';
  },
};
