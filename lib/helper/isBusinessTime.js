export const isBusinessTime = () => {
  const now = new Date();

  // Convert to Australian Eastern Daylight Time (AEDT)
  const options = { timeZone: "Australia/Sydney" };
  const aedtTime = new Date(now.toLocaleString("en-US", options));

  const hours = aedtTime.getHours();
  const day = aedtTime.getDay();

  // Business hours: Monday to Friday, 9:00 AM - 5:00 PM
  const isWeekday = day >= 1 && day <= 5; // Monday = 1, Friday = 5
  const isWithinBusinessHours = hours >= 9 && hours < 17;

  if (isWeekday && isWithinBusinessHours) {
    return aedtTime; // Return the current time if it's business time
  } else {
    return null; // Return null if it's not business time
  }
};
