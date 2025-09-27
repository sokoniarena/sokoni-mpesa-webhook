// netlify/functions/mpesa-callback.js - UPDATED VERSION
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
    console.log('📋 Callback Data:', JSON.stringify(callbackData, null, 2));

    // Test Google Apps Script connection with simple data
    const googleScriptUrl = "https://script.google.com/macros/s/AKfycbxARLoSRwwFpZC8ZwXSmQZPOYHEWIwCLdIPqxIKmy2jFjRwml759aL86oxqWu9jqn0W/exec";
    
    const testPayload = {
      action: "testConnection",
      message: "Testing connection from Netlify",
      receivedData: callbackData,
      timestamp: new Date().toISOString()
    };

    console.log('🔄 Sending to Google Apps Script...');
    
    try {
      const response = await fetch(googleScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload)
      });
      
      const resultText = await response.text();
      console.log('✅ Google Apps Script response:', resultText);
      
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          message: "Callback processed successfully",
          googleResponse: resultText
        })
      };
      
    } catch (fetchError) {
      console.error('❌ Fetch error:', fetchError);
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: false, 
          error: 'Failed to connect to Google Apps Script: ' + fetchError.message 
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
