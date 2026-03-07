// Suggested queries shown in interactive mode, grouped by category
export const QUICK_REPLIES = [
  { label: "Check Balance", query: "What is my current account balance?" },
  { label: "Fund Transfer", query: "I need to transfer $50,000 to our supplier via telegraphic transfer" },
  { label: "Pay Bills", query: "Please help me pay our IRAS corporate tax bill" },
  { label: "Transactions", query: "Show me all transactions from last month" },
  { label: "Statement", query: "I need to download our December bank statement" },
  { label: "FX Rates", query: "What is today's USD to SGD exchange rate?" },
  { label: "Payroll", query: "How do I process payroll for 200 employees this Friday?" },
  { label: "Trade Finance", query: "We need to apply for a Letter of Credit for an import shipment" },
  { label: "Manage Users", query: "Add a new maker user and assign them the fund transfer role" },
  { label: "Set Alerts", query: "Set up an SMS alert when my balance drops below $10,000" },
  { label: "Reports", query: "Generate a cash flow report for Q4 2024" },
  { label: "Cheque", query: "I need to stop a cheque I issued yesterday" },
];

export const MULTI_INTENT_REPLIES = [
  { label: "Balance + Transfer", query: "I want to check my balance and then transfer funds to our vendor" },
  { label: "Payroll + Report", query: "Please process payroll and also generate the payroll report afterwards" },
  { label: "FX + Statement", query: "What's the USD/SGD rate and can I also download last month's FX statement?" },
  { label: "User + Alerts", query: "Add a new user and configure their transaction alerts" },
];

export const OUT_OF_SCOPE_REPLIES = [
  { label: "Weather?", query: "What's the weather like in Singapore today?" },
  { label: "Restaurant?", query: "Can you recommend a good restaurant near Raffles Place?" },
  { label: "Write code?", query: "Write me a Python script to automate Excel" },
];
