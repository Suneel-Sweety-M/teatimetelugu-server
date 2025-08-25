import nodemailer from "nodemailer";
import dotenv from "dotenv";
import {
  AD_MAIL_TEMPLATE,
  CONTACT_MAIL_TEMPLATE,
  NEWS_ADDED_TEMPLATE,
} from "./mailTemplates.js";

dotenv.config();

const { AUTH_EMAIL, AUTH_PASSWORD } = process.env;

let transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  auth: {
    user: AUTH_EMAIL,
    pass: AUTH_PASSWORD,
  },
});

export const sendNewsAddedEmail = async (data) => {
  const {
    email,
    fullName,
    postedBy,
    category,
    imgSrc,
    newsTitle,
    postLink,
    res,
  } = data;

  //mail options
  const mailOptions = {
    from: AUTH_EMAIL,
    to: email,
    subject: "News Added",
    html: NEWS_ADDED_TEMPLATE.replace("{fullName}", fullName)
      .replace("{postedBy}", postedBy)
      .replace("{category}", category)
      .replace("{imgSrc}", imgSrc)
      .replace("{newsTitle}", newsTitle)
      .replace("{postLink}", postLink),
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.log(error);
    return res
      .status(404)
      .send({ status: "fail", message: "Something went wrong!" });
  }
};

export const sendContactUsEmail = async (data) => {
  const { email, fullName, subject, message, res } = data;

  //mail options
  const mailOptions = {
    from: email,
    to: AUTH_EMAIL,
    subject: subject,
    html: CONTACT_MAIL_TEMPLATE.replace("{fullName}", fullName)
      .replace("{email}", email)
      .replace("{subject}", subject)
      .replace("{message}", message),
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.log(error);
    return res
      .status(404)
      .send({ status: "fail", message: "Something went wrong!" });
  }
};

export const sendAdEmail = async (data) => {
  const { email, fullName, subject, message, page, adSize, res } = data;

  //mail options
  const mailOptions = {
    from: email,
    to: AUTH_EMAIL,
    subject: subject,
    html: AD_MAIL_TEMPLATE.replace("{fullName}", fullName)
      .replace("{page}", page)
      .replace("{adSize}", adSize)
      .replace("{email}", email)
      .replace("{subject}", subject)
      .replace("{message}", message),
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.log(error);
    return res
      .status(404)
      .send({ status: "fail", message: "Something went wrong!" });
  }
};
