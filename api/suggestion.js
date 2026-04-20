export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, topic, details, timestamp } = req.body;

    // Validate required fields
    if (!name || !email || !topic) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Prepare email content
    const subject = `RadioFAF 69.0 FM — Topic Suggestion from ${name}`;
    const emailBody = `From: ${name} (${email})

Topic: ${topic}

Details:
${details || 'No additional details provided.'}

---
Submitted via RadioFAF.com
Timestamp: ${timestamp}`;

    // Send email using a service (for now, we'll use Resend)
    const emailData = {
      from: 'suggestions@radiofaf.com',
      to: 'team@faf.one',
      subject: subject,
      text: emailBody,
      reply_to: email
    };

    // If we have Resend API key, use it
    if (process.env.RESEND_API_KEY) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailData)
      });

      if (!response.ok) {
        throw new Error('Email service failed');
      }

      const result = await response.json();
      
      return res.status(200).json({ 
        success: true, 
        message: 'Suggestion sent successfully',
        id: result.id
      });
    } else {
      // No email service configured - return success anyway
      // The frontend will fallback to mailto
      return res.status(503).json({ 
        error: 'Email service not configured',
        fallback: true
      });
    }

  } catch (error) {
    console.error('Suggestion API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      fallback: true
    });
  }
}