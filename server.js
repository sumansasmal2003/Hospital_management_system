const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());
const otpStore = {};

// Setup Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'Gmail', // Or other services
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatTime = (timeString) => {
  const date = new Date(`1970-01-01T${timeString}Z`);
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12; // Convert hours from 24-hour to 12-hour format
  const formattedMinutes = String(minutes).padStart(2, '0');
  return `${formattedHours}:${formattedMinutes} ${ampm}`;
};

// Define common email styles
const emailStyles = `
  <style>
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      color: #4a4a4a;
      margin: 0;
      padding: 0;
      background-color: #f9f9f9;
    }
    .container {
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
    }
    .header h1 {
      color: #3498db;
      margin: 0;
      font-size: 28px;
    }
    .content {
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 20px;
    }
    .footer {
      text-align: center;
      font-size: 14px;
      color: #888888;
    }
    .footer p {
      margin: 0;
    }
  </style>
`;

// POST route for sending request email notification
app.post('/api/send-request-email', async (req, res) => {
  const { name, email, department } = req.body;

  if (!name || !email || !department) {
    return res.status(400).json({ message: 'Please provide all required fields.' });
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Doctor Request Submitted Successfully',
    html: `
      <html>
        <head>
          ${emailStyles}
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Hello Dr. ${name},</h1>
            </div>
            <div class="content">
              <p>Thank you for submitting your request to join our hospital as a specialist in the ${department} department.</p>
              <p>Your request has been received, and we will review your details and inform you of the next steps via email.</p>
              <p>If you have any questions, please feel free to reach out.</p>
            </div>
            <div class="footer">
              <p>Best regards,<br />Hospital Administration</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Email sent successfully.' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ message: 'An error occurred while sending the email.' });
  }
});

// POST route for sending verified doctor email with secret code
app.post('/api/verified-doctor-email', async (req, res) => {
  const { email, department, secretCode } = req.body;

  if (!email || !department || !secretCode) {
    return res.status(400).json({ message: 'Please provide all required fields.' });
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Doctor Verification Successful',
    html: `
      <html>
        <head>
          ${emailStyles}
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Verification Successful</h1>
            </div>
            <div class="content">
              <p>Dear Doctor,</p>
              <p>Congratulations! Your request to join our hospital as a specialist in the ${department} department has been approved.</p>
              <p>Your unique verification code is: <strong>${secretCode}</strong></p>
              <p>Please use this code during the registration process to complete your onboarding.</p>
            </div>
            <div class="footer">
              <p>Best regards,<br />Hospital Administration</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Verification email sent successfully.' });
  } catch (error) {
    console.error('Error sending verification email:', error);
    res.status(500).json({ message: 'An error occurred while sending the verification email.' });
  }
});

// POST route for sending successful registration email
app.post('/api/doctor-register-successful', async (req, res) => {
  const { name, email, department, degree } = req.body;

  if (!name || !email || !department || !degree) {
    return res.status(400).json({ message: 'Please provide all required fields.' });
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Doctor Registration Successful',
    html: `
      <html>
        <head>
          ${emailStyles}
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Registration Successful</h1>
            </div>
            <div class="content">
              <p>Dear Dr. ${name},</p>
              <p>We are pleased to inform you that your registration as a specialist in the ${department} department has been successfully completed.</p>
              <p>Degree: ${degree}</p>
              <p>Welcome to our hospital. We look forward to working with you.</p>
            </div>
            <div class="footer">
              <p>Best regards,<br />Hospital Administration</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Registration email sent successfully.' });
  } catch (error) {
    console.error('Error sending registration email:', error);
    res.status(500).json({ message: 'An error occurred while sending the registration email.' });
  }
});

// Endpoint to send OTP
app.post('/api/reserving-doctor-otp', (req, res) => {
  const { email, doctor, department, reservationDate, reservationTime } = req.body;

  if (!email || !doctor || !department || !reservationDate || !reservationTime) {
    return res.status(400).json({ message: 'Please provide all required fields.' });
  }

  // Generate a new OTP if not provided
  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

  // Store OTP with an expiration time (e.g., 5 minutes)
  otpStore[email] = {
    otp: generatedOtp,
    expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes from now
  };

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Doctor Reservation OTP',
    html: `
      <html>
        <head>
          ${emailStyles}
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Doctor Reservation OTP</h1>
            </div>
            <div class="content">
              <p>Dear Patient,</p>
              <p>Your request to reserve Dr. ${doctor} in the ${department} department has been received.</p>
              <p><strong>Reservation Details:</strong></p>
              <ul>
                <li>Reservation Date: ${reservationDate}</li>
                <li>Reservation Time: ${reservationTime}</li>
              </ul>
              <p>Please use the following OTP to complete the reservation:</p>
              <p><strong>${generatedOtp}</strong></p>
              <p>If you did not request this reservation, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>Best regards,<br />Hospital Administration</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  transporter.sendMail(mailOptions, (error) => {
    if (error) {
      console.error('Error sending OTP:', error);
      return res.status(500).json({ message: 'An error occurred while sending the OTP.' });
    }
    res.status(200).json({ message: 'OTP sent successfully.' });
  });
});

// Endpoint to verify OTP
app.post('/api/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'Please provide email and OTP.' });
  }

  const storedOtp = otpStore[email];

  if (!storedOtp) {
    return res.status(400).json({ message: 'OTP not found for this email.' });
  }

  if (storedOtp.expiresAt < Date.now()) {
    delete otpStore[email]; // Remove expired OTP
    return res.status(400).json({ message: 'OTP has expired.' });
  }

  if (storedOtp.otp !== otp) {
    return res.status(400).json({ message: 'Invalid OTP.' });
  }

  delete otpStore[email]; // OTP is valid, remove it
  res.status(200).json({ message: 'OTP verified successfully.' });
});

