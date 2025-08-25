export const VERIFICATION_EMAIL_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, rgba(0,128,254,1), rgba(0,199,229,1) 100%); padding: 20px; text-align: center;">
    <h1 style="color: #fff; margin: 0;">Verify Your Email</h1>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <p>Hello {fullName},</p>
    <p>Thank you for signing up with WeLyncu! Your verification code is:</p>
    <div style="text-align: center; margin: 30px 0;">
      <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #007bff;">{otp}</span>
    </div>
    <p>Enter this code on the verification page to complete your registration.</p>
    <p>This code will expire in 1 hour for security reasons.</p>
    <p>If you didn't create an account with us, please ignore this email.</p>
    <p>Best regards,<br>WeLyncu Team</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #888; font-size: 0.8em;">
    <p>This is an automated message by WeLyncu, please do not reply to this email.</p>
  </div>
</body>
</html>
`;

export const PASSWORD_RESET_SUCCESS_TEMPLATE = `
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Successful</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: green; padding: 20px; text-align: center;">
    <h1 style="color: #fff; margin: 0;">Password Reset Successful</h1>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <p>Hello {fullName},</p>
    <p>We're writing to confirm that your Tea Time Telugu password has been successfully reset.</p>
    <div style="text-align: center; margin: 30px 0;">
      <div style="background-color: green; color: white; width: 50px; height: 50px; line-height: 50px; border-radius: 50%; display: inline-block; font-size: 30px;">
        ✓
      </div>
    </div>
    <p>If you did not initiate this password reset, please contact our support team immediately.</p>
    <p>For security reasons, we recommend that you:</p>
    <ul>
      <li>Use a strong, unique password</li>
      <li>Enable two-factor authentication if available</li>
      <li>Avoid using the same password across multiple sites</li>
    </ul>
    <p>Thank you for helping us keep your account secure.</p>
    <p>Best regards,<br>Tea Time Telugu Team</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #888; font-size: 0.8em;">
    <p>This is an automated message, please do not reply to this email.</p>
  </div>
</body>
</html>
`;

export const PASSWORD_RESET_REQUEST_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your WeLyncu Password</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, rgba(0,128,254,1), rgba(0,199,229,1) 100%); padding: 20px; text-align: center;">
    <h1 style="color: #fff; margin: 0;">Password Reset</h1>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <p>Hello {fullName},</p>
    <p>We received a request to reset your password. If you didn't make this request, please ignore this email.</p>
    <p>To reset your password, click the button below:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{resetURL}" style="background-color: #007bff; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
    </div>
    <p>This link will expire in 1 hour for security reasons.</p>
    <p>Best regards,<br>WeLyncu Team</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #888; font-size: 0.8em;">
    <p>This is an automated message, please do not reply to this email.</p>
  </div>
</body>
</html>
`;

export const NEWS_ADDED_TEMPLATE = `
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>News Added</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f25a23; padding: 20px; text-align: center;">
    <h1 style="color: #fff; margin: 0;">New News Added</h1>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <p>Hello {fullName},</p>
    <p>We’ve got something new for you! 🚀</p>
    <p><b>{postedBy}</b> has just published the latest news on <b>{category}</b>, and we’re sure you’ll find it both exciting and insightful. Stay ahead with updates that matter most to you, only on <b>Tea Time Telugu</b>.</p>
    <a href="{postLink}" target="_blank" style="margin: 30px 0; color: inherit; text-decoration: none;">
      <img src="{imgSrc}" alt="" style="width: 100%; border-radius: 5px;" />
      <h2>{newsTitle}</h2>
      <button style="width:100%; padding: 10px; background-color: #f25a23; color: white; border: none; outline: none; font-size: 15px; cursor: pointer;">Read More</button>
    </a>
    <p>P.S. Don’t forget to share your thoughts or comments on the new updates! We love hearing from you. 😊</p>
    <p>Best regards,<br>Tea Time Telugu Team</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #888; font-size: 0.8em;">
    <p>This is an automated message, please do not reply to this email.</p>
  </div>
</body>
</html>
`;

export const CONTACT_MAIL_TEMPLATE = `
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>User Message</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f25a23; padding: 20px; text-align: center;">
    <h1 style="color: #fff; margin: 0;">User Message</h1>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <p>Hello Tea Time Telugu,</p>
    <p>We’ve got a message from Tea Time Telugu application user 🚀</p>
    <p>User Name : {fullName}</p>
    <p>Email     : {email}</p>
    <p>Subject   : {subject}</p>
    <p>Message   : </p><pre style="font-family: inherit;">{message}<pre>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #888; font-size: 0.8em;">
    <p>Have a great day.</p>
  </div>
</body>
</html>
`;

export const AD_MAIL_TEMPLATE = `
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ad Requiest Message</title>
</head>
<body style="font-family: Arial; sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f25a23; padding: 20px; text-align: center;">
    <h1 style="color: #fff; margin: 0;">Ad Requiest Message</h1>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <p>Hello Tea Time Telugu,</p>
    <p>We’ve got a Ad requiest from Tea Time Telugu application user 🚀</p>
    <p>Page : {page}</p>
    <p>Ad Size : {adSize}</p>
    <p>User Name : {fullName}</p>
    <p>Email     : {email}</p>
    <p>Subject   : {subject}</p>
    <p>Message   : </p><pre style="font-family: inherit;">{message}<pre>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #888; font-size: 0.8em;">
    <p>Have a great day.</p>
  </div>
</body>
</html>
`;
