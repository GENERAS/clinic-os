import { handleApiError } from "@/lib/errors";

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

async function requestToPayMomo(amount, phone, reference) {
  const apiUser = import.meta.env.NEXT_PUBLIC_MTN_MOMO_API_USER;
  const apiKey = import.meta.env.NEXT_PUBLIC_MTN_MOMO_API_KEY;
  const baseUrl = import.meta.env.NEXT_PUBLIC_MTN_MOMO_BASE_URL || "https://sandbox.momodeveloper.mtn.com";
  const subscriptionKey = import.meta.env.NEXT_PUBLIC_MTN_MOMO_SUBSCRIPTION_KEY;

  if (!apiUser || !apiKey) {
    return { success: false, message: "MTN MoMo not configured" };
  }

  try {
    const authRes = await fetch(`${baseUrl}/collection/token/`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${apiUser}:${apiKey}`)}`,
        "Ocp-Apim-Subscription-Key": subscriptionKey || "",
      },
    });
    const auth = await authRes.json();
    if (!authRes.ok) throw new Error(auth.message || "Auth failed");

    const payRes = await fetch(`${baseUrl}/collection/v1_0/requesttopay`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.access_token}`,
        "X-Reference-Id": crypto.randomUUID(),
        "X-Target-Environment": "sandbox",
        "Ocp-Apim-Subscription-Key": subscriptionKey || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: String(amount),
        currency: "EUR",
        externalId: reference,
        payer: { partyIdType: "MSISDN", partyId: phone.replace(/\D/g, "") },
        payerMessage: `Payment for ${reference}`,
        payeeNote: "ClinicOS Subscription",
      }),
    });
    const result = await payRes.json();
    return { success: payRes.ok, transactionId: result?.financialTransactionId || null, message: result?.message || null };
  } catch (err) {
    return { success: false, message: handleApiError(err, "MTN MoMo payment failed") };
  }
}

async function requestToPayAirtel(amount, phone, reference) {
  const clientId = import.meta.env.NEXT_PUBLIC_AIRTEL_CLIENT_ID;
  const clientSecret = import.meta.env.NEXT_PUBLIC_AIRTEL_CLIENT_SECRET;
  const baseUrl = import.meta.env.NEXT_PUBLIC_AIRTEL_BASE_URL || "https://openapi.airtel.africa";

  if (!clientId || !clientSecret) {
    return { success: false, message: "Airtel Money not configured" };
  }

  try {
    const authRes = await fetch(`${baseUrl}/auth/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
      }),
    });
    const auth = await authRes.json();
    if (!authRes.ok) throw new Error(auth.message || "Auth failed");

    const payRes = await fetch(`${baseUrl}/merchant/v1/payments/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.access_token}`,
        "X-Country": "RWA",
        "X-Currency": "RWF",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reference,
        subscriber: { country: "RWA", currency: "RWF", msisdn: phone.replace(/\D/g, "") },
        transaction: { amount, country: "RWA", currency: "RWF", id: reference },
      }),
    });
    const result = await payRes.json();
    return { success: payRes.ok, transactionId: result?.transaction?.id || null, message: result?.message || null };
  } catch (err) {
    return { success: false, message: handleApiError(err, "Airtel Money payment failed") };
  }
}

export function getManualProvider() {
  return {
    name: "manual",
    displayName: "Manual Payment",
    paymentMethod: "manual",
    async submit(amount, phone, reference) {
      return { success: true, transactionId: `manual_${Date.now()}` };
    },
    async verify(transactionId) {
      return { verified: true };
    },
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

export function getMtnMomoProvider() {
  return {
    name: "mtn-momo",
    displayName: "MTN MoMo",
    paymentMethod: "mtn-momo",
    async submit(amount, phone, reference) {
      return requestToPayMomo(amount, phone, reference);
    },
    async verify(transactionId) {
      return { verified: true, transactionId };
    },
    getInstructions: () => "Pay via MTN MoMo. You will receive a payment request on your phone.",
  };
}

export function getAirtelMoneyProvider() {
  return {
    name: "airtel-money",
    displayName: "Airtel Money",
    paymentMethod: "airtel-money",
    async submit(amount, phone, reference) {
      return requestToPayAirtel(amount, phone, reference);
    },
    async verify(transactionId) {
      return { verified: true, transactionId };
    },
    getInstructions: () => "Pay via Airtel Money. You will receive a payment request on your phone.",
  };
}

export function getPaymentProvider(method) {
  const providers = {
    "mtn-momo": getMtnMomoProvider(),
    "airtel-money": getAirtelMoneyProvider(),
    "bank-transfer": getManualProvider(),
    cash: getManualProvider(),
    manual: getManualProvider(),
  };
  return providers[method] || providers.manual;
}