app.post('/api/doctor-reserver-request-successful', async (req, res) => {
  const { name, email, doctor, department, reservationDate, reservationTime } = req.body;

  if (!name || !email || !doctor || !department || !reservationDate || !reservationTime) {
    return res.status(400).json({ message: 'Please provide all required fields.' });
  }

  const formattedDate = formatDate(reservationDate);
  const formattedTime = formatTime(reservationTime);

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Doctor Reservation Request Submitted Successfully',
    html: `
      <html>
        <head>
          ${emailStyles}
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Reservation Request Submitted</h1>
            </div>
            <div class="content">
              <p>Dear ${name},</p>
              <p>Your request to reserve Dr. ${doctor} in the ${department} department has been successfully submitted.</p>
              <p>Reservation Date: ${formattedDate}</p>
              <p>Reservation Time: ${formattedTime}</p>
              <p>You will receive a mail shortly to confirm or reject your reservation.</p>
            </div>
            <div class="footer">
              <p>Best regards,<br />Hospital Administration</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Reservation request email sent successfully.' });
  } catch (error) {
    console.error('Error sending reservation request email:', error);
    res.status(500).json({ message: 'An error occurred while sending the reservation request email.' });
  }
});

// POST route for approving patient requests
app.post('/api/approve-patient-requests', async (req, res) => {
  const { email, name, doctor, department, reservationDate, reservationTime } = req.body;

  if (!email || !name || !doctor || !department || !reservationDate || !reservationTime) {
    return res.status(400).json({ message: 'Please provide all required fields.' });
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Patient Request Approved',
    html: `
      <html>
        <head>
          ${emailStyles}
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Request Approved</h1>
            </div>
            <div class="content">
              <p>Dear ${name},</p>
              <p>Your request to reserve Dr. ${doctor} in the ${department} department has been approved.</p>
              <p><strong>Reservation Date:</strong> ${new Date(reservationDate).toLocaleDateString()}</p>
              <p><strong>Reservation Time:</strong> ${reservationTime}</p>
              <p>Thank you for your patience. If you have any questions, please contact us.</p>
            </div>
            <div class="footer">
              <p>Best regards,<br />Hospital Administration</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Approval email sent successfully.' });
  } catch (error) {
    console.error('Error sending approval email:', error);
    res.status(500).json({ message: 'An error occurred while sending the approval email.' });
  }
});


// POST route for declining patient requests
app.post('/api/decline-patient-requests', async (req, res) => {
  const { email, name, doctor, department, reservationDate, reservationTime } = req.body;

  if (!email || !name || !doctor || !department || !reservationDate || !reservationTime) {
    return res.status(400).json({ message: 'Please provide all required fields.' });
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Patient Request Declined',
    html: `
      <html>
        <head>
          ${emailStyles}
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Request Declined</h1>
            </div>
            <div class="content">
              <p>Dear ${name},</p>
              <p>We regret to inform you that your request to reserve Dr. ${doctor} in the ${department} department has been declined.</p>
              <p><strong>Requested Reservation Date:</strong> ${new Date(reservationDate).toLocaleDateString()}</p>
              <p><strong>Requested Reservation Time:</strong> ${reservationTime}</p>
              <p>If you have any questions or need further assistance, please contact us.</p>
            </div>
            <div class="footer">
              <p>Best regards,<br />Hospital Administration</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Decline email sent successfully.' });
  } catch (error) {
    console.error('Error sending decline email:', error);
    res.status(500).json({ message: 'An error occurred while sending the decline email.' });
  }
});

app.post('/api/send-meeting-email', async (req, res) => {
  const { email, name, meetingLink, meetingDate, meetingTime } = req.body;

  // Define the email options
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your Online Consultation Link',
    html: `
      <html>
        <body>
          <p>Hello ${name},</p>
          <p>Your online consultation is now scheduled as follows:</p>
          <p><strong>Date:</strong> ${meetingDate}</p>
          <p><strong>Time:</strong> ${meetingTime}</p>
          <p>You can join the meeting using the following link:</p>
          <p><a href="${meetingLink}" target="_blank">${meetingLink}</a></p>
          <p>Best regards,<br>Your Clinic</p>
        </body>
      </html>
    `,
  };

  try {
    // Send the email
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending meeting email:', error);
    res.status(500).json({ error: 'Failed to send meeting email.' });
  }
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
