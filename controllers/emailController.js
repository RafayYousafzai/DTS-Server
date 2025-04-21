import axios from "axios";

const API = "vYni03aqa3sHW_yf9";

export const sendEmail = async (req, res, next) => {
  const { driver_email, driver_name, paypal_link, firstName, finalDriverPay } =
    req.body;

  console.log(req.body);

  try {
    const data = {
      service_id: "service_i9cmmnr",
      template_id: "YOUR_TEMPLATE_ID",
      user_id: API,
      template_params: {
        driver_email,
        driver_name,
        paypal_link,
        firstName,
        finalDriverPay,
      },
    };

    const response = await axios.post(
      "https://api.emailjs.com/api/v1.0/email/send",
      data,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.status === 200) {
      return res.status(200).json({ message: "Message sent successfully" });
    } else {
      return res.status(500).json({ message: "Failed to send email" });
    }
  } catch (error) {
    console.error(
      "Error sending email:",
      error.response?.data || error.message
    );
    return next(error);
  }
};
