export class PaymentProvider {
  async submitPayment(clinicId, subscriptionId, amount, paymentMethod, details) {
    throw new Error("Not implemented");
  }
  async verifyPayment(paymentId, verifiedBy) {
    throw new Error("Not implemented");
  }
  async getPaymentInstructions(paymentMethod) {
    throw new Error("Not implemented");
  }
}

export function getManualProvider() {
  return {
    name: "manual",
    displayName: "Manual Payment",
    getInstructions: (method) => {
      const instructions = {
        "mtn-momo": "Send payment to MTN MoMo number: 0788 123 456\nUse your ClinicOS invoice number as reference.",
        "airtel-money": "Send payment to Airtel Money number: 0783 123 456\nUse your ClinicOS invoice number as reference.",
        "bank-transfer": "Bank: Bank of Kigali\nAccount Name: ClinicOS Ltd\nAccount Number: 1000001234567\nBranch: Kigali Main",
        "cash": "Visit our office at KG 123 St, Kigali to pay in cash.\nOffice hours: Mon-Fri 8:00-17:00",
      };
      return instructions[method] || "Contact support for payment instructions.";
    },
  };
}

export function getPaymentProvider(method) {
  const providers = {
    manual: getManualProvider(),
  };
  return providers[method] || providers.manual;
}
