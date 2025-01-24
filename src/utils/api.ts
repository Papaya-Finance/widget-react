export const apiApprove = async (walletAddress: string, details: any) => {
  console.log(`Sending approval request for wallet: ${walletAddress}`);
  console.log("Approval details:", details);
  // Simulate API request
  return new Promise((resolve) => setTimeout(resolve, 1000));
};

export const apiSubscribe = async (walletAddress: string, details: any) => {
  console.log(`Sending subscription request for wallet: ${walletAddress}`);
  console.log("Subscription details:", details);
  // Simulate API request
  return new Promise((resolve) => setTimeout(resolve, 1000));
};
