// netlify/functions/mpesa-callback.js - FINAL VERSION
const fetch = require('node-fetch');

exports.handler = async (event) => {
  console.log('📱 M-Pesa Callback Received!');
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    console.log('📦 Raw body:', event.body);
    
    let callbackData;
    try {
      callbackData = JSON.parse(event.body);
      console.log('✅ Parsed JSON successfully');
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON' })
      };
    }

    // Log the received data
    console.log('📋 Full Callback Data:', JSON.stringify(callbackData, null, 2));

    // Check if this is a valid STK callback
    if (callbackData.Body && callbackData.Body.stkCallback) {
      const stkCallback = callbackData.Body.stkCallback;
      
      console.log('🔍 Processing STK Callback...');
      console.log('ResultCode:', stkCallback.ResultCode);
      console.log('CheckoutRequestID:', stkCallback.CheckoutRequestID);

      // Payment successful
      if (stkCallback.ResultCode === 0) {
        console.log('✅ Payment Successful!');
        
        // Extract payment details
        const metadata = stkCallback.CallbackMetadata;
        let amount, mpesaReceipt, phoneNumber;
        
        if (metadata && metadata.Item) {
          metadata.Item.forEach(item => {
            if (item.Name === 'Amount') amount = item.Value;
            if (item.Name === 'MpesaReceiptNumber') mpesaReceipt = item.Value;
            if (item.Name === 'PhoneNumber') phoneNumber = item.Value;
          });
        }

        console.log(`💰 Payment Details:
  Amount: ${amount} KSh
  Receipt: ${mpesaReceipt}
  Phone: ${phoneNumber}
  CheckoutID: ${stkCallback.CheckoutRequestID}
`);

        // Send to Google Apps Script with PROPER M-Pesa data
        const googleScriptUrl = "https://script.google.com/macros/s/AKfycbxARLoSRwwFpZC8ZwXSmQZPOYHEWIwCLdIPqxIKmy2jFjRwml759aL86oxqWu9jqn0W/exec";
        
        const mpesaPayload = {
          action: "processMpesaPayment",
          checkoutRequestId: stkCallback.CheckoutRequestID,
          status: "paid",
          mpesaReceipt: mpesaReceipt,
          amount: amount,
          phone: phoneNumber,
          timestamp: new Date().toISOString()
        };

        console.log('🔄 Sending to Google Apps Script:', mpesaPayload);
        
        try {
          const response = await fetch(googleScriptUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(mpesaPayload)
          });
          
          const resultText = await response.text();
          console.log('✅ Google Apps Script response:', resultText);
          
          return {
            statusCode: 200,
            body: JSON.stringify({ 
              success: true, 
              message: "M-Pesa payment processed successfully",
              receipt: mpesaReceipt,
              googleResponse: resultText
            })
          };
          
        } catch (fetchError) {
          console.error('❌ Fetch error:', fetchError);
          return {
            statusCode: 200,
            body: JSON.stringify({ 
              success: false, 
              error: 'Failed to connect to Google Apps Script' 
            })
          };
        }
      } else {
        // Payment failed
        console.error('❌ Payment Failed:', stkCallback.ResultDesc);
        
        return {
          statusCode: 200,
          body: JSON.stringify({ 
            success: false, 
            message: 'Payment failed: ' + stkCallback.ResultDesc
          })
        };
      }
    } else {
      // Not an STK callback
      console.log('ℹ️ Received non-STK callback');
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          message: 'Callback received (not STK payment)' 
        })
      };
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: false, 
        error: 'Unexpected error: ' + error.message 
      })
    };
  }
};
