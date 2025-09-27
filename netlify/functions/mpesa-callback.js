// netlify/functions/mpesa-callback.js
exports.handler = async (event) => {
  console.log(" M-Pesa Callback Received!");
  
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    // Parse the incoming M-Pesa callback
    const callbackData = JSON.parse(event.body);
    console.log(" Callback Data:", JSON.stringify(callbackData, null, 2));

    // Check if this is a valid STK callback
    if (callbackData.Body && callbackData.Body.stkCallback) {
      const stkCallback = callbackData.Body.stkCallback;
      
      // Payment successful
      if (stkCallback.ResultCode === 0) {
        console.log(" Payment Successful!");
        
        // Extract payment details
        const metadata = stkCallback.CallbackMetadata;
        let amount, mpesaReceipt, phoneNumber;
        
        if (metadata && metadata.Item) {
          metadata.Item.forEach(item => {
            if (item.Name === "Amount") amount = item.Value;
            if (item.Name === "MpesaReceiptNumber") mpesaReceipt = item.Value;
            if (item.Name === "PhoneNumber") phoneNumber = item.Value;
          });
        }

        console.log(` Payment Details:
  Amount: ${amount} KSh
  Receipt: ${mpesaReceipt}
  Phone: ${phoneNumber}
  CheckoutID: ${stkCallback.CheckoutRequestID}
`);

        // TODO: Replace with your actual Google Apps Script URL
        const googleScriptUrl = "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec";
        
        // Prepare data to send to Google Apps Script
        const updateData = {
          action: "updateHotDealStatus",
          checkoutRequestId: stkCallback.CheckoutRequestID,
          status: "paid",
          mpesaReceipt: mpesaReceipt,
          amount: amount,
          phone: phoneNumber
        };

        // Send to Google Apps Script
        try {
          const response = await fetch(googleScriptUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updateData)
          });
          
          const result = await response.text();
          console.log(" Sent to Google Apps Script:", result);
        } catch (googleError) {
          console.error(" Error sending to Google Apps Script:", googleError);
        }

        return {
          statusCode: 200,
          body: JSON.stringify({ 
            success: true, 
            message: "Payment processed successfully",
            receipt: mpesaReceipt
          })
        };
      } else {
        // Payment failed
        console.error(" Payment Failed:", stkCallback.ResultDesc);
        
        return {
          statusCode: 200,
          body: JSON.stringify({ 
            success: false, 
            message: "Payment failed: " + stkCallback.ResultDesc
          })
        };
      }
    }

    // If it's not an STK callback, just acknowledge receipt
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: "Callback received (not STK)" 
      })
    };

  } catch (error) {
    console.error(" Error processing callback:", error);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: false, 
        error: "Error processing callback" 
      })
    };
  }
};
