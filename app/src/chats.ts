// Example conversations with the agent for the UI prototype. Nothing here is real or saved anywhere.

export type ChatTurn = {sender: 'user' | 'assistant'; text: string};

export type Chat = {
  id: number;
  title: string;
  /** When the last message was sent, as an ISO date and time. */
  updatedAt: string;
  turns: ChatTurn[];
};

/** Newest first, as the sidebar lists them. */
export const CHATS: Chat[] = [
  {
    id: 1,
    title: 'Why is Europe below target?',
    updatedAt: '2026-11-17T16:40',
    turns: [
      {sender: 'user', text: 'Why is Europe 9.6% below target in the October summary?'},
      {sender: 'assistant', text: 'Europe sold 1,121,480 USD against a 1,240,000 target. Most of the gap is in the last week of October: orders dropped after the 24th while the euro was weaker, so each order converted to fewer dollars.'},
      {sender: 'user', text: 'How much of that is the exchange rate?'},
      {sender: 'assistant', text: 'About 31,000 USD. At September’s average rate the same orders would have come to 1,152,600 USD, still 7.0% below target.'},
    ],
  },
  {
    id: 2,
    title: 'Set up a weekly churn list',
    updatedAt: '2026-11-16T10:05',
    turns: [
      {sender: 'user', text: 'Can you set up a workflow that flags customers at risk every Monday?'},
      {sender: 'assistant', text: 'I drafted Customer churn list. It reads active customers from Salesforce, flags anyone with no order in 60 days, and sends the list to account owners. It is a draft until you try it on last month and turn it on.'},
    ],
  },
  {
    id: 3,
    title: 'Explain the USD conversion step',
    updatedAt: '2026-11-12T14:22',
    turns: [
      {sender: 'user', text: 'Which exchange rate does the Convert to USD step use?'},
      {sender: 'assistant', text: 'The ECB rate on each order’s date. For orders on weekends it uses Friday’s rate, because the ECB does not publish on weekends. In October that applied to 112 orders.'},
    ],
  },
  {
    id: 4,
    title: 'September close numbers',
    updatedAt: '2026-10-01T09:30',
    turns: [
      {sender: 'user', text: 'Which regions missed target in September?'},
      {sender: 'assistant', text: 'Europe and Japan. Europe was 4.1% below and Japan 2.3% below. The US, UK and Canada were above target.'},
    ],
  },
];
